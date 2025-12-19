import { useState } from "react";
import "./App.css";

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

  function addToCart(product) {
    setCart([...cart, product]);
  }

  function removeItem(index) {
    const copy = [...cart];
    copy.splice(index, 1);
    setCart(copy);
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);

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
          <p>
            <strong>Total:</strong> {total} SEK
          </p>

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
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                      e.target.value = v;
                    }}
                  />

                  <input
                    className="card-input"
                    placeholder="CVC"
                    maxLength={4}
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "");
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tap to Pay */}
          <div
            className={`payment-option ${paymentMethod === "tap" ? "active" : ""}`}
            onClick={() => setPaymentMethod("tap")}
          >
            <input type="radio" checked={paymentMethod === "tap"} readOnly /> Tap to Pay

            {paymentMethod === "tap" && (
              <div className="payment-details">
                <p>Hold your card near the back of your phone</p>
                <p>📳 NFC enabled</p>
              </div>
            )}
          </div>

          <button className="primary-btn">Complete Payment</button>
          <button
            className="secondary-btn"
            onClick={() => setPaymentOpen(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}

export default App;
