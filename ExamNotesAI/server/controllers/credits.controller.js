import Stripe from "stripe";
import UserModel from "../models/user.model.js";
import { clientOrigins } from "../utils/clientOrigins.js";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Stripe secret key missing in .env");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CREDIT_MAP = {
  100: 50,
  200: 120,
  500: 300,
};

const addCreditsOnce = async (session) => {
  const userId = session.metadata?.userId;
  const creditsToAdd = Number(session.metadata?.credits);

  if (!userId || ![50, 120, 300].includes(creditsToAdd)) {
    throw new Error("Stripe checkout session has invalid credit metadata");
  }

  const user = await UserModel.findOneAndUpdate(
    {
      _id: userId,
      processedStripeSessionIds: { $ne: session.id },
    },
    {
      $inc: { credits: creditsToAdd },
      $set: { isCreditAvailable: true },
      $addToSet: { processedStripeSessionIds: session.id },
    },
    { new: true }
  );

  if (user) {
    return user.credits;
  }

  const existingUser = await UserModel.findById(userId);
  if (!existingUser) {
    throw new Error("Stripe checkout session references a missing user");
  }

  return existingUser.credits;
};

export const createCreditsOrder = async (req, res) => {
  try {
    console.log("👉 API HIT");
    console.log("👉 BODY:", req.body);

    const userId = req.userId;

    // ✅ FIX 1: amount number madhe convert
    const amt = Number(req.body.amount);

    // ✅ validation
    if (!CREDIT_MAP[amt]) {
      return res.status(400).json({
        message: "Invalid credit plan",
      });
    }

    const requestOrigin = req.get("origin");
    const clientUrl = clientOrigins.includes(requestOrigin)
      ? requestOrigin
      : process.env.CLIENT_URL;

    if (!clientUrl) {
      throw new Error("CLIENT_URL missing in env");
    }

    const clientOrigin = new URL(clientUrl).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${clientOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientOrigin}/payment-failed`,
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `${CREDIT_MAP[amt]} Credits`,
            },
            unit_amount: amt * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        credits: CREDIT_MAP[amt],
      },
    });

    console.log("✅ SESSION CREATED:", session.id);

    res.status(200).json({ url: session.url });

  } catch (error) {
    // ✅ FIX 3: full error print
    console.log("❌ FULL ERROR 👉", error);

    res.status(500).json({
      message: error.message || "Stripe error",
    });
  }
};

export const confirmCreditsPayment = async (req, res) => {
  const { sessionId } = req.body;

  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return res.status(400).json({ message: "Invalid checkout session" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(409).json({ message: "Payment has not been completed" });
    }

    const credits = await addCreditsOnce(session);
    return res.status(200).json({ credits });
  } catch (error) {
    console.error("Credit payment confirmation failed:", error);
    return res.status(500).json({ message: "Unable to confirm payment" });
  }
};

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook secret is not configured");
    return res.status(500).send("Webhook is not configured");
  }

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.log("❌ Webhook signature error:", error.message);
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status !== "paid") {
      return res.status(200).json({ received: true });
    }

    try {
      await addCreditsOnce(session);
    } catch (error) {
      console.error("Stripe webhook credit update failed:", error);
      return res.status(500).json({ message: "Unable to apply payment credits" });
    }
  }

  res.json({ received: true });
};