const express = require("express");

const app = express();

// in memory storage
const orders = {};
const transactions = {};

// allow JSON body
app.use(express.json());

// health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// create order
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


app.listen(3001, () => {
  console.log("Backend running on port 3001");
});
