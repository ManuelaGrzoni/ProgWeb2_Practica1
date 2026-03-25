<script>
  import { onMount } from 'svelte';
  import { authStore } from '../store/auth.svelte.js';

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  let isEditing = $state(false);
  let isAdmin = $derived(authStore.user?.role === 'administrador');
  let currentTab = $state('perfil'); // 'perfil', 'usuarios', 'pedidos'

  // Edit states bind to inputs
  let editName = $state('');
  let editPhone = $state('');
  let editAddress = $state('');
  let editEmail = $state('');
  let editAvatar = $state('');

  // Admin Lists
  let usersList = $state([]);
  let ordersList = $state([]);

  // Sincronizar pedidos en tiempo real (localStorage y Polling para diferentes navegadores)
  $effect(() => {
    const handleStorageChange = (e) => {
      if (typeof fetchMyOrders === 'function') fetchMyOrders();
      if (typeof fetchOrders === 'function') fetchOrders();
    };
    window.addEventListener('storage', handleStorageChange);

    // Polleo cada 2 segundos para sincronizar paneles
    const interval = setInterval(() => {
      if (typeof fetchOrders === 'function') fetchOrders();
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  });
  let myOrdersList = $state([]);
  let expandedOrderId = $state(null);
  let loadingAdmin = $state(false);

  async function fetchMyOrders() {
    try {
      const res = await fetch(`${API_URL}/ordenes/mis-ordenes`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      });
      const serverOrders = await res.json();
      const mockOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]');
      
      myOrdersList = Array.isArray(serverOrders) ? [...serverOrders, ...mockOrders] : [...mockOrders];
    } catch (err) { 
      console.error(err); 
      myOrdersList = JSON.parse(localStorage.getItem('mock_orders') || '[]');
    }
  }

  onMount(() => {
    fetchMyOrders();
  });

  let selectedFile = $state(null);
  let filePreview = $state('');

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      selectedFile = file;
      filePreview = URL.createObjectURL(file);
    }
  }

  function startEditing() {
    isEditing = true;
    editName = authStore.user?.username || '';
    editPhone = authStore.user?.phone || '';
    editAddress = authStore.user?.addresses?.[0]?.street || ''; // simple map to single input
    editEmail = authStore.user?.email || '';
    editAvatar = authStore.user?.profilePicture || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop';
  }

  async function saveProfile() {
    try {
      const formData = new FormData();
      formData.append('username', editName);
      formData.append('phone', editPhone);
      formData.append('addresses', JSON.stringify([{ street: editAddress, isDefault: true }]));
      if (isAdmin) formData.append('email', editEmail);
      if (selectedFile) formData.append('foto', selectedFile);

      const res = await fetch(`${API_URL}/auth/perfil`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error saving');
      // Update authStore locally to reflect immediately
      authStore.user = { ...authStore.user, ...data.usuario };
      isEditing = false;
      selectedFile = null;
      filePreview = '';
    } catch (err) {
      alert(err.message);
    }
  }

  async function fetchUsers() {
    if (!isAdmin) return;
    loadingAdmin = true;
    try {
      const res = await fetch(`${API_URL}/usuarios`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      });
      usersList = await res.json();
    } catch (err) { console.error(err); }
    finally { loadingAdmin = false; }
  }

  async function fetchOrders() {
    if (!isAdmin) return;
    loadingAdmin = true;
    try {
      const res = await fetch(`${API_URL}/ordenes`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      });
      const serverOrders = await res.json();
      const mockOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]');
      
      // Mapear estructuras para que coincidan con la tabla admin (ej: userId.username)
      const mappedMockOrders = mockOrders.map(o => ({
        ...o,
        userId: { username: authStore.user?.username || 'Invitado' }
      }));

      ordersList = Array.isArray(serverOrders) ? [...serverOrders, ...mappedMockOrders] : [...mappedMockOrders];
    } catch (err) { 
      console.error(err); 
    } finally { 
      loadingAdmin = false; 
    }
  }

  async function updateOrderStatus(orderId, newStatus) {
    if (String(orderId).startsWith('mock_')) {
      const mockOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]');
      const index = mockOrders.findIndex(o => o._id === orderId);
      if (index !== -1) {
        mockOrders[index].status = newStatus;
        localStorage.setItem('mock_orders', JSON.stringify(mockOrders));
        
        // Actualizar reactivamente ambos listados en memoria
        ordersList = ordersList.map(o => o._id === orderId ? { ...o, status: newStatus } : o);
        myOrdersList = myOrdersList.map(o => o._id === orderId ? { ...o, status: newStatus } : o);
      }
      return;
    }

    try {
      const res = await fetch(`${API_URL}/ordenes/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchOrders();
        fetchMyOrders(); // Sincronizar vista de usuario
      }
    } catch (err) { console.error(err); }
  }

  $effect(() => {
    if (currentTab === 'usuarios') fetchUsers();
    if (currentTab === 'pedidos') fetchOrders();
  });
</script>

<div class="profile-page">
  <!-- Header -->
  <header class="profile-header">
    <div class="header-content">
      <div class="avatar-wrapper" class:editing={isEditing}>
        {#if isEditing}
          <img src={filePreview || (authStore.user?.profilePicture ? `${API_URL}${authStore.user.profilePicture}` : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop')} alt={authStore.user?.username} class="profile-avatar" />
          <div class="avatar-edit-overlay">
            <input type="file" accept="image/*" onchange={handleFileChange} class="hidden-input" id="avatar-picker" />
            <label for="avatar-picker" class="avatar-picker-label">Upload Photo</label>
          </div>
        {:else}
          <img src={authStore.user?.profilePicture ? `${API_URL}${authStore.user.profilePicture}` : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop'} alt={authStore.user?.username} class="profile-avatar" />
        {/if}
      </div>
      <div class="profile-info">
        <span class="member-badge">{authStore.user?.role === 'administrador' ? 'ADMIN' : authStore.user?.role === 'usuario' ? 'USER' : (authStore.user?.role || 'USER')}</span>
        <h1>{authStore.user?.username}</h1>
        <p class="status-text">Member since {authStore.user?.createdAt ? new Date(authStore.user.createdAt).toLocaleDateString() : 'N/A'}</p>
      </div>

      {#if isAdmin}
        <div class="tab-controls">
          <button class="tab-btn" class:active={currentTab === 'perfil'} onclick={() => currentTab = 'perfil'}>My Profile</button>
          <button class="tab-btn" class:active={currentTab === 'usuarios'} onclick={() => currentTab = 'usuarios'}>Users</button>
          <button class="tab-btn" class:active={currentTab === 'pedidos'} onclick={() => currentTab = 'pedidos'}>Orders</button>
        </div>
      {/if}

      <div class="action-buttons">
        {#if !isEditing}
          <button class="edit-btn" onclick={startEditing}>Edit Profile</button>
        {:else}
          <button class="save-btn" onclick={saveProfile}>Save</button>
          <button class="cancel-btn" onclick={() => isEditing = false}>Cancel</button>
        {/if}
      </div>
    </div>
  </header>

  <!-- Content Switcher -->
  <div class="profile-content">
    {#if currentTab === 'perfil'}
      <!-- Main Grid (Collapsed to narrow centered column) -->
      <div class="profile-grid single-column">
        <div class="grid-left">
          <section class="card personal-details">
            <div class="card-header">
              <h2>Personal Details</h2>
              <span class="icon">👤</span>
            </div>
            <div class="card-body">
              <div class="detail-group">
                <label>USERNAME</label>
                {#if isEditing}
                  <input type="text" bind:value={editName} class="underline-input" />
                {:else}
                  <p>{authStore.user?.username}</p>
                {/if}
              </div>

              <div class="detail-group">
                <label>EMAIL ADDRESS</label>
                {#if isEditing}
                  <input type="email" bind:value={editEmail} class="underline-input" disabled={!isAdmin} />
                {:else}
                  <p>{authStore.user?.email}</p>
                {/if}
              </div>

              <div class="detail-group">
                <label>PHONE NUMBER</label>
                {#if isEditing}
                  <input type="text" bind:value={editPhone} class="underline-input" placeholder="+55..." />
                {:else}
                  <p>{authStore.user?.phone || 'Not registered'}</p>
                {/if}
              </div>

              <div class="detail-group full-width">
                <label>MAIN SHIPPING ADDRESS</label>
                {#if isEditing}
                  <textarea bind:value={editAddress} class="underline-input textarea"></textarea>
                {:else}
                  <p class="address">{authStore.user?.addresses?.[0]?.street || 'Not registered'}</p>
                {/if}
              </div>
            </div>
          </section>

          <section class="card payment-methods">
            <div class="card-header">
              <h2>Payment Methods</h2>
            </div>
            <div class="card-body">
              <p>Manage your payment methods during checkout.</p>
            </div>
          </section>
        </div>
      </div>
    {:else}
      <!-- Dashboard views -->
      <div class="admin-dashboard-view">
        {#if currentTab === 'usuarios'}
          <div class="dashboard-panel">
            <h2>User Management</h2>
            {#if loadingAdmin} <p>Loading...</p> {/if}
            <table class="admin-table">
              <thead>
                <tr><th>Username</th><th>Email</th><th>Role</th><th>Phone</th></tr>
              </thead>
              <tbody>
                {#each usersList as user}
                  <tr>
                    <td>{user.username}</td><td>{user.email}</td><td>{user.role}</td><td>{user.phone || '-'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else if currentTab === 'pedidos'}
          <div class="dashboard-panel">
            <h2>Order Management</h2>
            {#if loadingAdmin} <p>Loading...</p> {/if}
            <table class="admin-table">
              <thead>
                <tr><th>ID</th><th>User</th><th>Total</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {#each ordersList as order}
                  <tr>
                    <td>{String(order._id).startsWith('mock_') ? String(order._id).replace('mock_', '').substring(6, 12) : order._id.substring(18)}</td>
                    <td>{order.userId?.username || 'Guest'}</td>
                    <td>{Number(order.totalPrice).toFixed(2)}€</td>
                    <td>
                      <span class="status-badge" class:transit={order.status === 'Pendiente'}>
                        {order.status === 'Pendiente' ? 'Pending' : order.status === 'Completado' ? 'Completed' : order.status}
                      </span>
                    </td>
                    <td>
                      <select onchange={(e) => updateOrderStatus(order._id, e.target.value)}>
                        <option value="Pendiente" selected={order.status === 'Pendiente'}>Pending</option>
                        <option value="Completado" selected={order.status === 'Completado'}>Completed</option>
                      </select>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if currentTab === 'perfil'}
    <!-- Recent Orders -->
    <section class="recent-orders">
      <div class="section-header">
        <div>
          <h2>Recent Orders</h2>
          <p class="subtitle">Track your curated imports back to the source.</p>
        </div>
        <a href="#profile" class="view-all">View History</a>
      </div>
      <div class="orders-list">
        {#each myOrdersList as order}
          <div class="order-card-wrapper">
            <div class="order-item" onclick={() => expandedOrderId = expandedOrderId === order._id ? null : order._id} class:expanded={expandedOrderId === order._id} style="cursor: pointer;">
              <!-- image can be from product or fallback -->
              <div class="order-img-placeholder">📦</div>
              <div class="order-info">
                <h4>Order #{String(order._id).length > 20 ? order._id.substring(18) : String(order._id).replace('mock_', '').substring(0,6)}</h4>
                <p>Total: {Number(order.totalPrice).toFixed(2)}€ • {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div class="order-price">
                <span class="status-badge" class:transit={order.status === 'Pendiente'}>
                  {order.status === 'Pendiente' ? 'Pending' : order.status === 'Completado' ? 'Completed' : order.status}
                </span>
              </div>
              <div class="chevron" style="transition: transform 0.2s; transform: rotate({expandedOrderId === order._id ? '90deg' : '0deg'})">></div>
            </div>

            {#if expandedOrderId === order._id}
              <div class="order-details-expanded">
                <h5>Products in this order:</h5>
                <ul class="expanded-items-list">
                  {#each order.items as item}
                    <li>
                      <span class="expanded-item-name">{item.productId?.nombre || 'Sample product'} <small>x{item.quantity || item.cantidad || 1}</small></span>
                      <span class="expanded-item-subtotal">{item.productId?.precio ? Number(item.productId.precio * (item.quantity || item.cantidad || 1)).toFixed(2) + '€' : '-'}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {:else}
          <p>No tienes pedidos recientes.</p>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Footer -->
  <footer class="profile-footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>Terra Brasilis</h3>
        <p>Bridging the gap between Brazilian master artisans and global connoisseurs.</p>
      </div>
      <div class="footer-links">
        <h4>CURATIONS</h4>
        <ul>
          <li><a href="#profile">Artisan Directory</a></li>
          <li><a href="#profile">Sustainability Report</a></li>
          <li><a href="#profile">Shipping Policy</a></li>
        </ul>
      </div>
      <div class="footer-links">
        <h4>CONTACT</h4>
        <p>Rua Augusta, 1200<br/>São Paulo, Brazil</p>
        <p>hello@terrabrasilis.com</p>
      </div>
      <div class="footer-newsletter">
        <h4>NEWSLETTER</h4>
        <div class="news-input">
          <input type="email" placeholder="Email" />
          <button>→</button>
        </div>
      </div>
    </div>
  </footer>
</div>

<style>
  /* Base & Colors */
  .profile-page {
    font-family: 'Outfit', 'Inter', sans-serif;
    color: #1a1a1a;
    background-color: #FDFCF7; /* Cream background like image */
    min-height: 100vh;
    text-align: left;
  }

  /* Header */
  .profile-header {
    padding: 3rem 4rem;
    max-width: 1100px;
    margin: 0 auto;
  }
  .header-content {
    display: flex;
    align-items: center;
    gap: 2rem;
    position: relative;
  }
  .avatar-wrapper {
    width: 120px;
    height: 120px;
    background-color: #E6B9A6; /* Pinkish-coral box from image */
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .profile-avatar {
    width: 80%;
    height: 80%;
    object-fit: cover;
    border-radius: 8px;
    background: white;
  }
  .profile-info h1 {
    font-size: 2.5rem;
    margin: 0.25rem 0;
    color: #0c0c0c;
    font-weight: 500;
  }
  .member-badge {
    color: #bca07e;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .status-text {
    font-size: 0.85rem;
    color: #666;
  }
  .edit-btn {
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 0.5rem 1rem;
    border: 1px solid #e0e0e0;
    background: #ffffff;
    color: #000000 !important;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }

  /* Grid Layout */
  .profile-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 2.5rem;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 4rem 3rem 4rem;
  }

  @media (max-width: 900px) {
    .profile-grid {
      grid-template-columns: 1fr;
      padding: 2rem;
    }
  }

  .card {
    background: #ffffff;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    border: 1px solid rgba(0,0,0,0.03);
    margin-bottom: 2rem;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  .card-header h2 {
    font-size: 1.1rem;
    font-weight: 800;
    margin: 0;
  }

  /* Personal Details */
  .detail-group {
    margin-bottom: 1.25rem;
  }
  .detail-group label {
    display: block;
    font-size: 0.6rem;
    font-weight: 700;
    color: #999;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  .detail-group p {
    font-size: 0.9rem;
    font-weight: 500;
  }
  .address {
    white-space: pre-line;
    line-height: 1.4;
  }
  /* Admin Controls */
  .tab-controls {
    display: flex;
    gap: 0.75rem;
    background: #F4F3ED;
    padding: 0.35rem;
    border-radius: 8px;
    margin-left: 2rem;
  }
  .tab-btn {
    background: none;
    border: none;
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
  }
  .tab-btn.active {
    background: #ffffff;
    color: #032A15;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  .action-buttons {
    margin-left: auto;
    display: flex;
    gap: 0.75rem;
  }
  .save-btn, .cancel-btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }
  .save-btn {
    background: #032A15;
    color: white;
    border: none;
  }
  .cancel-btn {
    background: white;
    border: 1px solid #dddddd;
    color: #000000 !important;
  }

  .profile-grid.single-column {
    grid-template-columns: 1fr;
    max-width: 700px; /* Centered narrow column */
  }

  /* Admin Dashboard Panel */
  .admin-dashboard-view {
    padding: 0 4rem 4rem 4rem;
    max-width: 1100px;
    margin: 0 auto;
  }
  .dashboard-panel {
    background: #ffffff;
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    border: 1px solid rgba(0,0,0,0.03);
  }
  .dashboard-panel h2 {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
    color: #0c0c0c;
  }
  .admin-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .admin-table th, .admin-table td {
    padding: 1.25rem 1rem;
    text-align: left;
    border-bottom: 1px solid #f0f0f0;
  }
  .admin-table th {
    background: #FDFCF7;
    font-weight: 700;
    font-size: 0.7rem;
    color: #999;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .admin-table td {
    color: #333;
  }
  .admin-table select {
    padding: 0.4rem;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
    background: white;
    font-size: 0.75rem;
    color: #000000 !important;
  }

  /* Avatar Edit Overlay */
  .avatar-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
  }
  .avatar-wrapper.editing .profile-avatar {
    opacity: 0.7;
    border: 2px dashed #032A15;
  }
  .avatar-edit-overlay {
    position: absolute;
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%);
    width: 140px;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 0.25rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    z-index: 10;
  }
  .hidden-input {
    display: none !important;
  }
  .avatar-picker-label {
    display: block !important;
    background: #032A15 !important;
    color: #ffffff !important;
    font-size: 0.65rem !important;
    font-weight: 600 !important;
    padding: 0.4rem 0.6rem !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    text-align: center !important;
    border: none !important;
    transition: background 0.2s;
  }
  .avatar-picker-label:hover {
    background: #054021 !important;
  }

  .underline-input {
    background: #ffffff !important;
    color: #000000 !important;
    border: 1px solid #dcdcdc !important;
    border-radius: 8px !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.85rem !important;
    width: 100% !important;
    box-sizing: border-box !important;
    outline: none !important;
    transition: border-color 0.2s;
  }
  .underline-input:focus {
    border-color: #032A15 !important;
  }
  .underline-input.textarea {
    resize: vertical;
    min-height: 80px;
  }

  /* Recent Orders */
  .recent-orders {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 4rem 4rem 4rem;
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 1.5rem;
  }
  .section-header h2 {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
  }
  .subtitle {
    font-size: 0.8rem;
    color: #666;
    margin: 0;
  }
  .view-all {
    color: #8A5B37;
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
  }
  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .order-item {
    background: #ffffff;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    border: 1px solid rgba(0,0,0,0.02);
    transition: background 0.15s;
  }
  .order-item:hover {
    background: #f8fafc;
  }
  .order-card-wrapper {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    margin-bottom: 0.75rem;
  }
  .order-details-expanded {
    background: white;
    padding: 1.25rem;
    border-radius: 0 0 12px 12px;
    border-top: 1px dashed #e2e8f0;
  }
  .order-details-expanded h5 {
    margin: 0 0 0.75rem 0;
    font-size: 0.85rem;
    color: #4a5568;
    font-family: 'Outfit', sans-serif;
  }
  .expanded-items-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .expanded-items-list li {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: #2d3748;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid #f7fafc;
  }
  .expanded-items-list li:last-child {
    border-bottom: none;
  }
  .expanded-item-name small {
    color: #718096;
    margin-left: 0.25rem;
  }
  .expanded-item-subtotal {
    font-weight: 600;
    color: #4a5568;
  }
  .order-img {
    width: 45px;
    height: 45px;
    border-radius: 8px;
    object-fit: cover;
  }
  .order-info {
    flex: 1;
  }
  .order-info h4 {
    margin: 0 0 0.15rem 0;
    font-size: 0.85rem;
  }
  .order-info p {
    margin: 0;
    font-size: 0.7rem;
    color: #999;
  }
  .order-price {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    margin-right: 1rem;
  }
  .order-price span:first-child {
    font-weight: 700;
    font-size: 0.85rem;
  }
  .status-badge {
    font-size: 0.6rem;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    background: #EAF7EC;
    color: #2E7D32;
    font-weight: 700;
  }
  .status-badge.transit {
    background: #EBF1FA;
    color: #1976D2;
  }
  .chevron {
    color: #ccc;
    font-size: 0.8rem;
  }

  /* Footer */
  .profile-footer {
    background-color: #011E0F; /* Slightly darker green for grounding */
    color: #ffffff;
    padding: 4rem;
    margin-top: 3rem;
  }
  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1.5fr;
    gap: 3rem;
  }
  @media (max-width: 900px) {
    .footer-grid {
      grid-template-columns: 1fr;
      padding: 2rem;
    }
  }
  .footer-brand h3 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
  }
  .footer-brand p {
    font-size: 0.75rem;
    color: #A7F3D0;
    max-width: 280px;
    line-height: 1.5;
  }
  .footer-links h4, .footer-newsletter h4 {
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    color: #A7F3D0;
    margin-bottom: 1rem;
    text-transform: uppercase;
  }
  .footer-links ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .footer-links li {
    margin-bottom: 0.75rem;
  }
  .footer-links a {
    color: #cbd5e0;
    font-size: 0.8rem;
    text-decoration: none;
  }
  .footer-links a:hover {
    color: #fff;
  }
  .news-input {
    display: flex;
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    padding: 0.5rem;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .news-input input {
    flex: 1;
    background: none;
    border: none;
    color: #ffffff;
    font-size: 0.8rem;
    outline: none;
    padding: 0.25rem;
  }
  .news-input button {
    background: #EBB669;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    padding: 0.25rem 0.75rem;
    font-weight: bold;
    color: #032A15;
  }
</style>
