<script>
  import { cartStore } from '../store/cart.svelte.js';

  function handleIncrement(id) {
    const item = cartStore.items.find(i => i.producto._id === id);
    if (item) cartStore.actualizarCantidad(id, item.cantidad + 1);
  }

  function handleDecrement(id) {
    const item = cartStore.items.find(i => i.producto._id === id);
    if (item && item.cantidad > 1) {
      cartStore.actualizarCantidad(id, item.cantidad - 1);
    }
  }
</script>

<div class="cart-page">
  <div class="container">
    <h1>Tu Carrito</h1>

    {#if cartStore.items.length === 0}
      <div class="empty-cart">
        <div class="empty-icon">🛒</div>
        <p>Aún no tienes productos en tu carrito.</p>
        <a href="#products" class="back-btn">Explorar Productos</a>
      </div>
    {:else}
      <div class="cart-grid">
        <div class="cart-items">
          {#each cartStore.items as item}
            <div class="cart-item">
              <div class="item-img-wrapper">
                <img 
                  src={item.producto.imagen ? (item.producto.imagen.startsWith('http') ? item.producto.imagen : `http://localhost:3001${item.producto.imagen}`) : 'https://images.unsplash.com/photo-1559056199-641a0ac8b07e'} 
                  alt={item.producto.nombre} 
                  class="item-img" 
                />
              </div>
              <div class="item-details">
                <h3>{item.producto.nombre}</h3>
                <p class="item-price">{Number(item.producto.precio).toFixed(2)}€</p>
                <div class="item-quantity">
                  <button onclick={() => handleDecrement(item.producto._id)} class="qty-btn">-</button>
                  <span class="qty-num">{item.cantidad}</span>
                  <button onclick={() => handleIncrement(item.producto._id)} class="qty-btn">+</button>
                </div>
              </div>
              <div class="item-actions">
                <button class="remove-btn" onclick={() => cartStore.quitar(item.producto._id)}>🗑️</button>
              </div>
            </div>
          {/each}
        </div>

        <div class="cart-summary">
          <h2>Resumen del Pedido</h2>
          <div class="summary-content">
            <div class="summary-row">
              <span>Productos ({cartStore.totalItems})</span>
              <span>{Number(cartStore.totalPrice).toFixed(2)}€</span>
            </div>
            <div class="summary-row">
              <span>Envío</span>
              <span class="shipping-free">Gratis</span>
            </div>
            <hr />
            <div class="summary-row total">
              <span>Total</span>
              <span class="total-price">{Number(cartStore.totalPrice).toFixed(2)}€</span>
            </div>
            <a href="#checkout" class="checkout-btn">Proceder al Pago</a>
            <button class="clear-btn" onclick={() => cartStore.vaciar()}>Vaciar Carrito</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .cart-page {
    min-height: calc(100vh - 80px);
    background: #F9F6F2;
    padding: 3rem 0;
  }
  .container {
    max-width: 1100px;
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
  
  /* Empty State */
  .empty-cart {
    text-align: center;
    padding: 5rem 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  }
  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  .empty-cart p {
    color: #4a5568;
    margin-bottom: 2rem;
    font-size: 1.1rem;
  }
  .back-btn {
    display: inline-block;
    background: #032A15;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: background 0.2s;
  }
  .back-btn:hover {
    background: #054021;
  }

  /* Grid Layout */
  .cart-grid {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 2rem;
  }

  @media (max-width: 900px) {
    .cart-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Items List */
  .cart-items {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .cart-item {
    display: flex;
    background: white;
    padding: 1.25rem;
    border-radius: 14px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    align-items: center;
    transition: transform 0.15s;
  }
  .cart-item:hover {
    transform: translateY(-2px);
  }
  .item-img-wrapper {
    width: 90px;
    height: 90px;
    border-radius: 10px;
    overflow: hidden;
    background: #f7f7f7;
  }
  .item-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .item-details {
    flex: 1;
    margin-left: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .item-details h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #2d3748;
    font-family: 'Outfit', sans-serif;
  }
  .item-price {
    color: #EBB669;
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  /* Quantity Controller */
  .item-quantity {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .qty-btn {
    background: #f1f5f9;
    border: none;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    color: #4a5568;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }
  .qty-btn:hover {
    background: #e2e8f0;
  }
  .qty-num {
    font-size: 0.95rem;
    font-weight: 600;
    width: 20px;
    text-align: center;
  }

  /* Actions */
  .item-actions {
    margin-left: 1rem;
  }
  .remove-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: background 0.2s;
  }
  .remove-btn:hover {
    background: #fff5f5;
  }

  /* Summary Card */
  .cart-summary {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    height: fit-content;
    position: sticky;
    top: 100px;
  }
  .cart-summary h2 {
    font-size: 1.25rem;
    color: #032A15;
    margin-bottom: 1.5rem;
    font-family: 'Outfit', sans-serif;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 0.75rem;
  }
  .summary-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.95rem;
    color: #4a5568;
  }
  .shipping-free {
    color: #10B981;
    font-weight: 600;
  }
  hr {
    border: none;
    border-top: 1px solid #f1f5f9;
    margin: 0.5rem 0;
  }
  .summary-row.total {
    font-size: 1.15rem;
    font-weight: 800;
    color: #032A15;
    margin-top: 0.5rem;
  }
  .total-price {
    font-size: 1.3rem;
  }
  .checkout-btn {
    display: block;
    background: #032A15;
    color: white;
    text-align: center;
    padding: 0.85rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    margin-top: 1.5rem;
    transition: background 0.2s;
    box-shadow: 0 4px 12px rgba(3, 42, 21, 0.15);
  }
  .checkout-btn:hover {
    background: #054021;
  }
  .clear-btn {
    background: none;
    border: 1px solid #e2e8f0;
    color: #4a5568;
    width: 100%;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.9rem;
    cursor: pointer;
    margin-top: 0.75rem;
    transition: background 0.2s;
  }
  .clear-btn:hover {
    background: #f7fafc;
  }
</style>
