<script>
  import { onMount } from 'svelte';
  import { authStore } from '../store/auth.svelte.js';
  import { getProducts, createProduct, deleteProduct, updateProduct } from '../services/product.service.js';
  import { cartStore } from '../store/cart.svelte.js';

  let products = $state([]);
  let loading = $state(true);
  let error = $state('');
  
  // Variables de Filtro
  let searchQuery = $state('');
  let selectedCategory = $state('All');
  let minPrice = $state(0);
  let maxPrice = $state(200); // Elevado para accesorios

  // Paginación
  let currentPage = $state(1);
  const itemsPerPage = 6; // Seis para cuadrar mejor 3 cols

  // Categorías fijas requeridas
  const categorias = ['All', 'Food', 'Drinks', 'Accessories', 'Others'];

  const mockProducts = [
    { _id: '1', nombre: 'Special Reserve Coffee', precio: 28.00, descripcion: 'Single-origin Arabica with notes of dark chocolate and toasted hazelnut.', imagen: 'https://images.unsplash.com/photo-1559056199-641a0ac8b07e?q=80&w=600', tag: 'MINAS GERAIS', categoria: 'Drinks' },
    { _id: '2', nombre: 'Pure Organic Açaí', precio: 19.50, descripcion: 'Wild-harvested frozen pulp. No added sugars, 100% antioxidant power.', imagen: 'https://images.unsplash.com/photo-1590080875515-8a3a8ce57af5?q=80&w=600', tag: 'AMAZONIA', categoria: 'Food' },
    { _id: '3', nombre: 'Litoral Sandals', precio: 32.00, descripcion: 'Sustainable natural rubber soles designed for the perfect coastal stride.', imagen: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=600', tag: 'RIO DE JANEIRO', categoria: 'Accessories' },
    { _id: '4', nombre: 'Traditional Cheese Bread', precio: 12.00, descripcion: 'Cassava starch bag to prepare the perfect Pão de Queijo at home.', imagen: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=600', tag: 'SNACK', categoria: 'Food' },
    { _id: '5', nombre: 'Natural Guaraná Extract', precio: 15.00, descripcion: 'Pure Amazonian energy booster. High concentration of antioxidants.', imagen: 'https://images.unsplash.com/photo-1622543953495-a1702174c378?q=80&w=600', tag: 'TUPINAMBÁ', categoria: 'Drinks' },
    { _id: '6', nombre: 'Gourmet Brigadeiro Kit', precio: 35.00, descripcion: 'Premium cocoa and condensed milk for the ultimate Brazilian dessert experience.', imagen: 'https://images.unsplash.com/photo-1582231375326-2200be08e7b5?q=80&w=600', tag: 'DESSERT', categoria: 'Food' }
  ];

  let deletedMockIds = $state([]);
  let editedMockProducts = $state({}); // { id: { props } }

  // Svelte 5 Derived Runes para combinar listas
  let displayProducts = $derived([
    ...products, 
    ...mockProducts
      .filter(m => !deletedMockIds.includes(m._id))
      .map(m => editedMockProducts[m._id] ? { ...m, ...editedMockProducts[m._id] } : m)
  ]);

  // Filtros combinados utilizando $derived()
  let filteredProducts = $derived(
    displayProducts.filter(p => {
      const cumpleBusqueda = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const cumpleCategoria = selectedCategory === 'All' || p.categoria === selectedCategory;
      const cumplePrecio = p.precio >= minPrice && p.precio <= maxPrice;
      return cumpleBusqueda && cumpleCategoria && cumplePrecio;
    })
  );

  // Paginación $derived()
  let totalPages = $derived(Math.ceil(filteredProducts.length / itemsPerPage));
  let paginatedProducts = $derived(
    filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  );

  // Efecto para reiniciar pagina al filtrar
  $effect(() => {
    if (searchQuery || selectedCategory || minPrice || maxPrice) {
      currentPage = 1;
    }
  });

  // --- LÓGICA DE ADMINISTRADOR (AÑADIR / BORRAR) ---
  let showModal = $state(false);
  let editingProduct = $state(null); // null = creando, object = editando
  let nuevoNombre = $state('');
  let nuevoPrecio = $state('');
  let nuevaCategoria = $state('Food');
  let nuevaDescripcion = $state('');
  let archivoImagen = $state(null);
  let errorCrear = $state('');
  let creando = $state(false);

  // Rol del usuario actual
  let isAdmin = $derived(authStore.user?.role === 'administrador');

  async function loadProducts() {
    loading = true;
    try {
      const res = await getProducts();
      products = res;
    } catch (err) {
      console.warn("Información no disponible, cargando catálogo de demostración.");
    } finally {
      loading = false;
    }
  }

  async function handleCrearProducto(e) {
    e.preventDefault();
    errorCrear = '';
    creando = true;

    try {
      const formData = new FormData();
      formData.append('nombre', nuevoNombre);
      formData.append('precio', nuevoPrecio);
      formData.append('categoria', nuevaCategoria);
      formData.append('descripcion', nuevaDescripcion);
      if (archivoImagen) {
        formData.append('imagen', archivoImagen);
      }

      if (editingProduct) {
        // Simular edición local para productos Mock
        if (String(editingProduct._id).length < 5) {
          editedMockProducts = { 
            ...editedMockProducts, 
            [editingProduct._id]: {
              nombre: nuevoNombre,
              precio: Number(nuevoPrecio),
              categoria: nuevaCategoria,
              descripcion: nuevaDescripcion
            }
          };
          showModal = false;
          editingProduct = null;
          return;
        }
        await updateProduct(editingProduct._id, formData);
      } else {
        await createProduct(formData);
      }

      showModal = false;
      // Limpiar formulario
      nuevoNombre = ''; nuevoPrecio = ''; nuevaDescripcion = ''; archivoImagen = null;
      editingProduct = null;
      loadProducts(); // Recargar lista real
    } catch (err) {
      errorCrear = err.message || 'Error al guardar producto';
    } finally {
      creando = false;
    }
  }

  function handleEditarProducto(p) {
    editingProduct = p;
    nuevoNombre = p.nombre;
    nuevoPrecio = p.precio;
    nuevaCategoria = p.categoria || 'Comida';
    nuevaDescripcion = p.descripcion || '';
    archivoImagen = null;
    showModal = true;
  }

  async function handleBorrarProducto(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    // Simular borrado local para productos Mock
    if (String(id).length < 5) {
      deletedMockIds = [...deletedMockIds, id];
      localStorage.setItem('deleted_mock_ids', JSON.stringify(deletedMockIds));
      return;
    }

    try {
      await deleteProduct(id);
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      archivoImagen = e.target.files[0];
    }
  }

  onMount(() => {
    loadProducts();
    const savedDeleted = localStorage.getItem('deleted_mock_ids');
    if (savedDeleted) {
      try { deletedMockIds = JSON.parse(savedDeleted); } catch (e) {}
    }
  });
</script>

<div class="catalog-page">
  
  <!-- Encabezado Banner -->
  <header class="hero-banner">
    <div class="banner-left">
      <span class="eyebrow">PREMIUM COLLECTION</span>
      <h1>Curated Treasures from the Heart of Brazil.</h1>
    </div>
    <div class="banner-right">
      <p>Discover an exclusive selection of artisan coffee, organic superfoods, and authentic craftsmanship.</p>
      {#if isAdmin}
        <button class="admin-create-btn" onclick={() => { editingProduct = null; nuevoNombre = ''; nuevoPrecio = ''; nuevaDescripcion = ''; archivoImagen = null; showModal = true; }}>
          ➕ Create Product
        </button>
      {/if}
    </div>
  </header>

  <!-- Cuerpo de Catálogo: Barra Lateral + Grilla -->
  <div class="catalog-body">
    
    <!-- Barra Lateral (Filtros) -->
    <aside class="sidebar">
      <h3>Categories</h3>
      <ul class="categories-list">
        {#each categorias as cat}
          <li class:active={selectedCategory === cat} onclick={() => selectedCategory = cat}>
            <span>{cat === 'All' ? 'All Products' : cat}</span>
          </li>
        {/each}
      </ul>

      <!-- Filtro Rango de Precio -->
      <div class="price-filter">
        <h4>Price Range</h4>
        <div class="price-inputs">
          <input type="range" min="0" max="200" bind:value={maxPrice} class="slider" />
          <div class="price-labels">
            <span>0€</span>
            <span>Max: {maxPrice}€</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Sección de Productos -->
    <main class="products-container">
      <div class="search-bar">
        <input 
          type="text" 
          placeholder="🔍 Search products by name..." 
          bind:value={searchQuery}
          class="search-input"
        />
      </div>

      {#if paginatedProducts.length === 0}
        <div class="empty-state">No products found matching these criteria.</div>
      {:else}
        <div class="products-grid">
          {#each paginatedProducts as p}
            <div class="product-card">
              <div class="card-image-wrapper">
                {#if p.tag}
                  <span class="product-tag">{p.tag}</span>
                {/if}
                <img 
                  src={p.imagen ? (p.imagen.startsWith('http') ? p.imagen : `http://localhost:3001${p.imagen}`) : 'https://images.unsplash.com/photo-1559056199-641a0ac8b07e'} 
                  alt={p.nombre} 
                  class="product-img" 
                />
              </div>
              
              <div class="product-info">
                <div class="info-header">
                  <h4>{p.nombre}</h4>
                  <span class="price">{Number(p.precio).toFixed(2)}€</span>
                </div>
                <p class="desc">{p.descripcion || 'No description'}</p>
                
                <div class="card-actions">
                  <button class="add-to-cart-btn" onclick={() => cartStore.agregar(p)}>
                    🛒 Buy
                  </button>
                  {#if isAdmin}
                    <button class="edit-btn" onclick={() => handleEditarProducto(p)}>
                      ✏️
                    </button>
                    <button class="delete-btn" onclick={() => handleBorrarProducto(p._id)}>
                      🗑️
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>

        <!-- Controles de Paginación -->
        {#if totalPages > 1}
          <div class="pagination">
            <button 
              class="page-btn" 
              onclick={() => currentPage--} 
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span class="page-info">Page {currentPage} of {totalPages}</span>
            <button 
              class="page-btn" 
              onclick={() => currentPage++} 
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        {/if}
      {/if}
    </main>

  </div>

  <!-- Modal Formulario Crear Producto (Solo Admin) -->
  {#if showModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h3>{editingProduct ? 'Edit Product' : 'New Product'}</h3>
        {#if errorCrear}
          <div class="error-msg">⚠️ {errorCrear}</div>
        {/if}
        <form onsubmit={handleCrearProducto}>
          <div class="form-group">
            <label for="nombre">Name</label>
            <input id="nombre" type="text" bind:value={nuevoNombre} required />
          </div>
          <div class="form-group">
            <label for="precio">Price (€)</label>
            <input id="precio" type="number" step="0.01" bind:value={nuevoPrecio} required />
          </div>
          <div class="form-group">
            <label for="categoria">Category</label>
            <select id="categoria" bind:value={nuevaCategoria}>
              {#each categorias.filter(c => c !== 'All') as c}
                <option value={c}>{c}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label for="descripcion">Description</label>
            <textarea id="descripcion" bind:value={nuevaDescripcion}></textarea>
          </div>
          <div class="form-group">
            <label for="imagen">Image (Optional)</label>
            <input id="imagen" type="file" onchange={handleFileChange} accept="image/*" />
          </div>
          <div class="modal-actions">
            <button type="button" class="cancel-btn" onclick={() => { showModal = false; editingProduct = null; }}>Cancel</button>
            <button type="submit" class="submit-btn" disabled={creando}>
              {creando ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

</div>

<style>
  .catalog-page {
    font-family: 'Outfit', 'Inter', sans-serif;
    color: #1e293b;
    background-color: #fdfdfc;
    max-width: 1200px;
    margin: 0 auto;
  }

  .hero-banner {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 3rem 4rem 2rem 4rem;
    gap: 2rem;
  }

  @media (max-width: 900px) {
    .hero-banner {
      flex-direction: column;
      padding: 2rem;
    }
  }

  .banner-left h1 {
    font-size: 3.5rem;
    font-weight: 800;
    color: #033215;
    line-height: 1.05;
    margin: 0.5rem 0 0 0;
  }

  .admin-create-btn {
    padding: 0.75rem 1.25rem;
    background-color: #064523;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.825rem;
    transition: background-color 0.2s;
  }

  .admin-create-btn:hover {
    background-color: #043219;
  }

  .catalog-body {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 3rem;
    padding: 2rem 4rem 4rem 4rem;
  }

  @media (max-width: 900px) {
    .catalog-body {
      grid-template-columns: 1fr;
      padding: 2rem;
    }
  }

  .sidebar h3 {
    font-size: 1rem;
    font-weight: 800;
    margin-bottom: 1.25rem;
    color: #0f172a;
  }

  .categories-list {
    list-style: none;
    padding: 0;
    margin: 0 0 2rem 0;
  }

  .categories-list li {
    font-size: 0.85rem;
    color: #475569;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    font-weight: 500;
    transition: color 0.1s;
  }

  .categories-list li.active, .categories-list li:hover {
    color: #033215;
    font-weight: 700;
  }

  .price-filter {
    margin-bottom: 2rem;
  }

  .price-filter h4 {
    font-size: 0.85rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: #1e293b;
  }

  .slider {
    width: 100%;
    accent-color: #064523;
  }

  .price-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #64748b;
  }

  .search-bar {
    margin-bottom: 1.5rem;
  }

  .search-input {
    width: 100%;
    max-width: 400px;
    padding: 0.625rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.825rem;
    background-color: #ffffff !important;
    color: #1e293b !important;
  }

  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  .product-card {
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    overflow: hidden;
  }

  .card-image-wrapper {
    position: relative;
    width: 100%;
    height: 250px;
    border-radius: 12px;
    overflow: hidden;
  }

  .product-tag {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    background-color: rgba(6, 69, 35, 0.85);
    color: #fff;
    font-size: 0.55rem;
    font-weight: 800;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
  }

  .product-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .product-info {
    padding: 0.75rem 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .info-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .info-header h4 {
    font-size: 1rem;
    font-weight: 800;
    margin: 0;
  }

  .price {
    font-weight: 700;
    color: #78350f;
  }

  .desc {
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 1rem;
    flex: 1;
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
  }

  .add-to-cart-btn {
    flex: 1;
    padding: 0.75rem;
    background-color: #064523;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }

  .delete-btn {
    background-color: #fee2e2;
    color: #ef4444;
    border: 1px solid #fca5a5;
    border-radius: 6px;
    padding: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  /* Modal de Creación */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
  }

  .modal-content {
    background: #ffffff;
    padding: 2.5rem;
    border-radius: 16px;
    width: 100%;
    max-width: 450px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }

  .modal-content h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #033215;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    color: #4b5563;
    margin-bottom: 0.375rem;
    text-transform: uppercase;
  }

  .form-group input, .form-group select, .form-group textarea {
    width: 100%;
    padding: 0.625rem;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.875rem;
    background-color: #ffffff !important;
    color: #1e293b !important;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 2rem;
  }

  .cancel-btn {
    padding: 0.625rem 1rem;
    background: #f1f5f9;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    color: #475569;
  }

  .submit-btn {
    padding: 0.625rem 1rem;
    background: #064523;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }

  .error-msg {
    color: #dc2626;
    font-size: 0.825rem;
    margin-bottom: 1rem;
  }
</style>
