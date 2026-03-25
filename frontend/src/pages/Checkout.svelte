<script>
  import { cartStore } from '../store/cart.svelte.js';
  import { authStore } from '../store/auth.svelte.js';

  let shippingAddress = $state(authStore.user?.addresses?.[0]?.street || '');
  let phone = $state(authStore.user?.phone || '');
  let loading = $state(false);
  let error = $state('');
  let orderCompleted = $state(false);
  let paymentMethod = $state('card'); // 'card' o 'apple'

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  async function handleCheckout() {
    if (cartStore.items.length === 0) return;
    if (!shippingAddress.trim()) {
      error = 'Por favor, introduce una dirección de envío.';
      return;
    }

    loading = true;
    error = '';

    try {
      const items = cartStore.items.map(i => ({
        productId: i.producto._id,
        quantity: i.cantidad
      }));

      // SIMULAR COMPRA LOCAL PARA PRODUCTOS MOCK (Para testeo sin errores db)
      const tieneMock = items.some(i => !i.productId || String(i.productId).length < 5);
      if (tieneMock) {
        const mockOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]');
        mockOrders.unshift({
          _id: 'mock_' + Date.now(),
          items: cartStore.items.map(i => ({
            productId: { nombre: i.producto.nombre, precio: i.producto.precio },
            cantidad: i.cantidad
          })),
          totalPrice: cartStore.totalPrice,
          status: 'Pendiente',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('mock_orders', JSON.stringify(mockOrders));
        cartStore.vaciar();
        orderCompleted = true;
        return;
      }

      console.log('Enviando pedido:', { items, totalPrice: cartStore.totalPrice });

      const res = await fetch(`${API_URL}/ordenes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          items,
          totalPrice: cartStore.totalPrice
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error processing order');

      cartStore.vaciar();
      orderCompleted = true;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="checkout-page">
  <div class="containerSmall">
    {#if orderCompleted}
      <div class="success-state">
        <div class="success-icon">🎉</div>
        <h2>Order Completed Successfully!</h2>
        <p>Thank you for your purchase. We will notify you when your order is on its way.</p>
        <div class="success-actions">
          <a href="#products" class="btn-primary">Continue Shopping</a>
          <a href="#profile" class="btn-secondary">View My Orders</a>
        </div>
      </div>
    {:else if cartStore.items.length === 0}
      <div class="empty-state">
        <p>You have no products for checkout.</p>
        <a href="#products" class="btn-primary">Go to Catalog</a>
      </div>
    {:else}
      <h1>Confirm Order</h1>
      
      {#if error}
        <div class="error-msg">⚠️ {error}</div>
      {/if}

      <div class="checkout-grid">
        <!-- Formulario -->
        <div class="checkout-form-container">
          <h2>Shipping Details</h2>
          <form onsubmit={(e) => { e.preventDefault(); handleCheckout(); }}>
            <div class="form-group">
              <label for="name">Full Name</label>
              <input id="name" type="text" value={authStore.user?.username} disabled class="locked-input" />
            </div>
            
            <div class="form-group">
              <label for="phone">Contact Phone</label>
              <input id="phone" type="text" bind:value={phone} placeholder="e.g. +34 600 000 000" required />
            </div>

            <div class="form-group">
              <label for="address">Shipping Address</label>
              <textarea id="address" bind:value={shippingAddress} rows="3" placeholder="Street, Number, Apartment, City, Postal Code" required></textarea>
            </div>

            <div class="form-group">
              <label>Payment Method</label>
              <div class="payment-options">
                <div class="payment-option" class:selected={paymentMethod === 'card'} onclick={() => paymentMethod = 'card'}>
                  <input type="radio" checked={paymentMethod === 'card'} name="payment" />
                  <div class="payment-details">
                    <span class="payment-title">💳 Credit / Debit Card</span>
                    <span class="payment-subtitle">Visa, Mastercard, AMEX</span>
                  </div>
                </div>

                <div class="payment-option" class:selected={paymentMethod === 'apple'} onclick={() => paymentMethod = 'apple'}>
                  <input type="radio" checked={paymentMethod === 'apple'} name="payment" />
                  <div class="payment-details">
                    <span class="payment-title"> Apple Pay</span>
                    <span class="payment-subtitle">Fast checkout with Touch ID / Face ID</span>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" class="submit-btn" disabled={loading}>
              {loading ? 'Processing...' : `Pay ${Number(cartStore.totalPrice).toFixed(2)}€`}
            </button>
          </form>
        </div>

        <!-- Resumen -->
        <div class="order-summary">
          <h2>Order Summary</h2>
          <div class="summary-list">
            {#each cartStore.items as item}
              <div class="summary-item">
                <span class="item-name">{item.producto.nombre} <small>x{item.cantidad}</small></span>
                <span class="item-subtotal">{Number(item.producto.precio * item.cantidad).toFixed(2)}€</span>
              </div>
            {/each}
          </div>
          
          <hr />

          <div class="summary-totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>{Number(cartStore.totalPrice).toFixed(2)}€</span>
            </div>
            <div class="totals-row">
              <span>Shipping</span>
              <span class="free-text">Free</span>
            </div>
            <div class="totals-row grand-total">
              <span>Total</span>
              <span>{Number(cartStore.totalPrice).toFixed(2)}€</span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .checkout-page {
    min-height: calc(100vh - 80px);
    background: #F9F6F2;
    padding: 3rem 0;
  }
  .containerSmall {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  h1 {
    font-size: 2rem;
    font-weight: 800;
    color: #032A15;
    margin-bottom: 2rem;
    font-family: 'Outfit', sans-serif;
  }

  /* Grid layout */
  .checkout-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 2rem;
  }
  @media (max-width: 800px) {
    .checkout-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Form Container */
  .checkout-form-container, .order-summary {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  }
  h2 {
    font-size: 1.25rem;
    color: #032A15;
    margin-bottom: 1.5rem;
    font-family: 'Outfit', sans-serif;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 0.75rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }
  label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 0.4rem;
  }
  input, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.95rem;
    background: #ffffff;
    color: #1a202c;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s;
  }
  input:focus, textarea:focus {
    border-color: #032A15;
  }
  .locked-input {
    background: #f7fafc;
    color: #718096;
    cursor: not-allowed;
  }

  /* Payment Options */
  .payment-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .payment-option {
    display: flex;
    align-items: center;
    gap: 1rem;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    padding: 1rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .payment-option:hover {
    border-color: #032A15;
    background: rgba(3, 42, 21, 0.01);
  }
  .payment-option.selected {
    border-color: #032A15;
    background: rgba(3, 42, 21, 0.03);
    box-shadow: 0 0 0 1px #032A15;
  }
  .payment-option input[type="radio"] {
    width: auto !important;
    height: auto !important;
    margin: 0;
    cursor: pointer;
    accent-color: #032A15;
  }
  .payment-details {
    flex: 1;
  }
  .payment-title {
    display: block;
    font-weight: 600;
    color: #032A15;
    font-size: 0.95rem;
    margin-bottom: 0.15rem;
  }
  .payment-subtitle {
    display: block;
    font-size: 0.75rem;
    color: #718096;
  }

  .submit-btn {
    width: 100%;
    background: #032A15;
    color: white;
    border: none;
    padding: 1rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    margin-top: 2rem;
    transition: background 0.2s;
    box-shadow: 0 4px 12px rgba(3, 42, 21, 0.15);
  }
  .submit-btn:hover {
    background: #054021;
  }

  /* Summary Section */
  .summary-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  .summary-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.95rem;
    color: #4a5568;
  }
  .item-name small {
    color: #718096;
    margin-left: 0.25rem;
  }
  hr {
    border: none;
    border-top: 1px solid #f1f5f9;
    margin: 1.5rem 0;
  }
  .summary-totals {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #4a5568;
  }
  .free-text {
    color: #10B981;
    font-weight: 600;
  }
  .totals-row.grand-total {
    font-size: 1.15rem;
    font-weight: 800;
    color: #032A15;
    margin-top: 0.5rem;
  }

  /* Success & Empty states */
  .success-state, .empty-state {
    text-align: center;
    background: white;
    padding: 4rem 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  }
  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  .success-state h2 {
    border: none;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
  }
  .success-state p {
    color: #4a5568;
    margin-bottom: 2rem;
  }
  .success-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }
  .btn-primary, .btn-secondary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.2s;
  }
  .btn-primary {
    background: #032A15;
    color: white;
  }
  .btn-secondary {
    background: #f1f5f9;
    color: #4a5568;
    border: 1px solid #e2e8f0;
  }
  .error-msg {
    background: #fff5f5;
    color: #e53e3e;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    border: 1px solid #feb2b2;
  }
</style>
