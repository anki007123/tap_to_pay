const express = require("express");
const cors = require("cors");

const app = express();

/* Middleware */
app.use(cors());
app.use(express.json());

// -------------------------
// In-memory stores (prototype only)
// -------------------------
const orders = {};
const tapSessions = {};
const transactions = {};

// -------------------------
// Helpers
// -------------------------
function maskPan(pan) {
  const last4 = pan.slice(-4);
  return "**** **** **** " + last4;
}

// -------------------------
// Health Check
// -------------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// -------------------------
// Create Order
// -------------------------
app.post("/order/create", (req, res) => {
  const { amount } = req.body;

  const orderId = "ORD_" + Date.now();

  orders[orderId] = {
    orderId,
    amount,
    status: "CREATED",
  };

  res.json({
    orderId,
    amount,
    status: "CREATED",
  });
});

// -------------------------
// Manual Payment (Always Success)
// -------------------------
app.post("/payment/manual", (req, res) => {
  const { orderId } = req.body;

  if (!orders[orderId]) {
    return res.status(404).json({ error: "Order not found" });
  }

  orders[orderId].status = "PAID";

  res.json({
    orderId,
    status: "SUCCESS",
  });
});

// -------------------------
// Tap to Pay - Init Session
// -------------------------
app.post("/payment/tap/init", (req, res) => {
  const { orderId } = req.body;

  if (!orders[orderId]) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (orders[orderId].status === "PAID") {
    return res.status(400).json({ error: "Order already paid" });
  }

  // One session per order
  const existing = Object.values(tapSessions).find(
    (s) => s.orderId === orderId && s.status !== "LOCKED"
  );

  if (existing) {
    return res.json(existing);
  }

  const sessionId = "TAP_" + Date.now();

  tapSessions[sessionId] = {
    sessionId,
    orderId,
    status: "READY",
  };

  res.json(tapSessions[sessionId]);
});

// -------------------------
// Tap to Pay - Submit Card (DAY 4 CORE)
// -------------------------
app.post("/payment/tap/submit", (req, res) => {
  const { sessionId, pan, expiry } = req.body;

  if (!tapSessions[sessionId]) {
    return res.status(404).json({ error: "Invalid session" });
  }

  const session = tapSessions[sessionId];

  if (session.status === "LOCKED") {
    return res.status(400).json({ error: "Session locked" });
  }

  const order = orders[session.orderId];

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.status === "PAID") {
    session.status = "LOCKED";
    return res.status(400).json({ error: "Order already paid" });
  }

  if (!pan || pan.length < 12) {
    return res.status(400).json({ error: "Invalid PAN" });
  }

  // Mask PAN immediately
  const maskedPan = maskPan(pan);

  const transactionId = "TXN_" + Date.now();

  transactions[transactionId] = {
    transactionId,
    orderId: session.orderId,
    amount: order.amount,
    maskedPan,
    expiry,
    paymentMethod: "TAP_TO_PAY",
    status: "SUCCESS",
    timestamp: new Date().toISOString(),
  };

  // Finalize
  order.status = "PAID";
  session.status = "LOCKED";

  res.json({
    status: "SUCCESS",
    orderId: order.orderId,
    transactionId,
  });
});

// -------------------------
// Admin - List Tap Transactions
// -------------------------
app.get("/admin/transactions", (req, res) => {
  res.json(Object.values(transactions));
});

// -------------------------
// Start Server
// -------------------------
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});

