import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Lazily initialize and return the Stripe SDK instance.
 * Prevents application startup crashes if STRIPE_SECRET_KEY environment variable is not defined.
 */
export function getStripe(): Stripe | null {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16" as any,
    });
  }
  return stripeClient;
}

export interface CreatePaymentIntentOptions {
  total: number;
  currency?: string;
  items?: any[];
  shippingFee?: number;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
  };
  paymentMethod?: string;
  orderId?: string;
}

export interface PaymentIntentResult {
  success: boolean;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  customer?: any;
  metadata?: Record<string, any>;
}

/**
 * Creates a Stripe PaymentIntent server-side and returns the clientSecret required
 * for secure client-side payment confirmation.
 */
export async function createStripePaymentIntent(
  options: CreatePaymentIntentOptions
): Promise<PaymentIntentResult> {
  const {
    total = 0,
    currency = "php",
    items = [],
    shippingFee = 0,
    shippingAddress,
    paymentMethod = "card",
    orderId = `ord_${Date.now()}`,
  } = options;

  const totalInCentavos = Math.round(total * 100);
  const stripe = getStripe();

  if (stripe) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalInCentavos,
      currency: currency.toLowerCase(),
      payment_method_types: ["card"],
      description: `ThriftLoop Order (${items.length || 1} item/s)`,
      metadata: {
        orderId,
        paymentMethod: "CARD",
        buyerName: shippingAddress?.fullName || "Guest Customer",
        buyerPhone: shippingAddress?.phone || "",
        shippingCity: shippingAddress?.city || "",
        itemCount: items.length || 0,
        merchant: "ThriftLoop Curated Vintage",
      },
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || "",
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    };
  }

  // Sandbox / Demo mode when STRIPE_SECRET_KEY is not configured
  const mockIntentId = `pi_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const mockClientSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(2, 9)}`;

  return {
    success: true,
    paymentIntentId: mockIntentId,
    clientSecret: mockClientSecret,
    amount: totalInCentavos,
    currency: currency.toLowerCase(),
    status: "requires_confirmation",
    customer: {
      name: shippingAddress?.fullName || "Guest Customer",
      phone: shippingAddress?.phone || "",
      address: {
        line1: shippingAddress?.street || "",
        city: shippingAddress?.city || "",
        state: shippingAddress?.province || "",
        postal_code: shippingAddress?.zipCode || "",
        country: "PH",
      },
    },
    metadata: {
      integration: "Stripe PaymentIntent API v2024",
      merchant: "ThriftLoop Curated Vintage",
      orderId,
    },
  };
}

/**
 * Confirms or retrieves status of a Stripe PaymentIntent on the backend.
 */
export async function confirmStripePaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<{ success: boolean; status: string; paymentIntentId: string; chargeId?: string; intent?: any; error?: string }> {
  const stripe = getStripe();

  if (stripe && paymentIntentId && !paymentIntentId.startsWith("pi_stripe_")) {
    try {
      // 1. Retrieve current PaymentIntent status from Stripe
      const existingIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // 2. If already succeeded, return immediately
      if (existingIntent.status === "succeeded") {
        const chargeId = typeof existingIntent.latest_charge === "string" 
          ? existingIntent.latest_charge 
          : (existingIntent.latest_charge as any)?.id;

        return {
          success: true,
          status: existingIntent.status,
          paymentIntentId: existingIntent.id,
          chargeId,
          intent: existingIntent,
        };
      }

      // 3. If it requires a payment method, confirm with provided method or default card test method
      if (existingIntent.status === "requires_payment_method" || existingIntent.status === "requires_confirmation") {
        const pmToUse = paymentMethodId || "pm_card_visa";
        const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
          payment_method: pmToUse,
          return_url: "https://thriftloop.store/checkout/success",
        });

        const chargeId = typeof confirmedIntent.latest_charge === "string" 
          ? confirmedIntent.latest_charge 
          : (confirmedIntent.latest_charge as any)?.id;

        return {
          success: confirmedIntent.status === "succeeded",
          status: confirmedIntent.status,
          paymentIntentId: confirmedIntent.id,
          chargeId,
          intent: confirmedIntent,
        };
      }

      const chargeId = typeof existingIntent.latest_charge === "string" 
        ? existingIntent.latest_charge 
        : (existingIntent.latest_charge as any)?.id;

      return {
        success: (existingIntent.status as string) === "succeeded",
        status: existingIntent.status,
        paymentIntentId: existingIntent.id,
        chargeId,
        intent: existingIntent,
      };
    } catch (err: any) {
      console.error("Stripe confirmPaymentIntent error:", err.message);
      return {
        success: false,
        status: "failed",
        paymentIntentId,
        error: err.message || "Failed to confirm payment with Stripe",
      };
    }
  }

  return {
    success: true,
    status: "succeeded",
    paymentIntentId: paymentIntentId || `pi_stripe_${Date.now()}`,
  };
}
