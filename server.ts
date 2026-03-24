import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Stripe from "stripe";
import admin from "firebase-admin";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // If running locally, you might need a service account JSON file
    // and set GOOGLE_APPLICATION_CREDENTIALS environment variable.
  });
}
const db = admin.firestore();

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Webhook needs raw body
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
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
        
        if (userId) {
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
      case "customer.subscription.deleted":
        const subscription = event.data.object as Stripe.Subscription;
        // In a real app, you'd find the user by Stripe customer ID
        // For this demo, we'll just log it.
        console.log(`Subscription deleted: ${subscription.id}`);
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
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
    });
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured on the server." });
    }

    try {
      const { userId, email } = req.body;
      
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
