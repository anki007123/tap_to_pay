import { useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:3001";

function App() {
  const products = [
    { id: 1, name: "Wireless Headphones", price: 199 },
    { id: 2, name: "Smart Watch", price: 299 },
    { id: 3, name: "USB-C Charger", price: 99 },
  ];

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("tap");

  const [orderId, setOrderId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  function addToCart(product) {
    setCart([...cart, product]);
  }

  function removeItem(index) {
    const copy = [...cart];
    copy.splice(index, 1);
    setCart(copy);
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  async function createOrder() {
    const res = await fetch(`${API_BASE}/order/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total }),
    });
    const data = await res.json();
    setOrderId(data.orderId);
    return data.orderId;
  }

  async function completePayment() {
    setLoading(true);

    try {
      let oid = orderId;
      if (!oid) {
        oid = await createOrder();
      }

      if (paymentMethod === "card") {
        await fetch(`${API_BASE}/payment/manual`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: oid }),
        });
      }

      if (paymentMethod === "tap") {
        const res = await fetch(`${API_BASE}/payment/tap/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: oid }),
        });
        const data = await res.json();
        setSessionId(data.sessionId);
      }
      setPaidAmount(total);
      setSuccess(true);
      setCart([]);
      setPaymentOpen(false);
    } catch (e) {
      alert("Payment failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="success-screen">
        <h2>Payment Successful</h2>
        <p><strong>Order ID:</strong> {orderId}</p>
        <p><strong>Amount:</strong> {paidAmount} SEK</p>
        <p><strong>Method:</strong> {paymentMethod === "tap" ? "Tap to Pay" : "Card"}</p>
        <button onClick={() => setSuccess(false)}>Back to Shop</button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="header">
        <h2>Tap to Pay</h2>
        <div className="cart-button" onClick={() => setCartOpen(true)}>
          🛒
          {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
        </div>
      </div>

      {/* Products */}
      <div className="container">
        <div className="products">
          {products.map((p) => (
            <div key={p.id} className="product-card">
              <h3>{p.name}</h3>
              <p>{p.price} SEK</p>
              <button onClick={() => addToCart(p)}>Add to Cart</button>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Drawer */}
      <div className={`cart-drawer ${cartOpen ? "open" : ""}`}>
        <h3>Your Cart</h3>

        {cart.map((item, i) => (
          <div key={i} className="cart-item">
            <span>{item.name}</span>
            <span>
              {item.price} SEK{" "}
              <button onClick={() => removeItem(i)}>✕</button>
            </span>
          </div>
        ))}

        <div className="cart-footer">
          <p><strong>Total:</strong> {total} SEK</p>

          <button
            disabled={cart.length === 0}
            onClick={() => {
              setCartOpen(false);
              setPaymentOpen(true);
            }}
          >
            Pay Now
          </button>

          <button onClick={() => setCartOpen(false)}>Close</button>
        </div>
      </div>

      {/* Payment Drawer */}
      {paymentOpen && (
        <div className="payment-drawer">
          <h3>Pay {total} SEK</h3>

          {/* Card */}
          <div
            className={`payment-option ${paymentMethod === "card" ? "active" : ""}`}
            onClick={() => setPaymentMethod("card")}
          >
            <input type="radio" checked={paymentMethod === "card"} readOnly /> Pay with Card

            {paymentMethod === "card" && (
              <div className="payment-details">
                <input
                  className="card-input"
                  placeholder="Card number"
                  maxLength={19}
                  inputMode="numeric"
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "");
                    v = v.match(/.{1,4}/g)?.join(" ") || v;
                    e.target.value = v;
                  }}
                />

                <div className="card-row">
                  <input
                    className="card-input"
                    placeholder="MM/YY"
                    maxLength={5}
                    inputMode="numeric"
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                      e.target.value = v;
                    }}
                  />

                  <input
                    className="card-input"
                    placeholder="CVC"
                    maxLength={4}
                    inputMode="numeric"
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "");
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tap */}
          <div
            className={`payment-option ${paymentMethod === "tap" ? "active" : ""}`}
            onClick={() => setPaymentMethod("tap")}
          >
            <input type="radio" checked={paymentMethod === "tap"} readOnly /> Tap to Pay

            {paymentMethod === "tap" && (
              <div className="payment-details">
                <p>Hold your card near the back of your phone</p>
                {sessionId && <p>Session started</p>}
              </div>
            )}
          </div>

          <button className="primary-btn" disabled={loading} onClick={completePayment}>
            {loading ? "Processing..." : "Complete Payment"}
          </button>

          <button className="secondary-btn" onClick={() => setPaymentOpen(false)}>
            Cancel
          </button>
        </div>
      )}
    </>
  );
}

export default App;
