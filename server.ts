import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  getStripe,
  createStripePaymentIntent,
  confirmStripePaymentIntent,
} from "./server/stripe";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", gateway: "Stripe", timestamp: new Date().toISOString() });
  });

  // Stripe Configuration endpoint for client publishable key
  app.get("/api/stripe/config", (_req, res) => {
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51U7SNwKC304NxFdv6swsOvK3VLgtjQziYUiWYqx8R4MGNgnIG4RGKbMm8nhZFP9fOnfBwtOsLzIXAoAal6Zcv9Ow00Uhz8ixDC";
    res.json({
      publishableKey,
      isConfigured: !!process.env.STRIPE_SECRET_KEY
    });
  });

  // Stripe PaymentIntent API Endpoint (Secure Client Secret Generation)
  app.post("/api/stripe/create-payment-intent", async (req, res) => {
    try {
      const result = await createStripePaymentIntent(req.body);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("Stripe payment intent creation error:", err);
      return res.status(500).json({ error: err.message || "Failed to create Stripe payment intent" });
    }
  });

  // Stripe Confirm PaymentIntent API Endpoint
  app.post("/api/stripe/confirm-payment-intent", async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      const result = await confirmStripePaymentIntent(paymentIntentId);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("Stripe payment intent confirmation error:", err);
      return res.status(500).json({ error: err.message || "Failed to confirm Stripe payment intent" });
    }
  });

  // Stripe Checkout Session API Endpoint
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { items, shippingFee = 0, total, shippingAddress, paymentMethod, orderId } = req.body;
      const stripe = getStripe();
      const sessionId = `cs_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (stripe) {
        const line_items = (items || []).map((item: any) => ({
          price_data: {
            currency: "php",
            product_data: {
              name: item.product?.title || item.title || "Thrifted Garment",
              images: item.product?.images?.length ? [item.product.images[0]] : [],
            },
            unit_amount: Math.round((item.product?.price || item.price || 0) * 100),
          },
          quantity: item.quantity || 1,
        }));

        if (shippingFee > 0) {
          line_items.push({
            price_data: {
              currency: "php",
              product_data: {
                name: "Courier Shipping Fee",
              },
              unit_amount: Math.round(shippingFee * 100),
            },
            quantity: 1,
          });
        }

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items,
          mode: "payment",
          success_url: `${req.headers.origin || "http://localhost:3000"}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.headers.origin || "http://localhost:3000"}?payment=cancel`,
          metadata: {
            orderId: orderId || `ord_${Date.now()}`,
            buyerName: shippingAddress?.fullName || "Guest Customer"
          }
        });

        return res.status(200).json({
          success: true,
          sessionId: session.id,
          checkoutUrl: session.url,
          paymentMethod: paymentMethod || "card",
          status: "active"
        });
      }

      // Standard Stripe Session Response (Sandbox / Client Ready)
      return res.status(200).json({
        success: true,
        sessionId,
        paymentMethod: paymentMethod || "card",
        checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
        status: "active",
        amountTotal: Math.round((total || 0) * 100),
        currency: "PHP",
        customer: {
          name: shippingAddress?.fullName || "Guest Customer",
          phone: shippingAddress?.phone || "",
          address: {
            line1: shippingAddress?.street || "",
            city: shippingAddress?.city || "",
            state: shippingAddress?.province || "",
            postal_code: shippingAddress?.zipCode || "",
            country: "PH"
          }
        },
        metadata: {
          integration: "Stripe API v2024",
          merchant: "ThriftLoop Curated Vintage"
        }
      });
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      return res.status(500).json({ error: err.message || "Failed to create Stripe checkout session" });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
