import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import Stripe from "stripe";
import admin from "firebase-admin";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
}

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
      // In this environment, applicationDefault() should work if credentials are set,
      // otherwise it might fallback to metadata service.
      credential: admin.credential.applicationDefault(),
    });
  }
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error);
}

const getDb = () => {
  try {
    return admin.firestore(firebaseConfig.firestoreDatabaseId || "(default)");
  } catch (e) {
    console.error("Failed to get Firestore instance:", e);
    return null;
  }
};

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;
  const db = getDb();

  // Stripe Webhook needs raw body - MUST be before express.json()
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    console.log("Webhook received");
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !sig || !endpointSecret) {
      console.error("Webhook Error: Stripe or Secret not configured.");
      return res.status(400).send("Webhook Error: Missing configuration.");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        
        if (userId && db) {
          console.log(`Payment successful for user: ${userId}`);
          try {
            await db.collection("users").doc(userId).update({
              subscriptionStatus: "pro",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`User ${userId} upgraded to Pro.`);
          } catch (error) {
            console.error(`Error updating user ${userId}:`, error);
          }
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.API_KEY),
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      firebaseAdminReady: !!admin.apps.length
    });
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    console.log("Create checkout session request received", req.body);
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured on the server." });
    }

    try {
      const { userId, email } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({ error: "Missing userId or email" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "BlogCraft Pro Subscription",
                description: "Unlimited blog posts and advanced SEO features",
              },
              unit_amount: 2900, // $29.00
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/pricing`,
        customer_email: email,
        metadata: {
          userId: userId,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Session Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Global Error Handler for API routes
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("API Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("Dist folder not found. Falling back to dev mode behavior.");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
