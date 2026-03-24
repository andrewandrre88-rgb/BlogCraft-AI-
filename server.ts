import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import cors from "cors";
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

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      // Only log API requests or errors to reduce noise
      if (req.url.startsWith('/api') || res.statusCode >= 400) {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
      }
    });
    next();
  });

  app.use(cors());
  
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
        const plan = session.metadata?.plan || "pro";
        
        if (userId && db) {
          console.log(`Payment successful for user: ${userId}, plan: ${plan}`);
          try {
            await db.collection("users").doc(userId).update({
              subscriptionStatus: plan,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`User ${userId} upgraded to ${plan}.`);
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
  app.use(express.urlencoded({ extended: true }));

  // Log all API requests for debugging
  app.use("/api", (req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
  });

  // Helper to get base URL for Stripe redirects
  const getBaseUrl = (req: express.Request) => {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    return `${protocol}://${host}`;
  };

  // API Routes
  app.get("/api/health", async (req, res) => {
    let firestoreStatus = "not_initialized";
    if (db) {
      try {
        // Simple test to see if we can reach Firestore
        await db.collection("_health").doc("check").set({ lastCheck: admin.firestore.FieldValue.serverTimestamp() });
        firestoreStatus = "connected";
      } catch (e: any) {
        console.error("Firestore Health Check Failed:", e);
        firestoreStatus = `error: ${e.message}`;
      }
    }

    res.json({ 
      status: "ok", 
      firestore: firestoreStatus,
      geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.API_KEY),
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      firebaseAdminReady: !!admin.apps.length
    });
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    console.log("Create checkout session request body:", JSON.stringify(req.body));
    if (!stripe) {
      console.error("Stripe not configured");
      return res.status(500).json({ error: "Stripe is not configured on the server. Please set STRIPE_SECRET_KEY." });
    }

    try {
      const { userId, email, plan } = req.body;
      
      if (!userId || !email) {
        console.error("Missing userId or email in request body");
        return res.status(400).json({ error: "Missing userId or email" });
      }

      const planConfig: any = {
        pro: {
          name: "BlogCraft Pro Subscription",
          amount: 2900,
          description: "Unlimited blog posts and advanced SEO features",
        },
        agency: {
          name: "BlogCraft Agency Subscription",
          amount: 9900,
          description: "Multi-user access, API, and white-label reports",
        }
      };

      const selectedPlan = planConfig[plan] || planConfig.pro;
      const baseUrl = getBaseUrl(req);
      console.log(`Using base URL for Stripe: ${baseUrl}`);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: selectedPlan.name,
                description: selectedPlan.description,
              },
              unit_amount: selectedPlan.amount,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing`,
        customer_email: email,
        metadata: {
          userId: userId,
          plan: plan || "pro",
        },
      });

      console.log("Stripe session created successfully:", session.id);
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Session Error:", error);
      res.status(500).json({ error: error.message || "Failed to create Stripe session" });
    }
  });

  // 404 handler for API routes
  app.all("/api/*", (req, res) => {
    console.warn(`API 404: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Error Handler:", err);
    if (req.path.startsWith("/api")) {
      return res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
      });
    }
    next(err);
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
