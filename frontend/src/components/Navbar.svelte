<script>
  import { authStore } from '../store/auth.svelte.js';
  import { logout } from '../services/auth.service.js';
  import { cartStore } from '../store/cart.svelte.js';

  let { current } = $props();

  function handleLogout() {
    logout();
    window.location.hash = '#login';
  }
</script>

<nav class="navbar">
  <div class="nav-container">
    <div class="brand">
      <span class="logo">Terra Brasilis</span>
    </div>

    <ul class="nav-links">
      <li><a href="#products" class:active={current === '#products'}>Catalog</a></li>
      <li><a href="#chat" class:active={current === '#chat'}>Chat</a></li>
      <li><a href="#profile" class:active={current === '#profile'}>Profile</a></li>
    </ul>

    <div class="nav-actions">
      <!-- Carrito Icon -->
      <a href="#cart" class="icon-btn cart-link" class:active={current === '#cart'}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-shopping-cart"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        {#if cartStore.totalItems > 0}
          <span class="badge">{cartStore.totalItems}</span>
        {/if}
      </a>

      {#if authStore.isAuthenticated}
        <div class="user-menu">
          <button class="logout-link" onclick={handleLogout}>Logout</button>
        </div>
      {/if}
    </div>
  </div>
</nav>

<style>
  .navbar {
    background-color: #ffffff;
    border-bottom: 1px solid #f1f5f9;
    padding: 1.25rem 0;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand .logo {
    font-size: 1.25rem;
    font-weight: 800;
    color: #033215; /* Slate green match */
    font-family: 'Outfit', sans-serif;
  }

  .nav-links {
    list-style: none;
    display: flex;
    gap: 2.5rem;
    margin: 0;
    padding: 0;
  }

  .nav-links a {
    text-decoration: none;
    color: #475569;
    font-size: 0.9rem;
    font-weight: 600;
    transition: color 0.2s;
  }

  .nav-links a:hover, .nav-links a.active {
    color: #033215;
    border-bottom: 2px solid #033215;
    padding-bottom: 4px;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .icon-btn {
    background: none;
    border: none;
    color: #1e293b;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logout-link {
    background: none;
    border: none;
    font-size: 0.825rem;
    color: #64748b;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }

  /* Cart Badge */
  .cart-link {
    position: relative;
    text-decoration: none;
    color: #1e293b;
    transition: color 0.15s;
  }
  .cart-link:hover, .cart-link.active {
    color: #033215;
  }
  .badge {
    position: absolute;
    top: -6px;
    right: -8px;
    background: #FF5E5E;
    color: white;
    font-size: 0.6rem;
    font-weight: 800;
    min-width: 15px;
    height: 15px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    border: 1px solid white;
  }
</style>
