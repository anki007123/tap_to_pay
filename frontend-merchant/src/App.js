import { useState, useRef } from "react";
import "./App.css";

/* IMPORTANT: keep backend + admin aligned */
const API_BASE =  process.env.REACT_APP_API_BASE || "http://localhost:3001";

function App() {
  /* ================= PRODUCT DATA ================= */
  const products = [
    { id: 1, name: "Wireless Headphones", price: 199 },
    { id: 2, name: "Smart Watch", price: 299 },
    { id: 3, name: "USB-C Charger", price: 99 },
  ];

  /* ================= UI STATE ================= */
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");

  /* ================= PAYMENT STATE ================= */
  const [orderId, setOrderId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  /* ================= NFC STATE ================= */
  
  const [showNfcDialog, setShowNfcDialog] = useState(false);
  const [nfcCountdown, setNfcCountdown] = useState(15);
  const [nfcTimedOut, setNfcTimedOut] = useState(false);

  /* ================= TIMER FIX ================= */
  const nfcTimerRef = useRef(null);

  function clearNfcTimer() {
    if (nfcTimerRef.current) {
      clearInterval(nfcTimerRef.current);
      nfcTimerRef.current = null;
    }
  }

  function startNfcCountdown() {
    clearNfcTimer();
    setNfcCountdown(15);
    setNfcTimedOut(false);

    let counter = 15;
    nfcTimerRef.current = setInterval(() => {
      counter -= 1;
      setNfcCountdown(counter);

      if (counter <= 0) {
        clearNfcTimer();
        setNfcTimedOut(true);
        setLoading(false);
      }
    }, 1000);
  }

  /* ================= CART LOGIC ================= */
  function addToCart(product) {
    setCart([...cart, product]);
  }

  function removeItem(index) {
    const copy = [...cart];
    copy.splice(index, 1);
    setCart(copy);
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  /* ================= BACKEND ================= */
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

  /* ================= NFC LOGIC ================= */
  async function startNfcScanAndSubmit(sid) {
    try {
      const reader = new window.NDEFReader();
      await reader.scan();

      setShowNfcDialog(true);
  
      setLoading(true);
      startNfcCountdown();

      let completed = false;

      const completeAfterTap = async () => {
        if (completed) return;
        completed = true;
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }

        clearNfcTimer();

        await fetch(`${API_BASE}/payment/tap/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            pan: "4111111111111111",
            expiry: "12/27",
          }),
        });

        setPaidAmount(total);
        setSuccess(true);
        setShowNfcDialog(false);
        setCart([]);
        setPaymentOpen(false);
        setLoading(false);
      };

      reader.onreadingerror = completeAfterTap;
      reader.onreading = completeAfterTap;
    } catch {
      clearNfcTimer();
      alert("NFC scan could not start / Device not supported");
      setShowNfcDialog(false);
      setLoading(false);
    }
  }

  /* ================= COMPLETE PAYMENT ================= */
  async function completePayment() {
    setLoading(true);

    try {
      const oid = orderId || (await createOrder());

      if (paymentMethod === "card") {
        await fetch(`${API_BASE}/payment/manual`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: oid }),
        });

        setPaidAmount(total);
        setSuccess(true);
        setCart([]);
        setPaymentOpen(false);
        setLoading(false);
      }

      if (paymentMethod === "tap") {
        const res = await fetch(`${API_BASE}/payment/tap/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: oid }),
        });

        const data = await res.json();
        setSessionId(data.sessionId);
        startNfcScanAndSubmit(data.sessionId);
      }
    } catch {
      clearNfcTimer();
      alert("Payment failed");
      setLoading(false);
    }
  }

  /* ================= SUCCESS ================= */
  if (success) {
    return (
      <div className="success-screen">
        <h2>Payment Successful</h2>
        <p><strong>Order ID:</strong> {orderId}</p>
        <p><strong>Amount:</strong> {paidAmount} SEK</p>
        <p><strong>Method:</strong> {paymentMethod}</p>
        <button onClick={() => setSuccess(false)}>Back to Shop</button>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <>
      {/* HEADER */}
      <div className="header">
        <h2>Tap to Pay</h2>
        <div className="cart-button" onClick={() => setCartOpen(true)}>
          🛒 {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="container">
        <div className="products">
          {products.map(p => (
            <div key={p.id} className="product-card">
              <h3>{p.name}</h3>
              <p>{p.price} SEK</p>
              <button onClick={() => addToCart(p)}>Add to Cart</button>
            </div>
          ))}
        </div>
      </div>

      {/* CART */}
      <div className={`cart-drawer ${cartOpen ? "open" : ""}`}>
        <h3>Your Cart</h3>
        {cart.map((item, i) => (
          <div key={i} className="cart-item">
            <span>{item.name}</span>
            <span>
              {item.price} SEK <button onClick={() => removeItem(i)}>✕</button>
            </span>
          </div>
        ))}
        <div className="cart-footer">
          <p><strong>Total:</strong> {total} SEK</p>
          <button disabled={!cart.length} onClick={() => { setCartOpen(false); setPaymentOpen(true); }}>
            Pay Now
          </button>
          <button onClick={() => setCartOpen(false)}>Close</button>
        </div>
      </div>

      {/* PAYMENT */}
      {paymentOpen && (
        <div className="payment-drawer">
          <h3>Pay {total} SEK</h3>


<div
  className={`payment-option ${paymentMethod === "card" ? "active" : ""}`}
  onClick={() => setPaymentMethod("card")}
>
  <input type="radio" checked={paymentMethod === "card"} readOnly />
  Pay with Card

  {paymentMethod === "card" && (
    <div className="payment-details">
      {/* CARD NUMBER */}
      <input
        className="card-input"
        placeholder="Card number"
        inputMode="numeric"
        maxLength={19}
        onChange={(e) => {
          let v = e.target.value.replace(/\D/g, "");
          v = v.slice(0, 16); // max 16 digits
          v = v.match(/.{1,4}/g)?.join(" ") || v;
          e.target.value = v;
        }}
      />

      <div className="card-row">
        {/* EXPIRY */}
        <input
          className="card-input"
          placeholder="MM/YY"
          inputMode="numeric"
          maxLength={5}
          onChange={(e) => {
            let v = e.target.value.replace(/\D/g, "");
            v = v.slice(0, 4);
            if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
            e.target.value = v;
          }}
        />

        {/* CVC */}
        <input
          className="card-input"
          placeholder="CVC"
          inputMode="numeric"
          maxLength={4}
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
          }}
        />
      </div>
    </div>
  )}
</div>



          <div className={`payment-option ${paymentMethod === "tap" ? "active" : ""}`}
               onClick={() => setPaymentMethod("tap")}>
            <input type="radio" checked={paymentMethod === "tap"} readOnly /> Tap to Pay
          </div>

          <button className="primary-btn" disabled={loading} onClick={completePayment}>
            {loading ? "Processing..." : "Complete Payment"}
          </button>

          <button className="secondary-btn" onClick={() => setPaymentOpen(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* NFC OVERLAY */}
      {showNfcDialog && (
        <div className="nfc-overlay">
          <div className="nfc-dialog">
            {!nfcTimedOut ? (
              <>
                <h3>Tap your card</h3>

                {/* NFC TAP ANIMATION */}
                <div className="nfc-animation">
                  <div className="phone" />
                  <div className="card" />
                </div>

                <p>Hold your card near the back of your phone</p>
                <p className="countdown">{nfcCountdown}s</p>
              </>
            ) : (
              <>
                <h3>No card detected</h3>
                <button className="primary-btn" onClick={() => startNfcScanAndSubmit(sessionId)}>
                  Retry
                </button>
                <button className="secondary-btn" onClick={() => {
                  clearNfcTimer();
                  setShowNfcDialog(false);
                  setPaymentOpen(false);
                  setLoading(false);
                }}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
