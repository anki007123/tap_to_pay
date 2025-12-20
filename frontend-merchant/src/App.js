import { useState } from "react";
import "./App.css";

/* IMPORTANT: keep backend + admin aligned */
const API_BASE = "http://192.168.50.6:3001";

function App() {
  const products = [
    { id: 1, name: "Wireless Headphones", price: 199 },
    { id: 2, name: "Smart Watch", price: 299 },
    { id: 3, name: "USB-C Charger", price: 99 },
  ];

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  /* Default to card so manual option is visible */
  const [paymentMethod, setPaymentMethod] = useState("card");

  const [orderId, setOrderId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  const [waitingForNfc, setWaitingForNfc] = useState(false);
  // NFC dialog + timer UI state
  const [showNfcDialog, setShowNfcDialog] = useState(false);
  const [nfcCountdown, setNfcCountdown] = useState(15);
  const [nfcTimedOut, setNfcTimedOut] = useState(false);


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

  /* NFC LOGIC — DO NOT TOUCH */
  async function startNfcScanAndSubmit(sid) {
    try {
      const reader = new window.NDEFReader();
      await reader.scan();
      setWaitingForNfc(true);

      let completed = false;
      const completeAfterTap = async () => {
        if (completed) return;
        completed = true;

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
        setWaitingForNfc(false);
        setLoading(false);
      };

      reader.onreadingerror = completeAfterTap;
      reader.onreading = completeAfterTap;
    } catch {
      alert("NFC scan could not start/Device not supported");
      setWaitingForNfc(false);
      setLoading(false);
    }
  }

  async function completePayment() {
    setLoading(true);

    try {
      let oid = orderId || (await createOrder());

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
        // Show NFC dialog and start 15s countdown
        setShowNfcDialog(true);
        setNfcTimedOut(false);
        setNfcCountdown(15);

        let counter = 15;
        const interval = setInterval(() => {
          counter -= 1;
          setNfcCountdown(counter);

          if (counter <= 0) {
            clearInterval(interval);
            setNfcTimedOut(true);
          }
        }, 1000);
        startNfcScanAndSubmit(data.sessionId);
      }
    } catch {
      alert("Payment failed");
      setWaitingForNfc(false);
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
      <div className="header">
        <h2>Tap to Pay</h2>
        <div className="cart-button" onClick={() => setCartOpen(true)}>
          🛒 {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
        </div>
      </div>

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

      {paymentOpen && (
        <div className="payment-drawer">
          <h3>Pay {total} SEK</h3>

          {/* MANUAL CARD */}
          <div
            className={`payment-option ${paymentMethod === "card" ? "active" : ""}`}
            onClick={() => setPaymentMethod("card")}
          >
            <input type="radio" checked={paymentMethod === "card"} readOnly /> Pay with Card
            {paymentMethod === "card" && (
              <div className="payment-details">
                <input className="card-input" placeholder="Card number" />
                <div className="card-row">
                  <input className="card-input" placeholder="MM/YY" />
                  <input className="card-input" placeholder="CVC" />
                </div>
              </div>
            )}
          </div>
{/* NFC DIALOG OVERLAY – ADD BELOW */}
      {showNfcDialog && (
        <div className="nfc-overlay">
          <div className="nfc-dialog">

            {!nfcTimedOut && (
              <>
                <h3>Tap your card</h3>

                <div className="nfc-animation">
                  <div className="phone" />
                  <div className="card" />
                </div>

                <p>Hold your card near the back of your phone</p>
                <p className="countdown">{nfcCountdown}s</p>
              </>
            )}

            {nfcTimedOut && (
              <>
                <h3>No card detected</h3>
                <p>Please try again</p>

                <button
                  className="primary-btn"
                  onClick={() => {
                    setShowNfcDialog(false);
                    setWaitingForNfc(false);
                  }}
                >
                  Retry
                </button>

                <button
                  className="secondary-btn"
                  onClick={() => {
                    setShowNfcDialog(false);
                    setPaymentOpen(false);
                    setWaitingForNfc(false);
                  }}
                >
                  Cancel
                </button>
              </>
            )}

          </div>
        </div>
      )}
          {/* TAP TO PAY */}
          <div
            className={`payment-option ${paymentMethod === "tap" ? "active" : ""}`}
            onClick={() => setPaymentMethod("tap")}
          >
            <input type="radio" checked={paymentMethod === "tap"} readOnly /> Tap to Pay
            <div className="payment-details">
              {!waitingForNfc && <p>Hold your card near the back of your phone</p>}
              {waitingForNfc && <p><strong>Waiting for card...</strong></p>}
              {sessionId && <span style={{ display: "none" }}>{sessionId}</span>}
            </div>
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
