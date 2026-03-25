<script>
  import { authStore } from './store/auth.svelte.js';
  import { onMount } from 'svelte';
  import Login from './pages/Login.svelte';
  import Register from './pages/Register.svelte';
  import Products from './pages/Products.svelte';
  import Profile from './pages/Profile.svelte';
  import Chat from './pages/Chat.svelte';
  import Cart from './pages/Cart.svelte';
  import Checkout from './pages/Checkout.svelte';
  import Navbar from './components/Navbar.svelte';

  let currentView = $state('#products');

  function updateRoute() {
    const hash = window.location.hash || '#products';
    
    // Auth guards
    if (!authStore.isAuthenticated && hash !== '#login' && hash !== '#register') {
      window.location.hash = '#login';
      currentView = '#login';
      return;
    }
    if (authStore.isAuthenticated && (hash === '#login' || hash === '#register')) {
      window.location.hash = '#products';
      currentView = '#products';
      return;
    }

    currentView = hash;
  }

  onMount(() => {
    updateRoute();
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  });

  // Re-run guard when auth state changes (Svelte 5 Effect)
  $effect(() => {
    if (!authStore.isAuthenticated && currentView !== '#login' && currentView !== '#register') {
      window.location.hash = '#login';
      currentView = '#login';
    }
  });
</script>

<Navbar current={currentView} />

<main>
  {#if currentView === '#login'}
    <Login />
  {:else if currentView === '#register'}
    <Register />
  {:else if currentView === '#products'}
    <Products />
  {:else if currentView === '#profile'}
    <Profile />
  {:else if currentView === '#chat'}
    <Chat />
  {:else if currentView === '#cart'}
    <Cart />
  {:else if currentView === '#checkout'}
    <Checkout />
  {:else}
    <div class="not-found">Página no encontrada</div>
  {/if}
</main>

<style>
  :global(:root) {
    --primary: #2563eb;
    --primary-hover: #1d4ed8;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --bg-color: #f8fafc;
    --text-color: #1e293b;
    --card-bg: #ffffff;
    --border-radius: 12px;
    --box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(body) {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
    margin: 0;
    padding: 0;
  }

  .container {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 1rem;
    min-height: calc(100vh - 80px); /* Adjust based on Navbar height */
  }

  .not-found {
    text-align: center;
    padding: 4rem;
    font-size: 1.5rem;
    color: #64748b;
  }
</style>
