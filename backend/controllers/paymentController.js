// controllers/paymentController.js
const { Cashfree, CFEnvironment } = require("cashfree-pg");
const Payment = require("../models/paymentModel");
const User = require("../models/userModel");
require("dotenv").config();

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);

const base_url = "http://localhost:3000";

// -------------------------------------------------------
// 1️⃣ Create a new payment order
// -------------------------------------------------------
const createOrder = async (req, res) => {
  try {
    const { amount, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const orderId = `order_${Date.now()}`;

    const request = {
      order_amount: amount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: String(userId),
        customer_phone: "9999999999",
        customer_email: "test@example.com",
      },
      order_meta: {
        // Redirect user after payment completion
        return_url: `${base_url}/expense.html?order_id=${orderId}`,
      },
      order_note: "Expense Tracker Premium",
      order_expiry_time: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    const response = await cashfree.PGCreateOrder(request);

    // SAVE AS PENDING
    await Payment.create({
      userId,
      orderId,
      amount,
      currency: "INR",
      status: "PENDING",
    });

    res.status(200).json({
      success: true,
      payment_session_id: response.data.payment_session_id,
      order_id: orderId,
    });
  } catch (error) {
    console.error("❌ Error creating order:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Failed to create Cashfree order",
    });
  }
};

// -------------------------------------------------------
// 2️⃣ Handle Cashfree Webhook (Auto Update Payment Status)
// -------------------------------------------------------
const paymentWebhook = async (req, res) => {
  try {
    const event = req.body;

    // Correct Cashfree Webhook Format
    const order_id = event?.data?.order?.order_id;
    const order_status = event?.data?.order?.order_status;
    const payment_status = event?.data?.payment?.payment_status;
    const customer_id = event?.data?.customer_details?.customer_id;

    console.log("📥 Received Webhook:", event);

    if (!order_id) {
      console.log("❌ Invalid webhook received");
      return res.status(400).send("Invalid webhook format");
    }

    const payment = await Payment.findOne({ orderId: order_id });
    if (!payment) return res.status(404).send("Payment not found");

    // SUCCESS
    if (
      order_status === "PAID" ||
      order_status === "SUCCESS" ||
      payment_status === "SUCCESS"
    ) {
      payment.status = "SUCCESS";
      await payment.save();

      const userId = customer_id || payment.userId.toString();

      await User.findByIdAndUpdate(userId, { isPremium: true });

      console.log(`🎉 Payment successful, user ${userId} upgraded.`);
    }

    // FAILED
    else if (order_status === "FAILED" || payment_status === "FAILED") {
      payment.status = "FAILED";
      await payment.save();
      console.log(`❌ Payment failed for order ${order_id}`);
    }

    // PENDING or Other Status
    else {
      payment.status = order_status || payment_status || "PENDING";
      await payment.save();
      console.log(`ℹ️ Payment status updated: ${payment.status}`);
    }

    res.status(200).send("Webhook processed");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Webhook error");
  }
};

// -------------------------------------------------------
// 3️⃣ Check Payment Status (Manual GET API)
// -------------------------------------------------------
const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId)
      return res.status(400).json({ message: "Order ID is required" });

    let status;

    // 1️⃣ AUTO SUCCESS IN DEVELOPMENT MODE
    if (process.env.NODE_ENV === "development") {
      status = "SUCCESS";
      console.log("⚠️ Dev Mode: Auto-Success Enabled for Testing.");
    } else {
      // 2️⃣ REAL CASHFREE CHECK (Production)
      const response = await cashfree.PGFetchOrder(orderId);
      const orderData = response.data;

      const txns = orderData?.transactions || [];

      if (txns.some((t) => t.payment_status === "SUCCESS")) {
        status = "SUCCESS";
      } else if (txns.some((t) => t.payment_status === "FAILED")) {
        status = "FAILED";
      }
    }

    // 3️⃣ UPDATE DATABASE
    const payment = await Payment.findOne({ orderId });
    if (payment) {
      payment.status = status;
      await payment.save();

      if (status === "SUCCESS") {
        await User.findByIdAndUpdate(payment.userId, { isPremium: true });
      }
    }

    res.status(200).json({
      success: true,
      orderStatus: status,
    });
  } catch (error) {
    console.error("❌ Error checking payment:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Failed to check payment status",
    });
  }
};

// -------------------------------------------------------
// 4️⃣ API to show order status from DB
// -------------------------------------------------------
const orderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ orderId });

    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    res.json({ success: true, status: payment.status });
  } catch (err) {
    console.error("❌ Error fetching order:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  createOrder,
  paymentWebhook,
  checkPaymentStatus,
  orderStatus,
};
