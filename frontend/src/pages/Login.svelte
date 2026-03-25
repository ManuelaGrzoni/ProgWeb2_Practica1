<script>
  import { login } from '../services/auth.service.js';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  // Derived validation checking (Svelte 5 Derived Rune)
  let isValid = $derived(email.includes('@') && password.length >= 4);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      await login(email, password);
      // Redirect to products via hash
      window.location.hash = '#products';
    } catch (err) {
      error = err.message || 'Error signing in';
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-page" style="--bg-image: url('https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=2070&auto=format&fit=crop')">
  <div class="overlay"></div>

  <div class="content">
    <div class="left-section">
      <span class="eyebrow">CURATED BRAZILIAN LUXURY</span>
      <h1>Terra<br />Brasilis</h1>
      <p class="description">
        Bringing the soul of the Cerrado and the depth of the Amazon to your doorstep. Experience the finest artisan imports.
      </p>
      <div class="pills">
        <span class="pill badge-minas">MINAS GERAIS</span>
        <span class="pill badge-bahia">BAHIA</span>
      </div>
    </div>

    <div class="right-section">
      <div class="login-card">
        <h2>Welcome Back</h2>
        <p class="subtitle">Please enter your details to access the catalog.</p>

        {#if error}
          <div class="error-alert">
            ⚠️ {error}
          </div>
        {/if}

        <form onsubmit={handleSubmit}>
          <div class="form-group">
            <label for="email">EMAIL ADDRESS</label>
            <input
              type="email"
              id="email"
              bind:value={email}
              placeholder="your@email.com"
              required
              disabled={loading}
              class="underline-input"
            />
          </div>

          <div class="form-group">
            <div class="label-row">
              <label for="password">PASSWORD</label>
              <a href="#login" class="forgot-link">Forgot?</a>
            </div>
            <input
              type="password"
              id="password"
              bind:value={password}
              placeholder="••••••••"
              required
              disabled={loading}
              class="underline-input"
            />
          </div>

          <button
            type="submit"
            class="submit-btn"
            disabled={!isValid || loading}
          >
            {#if loading}
              Loading...
            {:else}
              Sign In
            {/if}
          </button>
        </form>

        <p class="signup-prompt">
          New to the curation? <a href="#register"><strong>Create an account</strong></a>
        </p>
      </div>
    </div>
  </div>

  <div class="footer-note">
    <span class="globe">🌐</span> IMPORTED DIRECTLY FROM ARTISAN COOPERATIVES
    <div class="footer-links">
      <a href="#login">PRIVACY</a>
      <a href="#login">TERMS</a>
      <a href="#login">HELP</a>
    </div>
  </div>
</div>

<style>
  .login-page {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-image: var(--bg-image);
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    z-index: 1000; /* Overlap navbar on login */
    font-family: 'Outfit', 'Inter', sans-serif;
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.4));
  }

  .content {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 100%;
    padding: 0 4rem;
    align-items: center;
  }

  @media (max-width: 900px) {
    .content {
      grid-template-columns: 1fr;
      padding: 2rem;
    }
    .left-section {
      display: none; /* Hide left side on smaller screens or stack */
    }
  }

  /* Left Section */
  .left-section {
    color: #ffffff;
    max-width: 450px;
    text-shadow: 0 2px 4px rgba(0,0,0,0.4);
  }

  .eyebrow {
    font-size: 0.75rem;
    letter-spacing: 0.15em;
    font-weight: 600;
    color: #e2e8f0;
    text-transform: uppercase;
  }

  h1 {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1.1;
    margin: 1rem 0;
    color: #ffffff;
  }

  .description {
    font-size: 1rem;
    line-height: 1.6;
    color: #f1f5f9;
    margin-bottom: 2rem;
  }

  .pills {
    display: flex;
    gap: 0.75rem;
  }

  .pill {
    padding: 0.5rem 1.25rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .badge-minas {
    background-color: #633215;
    color: #ffffff;
  }

  .badge-bahia {
    background-color: #fbd38d;
    color: #744210;
  }

  /* Right Section (Card) */
  .right-section {
    display: flex;
    justify-content: flex-end;
  }

  .login-card {
    background: rgba(248, 245, 240, 0.95); /* Off-white / cream background like in design */
    backdrop-filter: blur(10px);
    padding: 3rem;
    border-radius: 20px;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.2);
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a202c;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    color: #4a5568;
    font-size: 0.875rem;
    margin-bottom: 2.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.375rem;
  }

  label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #4a5568;
    text-transform: uppercase;
  }

  .underline-input {
    width: 100%;
    border: none;
    border-bottom: 1px solid #cbd5e0;
    background: transparent;
    padding: 0.625rem 0;
    font-size: 0.875rem;
    color: #2d3748;
    border-radius: 0;
    box-sizing: border-box;
  }

  .underline-input::placeholder {
    color: #a0aec0;
  }

  .underline-input:focus {
    outline: none;
    border-bottom-color: #0d4220; /* Dark green line focus like image button color */
  }

  .forgot-link {
    font-size: 0.65rem;
    font-weight: 700;
    color: #744210;
    text-decoration: none;
  }

  .submit-btn {
    width: 100%;
    padding: 0.875rem;
    background-color: #064523; /* Dark green core */
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    margin: 1.5rem 0 1rem 0;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    background-color: #043219;
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }



  .signup-prompt {
    font-size: 0.825rem;
    color: #4a5568;
    text-align: center;
    margin-top: 1.5rem;
  }

  .signup-prompt a {
    color: #1a202c;
    text-decoration: none;
  }

  /* Footer Note */
  .footer-note {
    position: absolute;
    bottom: 2rem;
    left: 4rem;
    right: 4rem;
    display: flex;
    justify-content: space-between;
    font-size: 0.65rem;
    color: rgba(255,255,255,0.7);
    letter-spacing: 0.1em;
    z-index: 1;
    font-weight: 600;
  }

  .footer-links {
    display: flex;
    gap: 1.5rem;
  }

  .footer-links a {
    color: rgba(255,255,255,0.7);
    text-decoration: none;
  }
</style>
