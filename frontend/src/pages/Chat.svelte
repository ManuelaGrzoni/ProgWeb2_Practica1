<script>
  import { onMount } from 'svelte';
  import { authStore } from '../store/auth.svelte.js';

  import { io } from 'socket.io-client';

  const baseConversaciones = [
    { id: 1, nombre: 'Soporte Artesanal', mensaje: 'Tu pedido de Minas Gerais está listo...', activo: true, hora: 'Ahora', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100' },
    { id: 2, nombre: 'Lucas Silva', mensaje: '¡Gracias por la información!', activo: false, hora: '2h ago', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100' },
    { id: 3, nombre: 'Isabella Martins', mensaje: 'Me gustaría saber más de la cerámica.', activo: false, hora: 'Ayer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100' }
  ];

  let conversaciones = $state([]);
  let charlaSeleccionada = $state(null);

  const dummyMensajes = [
    { id: 1, emisor: 'other', texto: '¡Hola! Estoy aquí para ayudarte a descubrir las piezas perfectas para tu colección. ¿Estás buscando algo específico?', hora: '09:41 AM' },
    { id: 2, emisor: 'own', texto: '¡Sí! Estaba buscando las hamacas tejidas a mano. Quería saber si son de origen sostenible y cuánto tarda el envío.', hora: '09:44 AM' }
  ];

  let socket;

  onMount(() => {
    const saved = localStorage.getItem('conversaciones_guardadas');
    const isUser = authStore.user?.role === 'usuario';

    let initialList = baseConversaciones;
    if (isUser) {
      initialList = [
        { id: 'admin_support', nombre: 'Soporte Administrativo', mensaje: '¿En qué podemos ayudarte?', activo: true, hora: 'Ahora', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100' }
      ];
    }

    if (saved) {
      try {
        conversaciones = JSON.parse(saved);
        if (isUser) conversaciones = initialList;
      } catch (e) {
        conversaciones = initialList;
      }
    } else {
      conversaciones = initialList;
    }
    charlaSeleccionada = null; // Empieza limpio

    // --- CONEXIÓN SOCKET.IO ---
    socket = io('http://localhost:3001', {
      auth: { token: authStore.token }
    });

    socket.on('connect', () => {
      console.log('✅ Conectado al chat por socket');
      if (authStore.user?.role === 'administrador') {
        socket.emit('get_conversations_list');
        
        socket.on('new_ticket_message', () => {
          socket.emit('get_conversations_list');
        });
      }
    });

    socket.on('conversations_list', (list) => {
      // Mapear respuesta del back a formato local
      conversaciones = list.map(c => ({
        id: c._id, // RoomId
        nombre: c.username,
        mensaje: c.lastMessage || 'Nuevo mensaje',
        activo: c.unreadCount > 0,
        hora: c.lastTimestamp ? new Date(c.lastTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Ahora',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100' // Generic
      }));
    });

    socket.on('message_history', ({ userId, messages }) => {
      if (charlaSeleccionada?.id === userId) {
        mensajes = messages.map(m => ({
          id: m._id,
          emisor: m.userId === authStore.user?.id ? 'own' : 'other',
          texto: m.text,
          hora: new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          producto: m.imageUrl ? { nombre: 'Imagen', descripcion: '', imagen: m.imageUrl, precio: '0' } : null
        }));
      }
    });

    socket.on('chat_message', (msg) => {
      if (charlaSeleccionada && (charlaSeleccionada.id === msg.roomId || msg.roomId === authStore.user?.id)) {
        mensajes = [...mensajes, {
          id: msg._id,
          emisor: msg.userId === authStore.user?.id ? 'own' : 'other',
          texto: msg.text,
          hora: new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }];
      }
    });

    return () => {
      if (socket) socket.disconnect();
    };
  });

  let nuevoMensaje = $state('');

  // Estados para borrado personalizado
  let showDeleteConfirm = $state(false);
  let chatToDeleteId = $state(null);

  let mensajes = $state([]);

  function enviarMensaje() {
    if (!nuevoMensaje.trim()) return;
    
    if (socket && socket.connected) {
      const data = {
        text: nuevoMensaje,
        targetUserId: authStore.user?.role === 'administrador' ? charlaSeleccionada?.id : null
      };
      socket.emit('chat_message', data);
      
      // Añadir localmente para feedback inmediato
      const ahora = new Date();
      const horaStr = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      mensajes = [...mensajes, {
        id: Date.now(),
        emisor: 'own',
        texto: nuevoMensaje,
        hora: horaStr
      }];
    }
    nuevoMensaje = '';
  }

  function abrirConfirmarBorrado(id, e) {
    e.stopPropagation();
    chatToDeleteId = id;
    showDeleteConfirm = true;
  }

  function confirmarBorrado() {
    if (chatToDeleteId) {
      conversaciones = conversaciones.filter(c => c.id !== chatToDeleteId);
      localStorage.setItem('conversaciones_guardadas', JSON.stringify(conversaciones));
      if (charlaSeleccionada && charlaSeleccionada.id === chatToDeleteId) {
        charlaSeleccionada = conversaciones.length > 0 ? conversaciones[0] : null;
      }
    }
    showDeleteConfirm = false;
    chatToDeleteId = null;
  }
</script>

<!-- Contenedor Principal de la Página de Chat -->
<div class="chat-page">
  <div class="chat-wrapper">

    <!-- BARRA LATERAL (Conversaciones) -->
    <aside class="chat-sidebar">
      <div class="sidebar-header">
        <h2>Conversations</h2>
        <button class="icon-btn">📝</button>
      </div>

      <div class="search-box">
        <input type="text" placeholder="Search messages..." class="sidebar-search" />
      </div>

      <ul class="conversations-list">
        {#each conversaciones as c}
          <li class:active={charlaSeleccionada?.id === c.id} onclick={() => { 
            charlaSeleccionada = c; 
            mensajes = []; 
            if (socket && authStore.user?.role === 'administrador') {
              socket.emit('get_conversation', c.id);
            } else if (c.id === 'admin_support' || c.id === 1) {
              mensajes = dummyMensajes;
            }
          }}>
            <div class="avatar-wrapper">
              <img src={c.avatar} alt={c.nombre} class="avatar-class" />
              {#if c.activo}
                <span class="status-dot"></span>
              {/if}
            </div>
            <div class="conversation-info">
              <div class="info-top">
                <h4>{c.nombre}</h4>
                <span class="chat-time">{c.hora}</span>
              </div>
              <p class="last-msg">{c.mensaje}</p>
            </div>

            {#if authStore.user?.role === 'administrador'}
              <button class="delete-chat-btn" onclick={(e) => abrirConfirmarBorrado(c.id, e)} title="Delete chat">
                🗑️
              </button>
            {/if}
          </li>
        {/each}
      </ul>

      <!-- Nota del Curador -->
      <div class="curator-note">
        <h4>CONNECTING WITH BRAZIL</h4>
        <p>Connecting you directly to the heart of Brazil. Average response time: 5 minutes during business hours.</p>
      </div>
    </aside>

    <!-- ÁREA PRINCIPAL DE CHAT -->
    <main class="chat-main">
      <!-- Cabecera del Chat -->
      <header class="chat-header">
        {#if charlaSeleccionada}
          <div class="header-user">
            <img src={charlaSeleccionada.avatar} alt={charlaSeleccionada.nombre} class="avatar-sm" />
            <div class="header-status">
              <h3>{charlaSeleccionada.nombre}</h3>
              <span>• Online. Usually responds in 5m</span>
            </div>
          </div>
        {:else}
          <div class="header-user">
            <div class="header-status">
              <h3>No chat selected</h3>
            </div>
          </div>
        {/if}
        <div class="header-actions">
          <button class="icon-btn">ℹ️</button>
          <button class="icon-btn">⋮</button>
        </div>
      </header>

      <!-- ÁREA DE CONTENIDO DINÁMICO -->
      {#if charlaSeleccionada}
        <!-- Contenedor de Mensajes -->
        <div class="messages-container">
          <div class="date-divider"><span>TODAY</span></div>

          {#each mensajes as m}
            <div class="message-row {m.emisor}">
              <div class="message-bubble">
                {#if m.producto}
                  <div class="chat-product-card">
                    <img src={m.producto.imagen} alt={m.producto.nombre} class="prod-img" />
                    <div class="prod-info">
                      <span class="p-brand">COLECTIVO CEARÁ</span>
                      <h4>{m.producto.nombre}</h4>
                      <p>{m.producto.descripcion}</p>
                      <span class="p-price">{m.producto.precio}€</span>
                    </div>
                  </div>
                {/if}
                <p class="msg-text">{m.texto}</p>
                <span class="msg-time">{m.hora}</span>
              </div>
            </div>
          {/each}
        </div>

        <!-- Barra de Entrada de Mensaje -->
        <footer class="chat-footer">
          <form class="input-form" onsubmit={e => { e.preventDefault(); enviarMensaje(); }}>
            <button type="button" class="action-btn">📎</button>
            <input 
              type="text" 
              placeholder="Type a message..." 
              bind:value={nuevoMensaje} 
              class="message-input"
            />
            <button type="button" class="action-btn">😊</button>
            <button type="submit" class="send-btn">
              ➔
            </button>
          </form>
          <div class="security-footer">
            🔒 End-to-end encrypted messages for your security.
          </div>
        </footer>
      {:else}
        <div class="empty-chat-state">
          <div class="empty-icon">💬</div>
          <h3>No chat selected</h3>
          <p>Select a conversation on the left to start.</p>
        </div>
      {/if}
    </main>

  </div>

  <!-- Modal sleek de Confirmación de Borrado -->
  {#if showDeleteConfirm}
    <div class="modal-overlay">
      <div class="modal-content confirm-modal">
        <h3>Delete Conversation</h3>
        <p>Are you sure you want to delete this conversation? This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="cancel-btn" onclick={() => showDeleteConfirm = false}>Cancel</button>
          <button class="submit-btn delete-action-btn" onclick={confirmarBorrado}>Delete</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Pie de Página (Footer de Tienda) -->
  <footer class="shop-footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>Terra Brasilis</h3>
        <p>Bringing the spirit and flavors of Brazil to the world, curated with passion and respect for the land.</p>
      </div>
      
      <div class="footer-links-col">
        <h4>SHOP</h4>
        <ul>
          <li><a href="#products">Catalog</a></li>
          <li><a href="#products">Special Offers</a></li>
          <li><a href="#products">New Items</a></li>
        </ul>
      </div>

      <div class="footer-links-col">
        <h4>COMPANY</h4>
        <ul>
          <li><a href="#products">Sustainability Report</a></li>
          <li><a href="#products">Artisans Directory</a></li>
        </ul>
      </div>

      <div class="footer-links-col">
        <h4>CONNECT</h4>
        <div class="social-icons">
          <span>🌐</span> <span>📧</span> <span>📍</span>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2024 Terra Brasilis Curated Imports. All Rights Reserved.</p>
    </div>
  </footer>
</div>

<style>
  .chat-page {
    font-family: 'Outfit', 'Inter', sans-serif;
    color: #1e293b;
    background-color: #f7f6f2; /* Creamy off-white background */
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .chat-wrapper {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 1.5rem;
    max-width: 1200px;
    width: 100%;
    margin: 2rem auto;
    padding: 0 1rem;
    flex: 1;
    height: 70vh; /* Altura controlada para el panel */
  }

  @media (max-width: 900px) {
    .chat-wrapper {
      grid-template-columns: 1fr;
      height: auto;
    }
  }

  /* SIDEBAR */
  .chat-sidebar {
    background: #ffffff;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    display: flex;
    flex-direction: column;
    border: 1px solid #e2e8f0;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .sidebar-header h2 {
    font-size: 1.15rem;
    font-weight: 800;
    margin: 0;
    color: #033215;
  }

  .sidebar-search {
    width: 100%;
    padding: 0.625rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.825rem;
    background-color: #f8fafc;
    margin-bottom: 1rem;
  }

  .conversations-list {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 1;
    overflow-y: auto;
  }

  .conversations-list li {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
    border-bottom: 1px solid #f1f5f9;
  }

  .conversations-list li.active, .conversations-list li:hover {
    background-color: #f1f5f9;
  }

  .delete-chat-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    color: #ef4444;
    padding: 0.25rem;
    display: none; /* Se muestra por hover */
    align-self: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .delete-chat-btn:hover {
    background-color: #fee2e2;
  }

  .conversations-list li:hover .delete-chat-btn {
    display: block;
  }

  .avatar-wrapper {
    position: relative;
    width: 40px;
    height: 40px;
  }

  .avatar-class {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .status-dot {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    background: #10b981;
    border: 2px solid #ffffff;
    border-radius: 50%;
  }

  .conversation-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .info-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .info-top h4 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: #1e293b;
  }

  .chat-time {
    font-size: 0.65rem;
    color: #94a3b8;
  }

  .last-msg {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0.15rem 0 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  .curator-note {
    background-color: #032a15;
    color: #ffffff;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
  }
  .empty-chat-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #64748b;
    padding: 2rem;
    text-align: center;
    background: #f8fafc;
    flex: 1;
  }
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }
  .empty-chat-state h3 {
    font-size: 1.25rem;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }
  .empty-chat-state p {
    font-size: 0.9rem;
    color: #64748b;
    max-width: 320px;
    margin: 0;
  }

  .curator-note h4 {
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: #bfa075;
    margin-bottom: 0.375rem;
  }

  .curator-note p {
    font-size: 0.7rem;
    line-height: 1.4;
    color: #cbd5e0;
    margin: 0;
  }

  /* ÁREA PRINCIPAL DE CHAT */
  .chat-main {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    border: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
  }

  .header-user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .avatar-sm {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
  }

  .header-status h3 {
    font-size: 0.95rem;
    font-weight: 800;
    margin: 0;
    color: #1e293b;
  }

  .header-status span {
    font-size: 0.70rem;
    color: #10b981;
    font-weight: 600;
  }

  .messages-container {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    background-color: #f8fafc;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .date-divider {
    text-align: center;
    margin: 0.5rem 0;
    position: relative;
  }

  .date-divider span {
    background: #e2e8f0;
    color: #64748b;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.65rem;
    font-weight: 700;
  }

  .message-row {
    display: flex;
    width: 100%;
  }

  .message-row.other {
    justify-content: flex-start;
  }

  .message-row.own {
    justify-content: flex-end;
  }

  .message-bubble {
    max-width: 70%;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    font-size: 0.825rem;
    line-height: 1.5;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .other .message-bubble {
    background-color: #ffffff;
    border-bottom-left-radius: 2px;
    color: #1e293b;
    border: 1px solid #f1f5f9;
  }

  .own .message-bubble {
    background-color: #032a15;
    color: #ffffff;
    border-bottom-right-radius: 2px;
  }

  .msg-time {
    font-size: 0.6rem;
    align-self: flex-end;
    color: #94a3b8;
  }

  .own .msg-time {
    color: #a7f3d0;
  }

  /* Tarjeta Producto Chat */
  .chat-product-card {
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    display: flex;
    gap: 0.75rem;
    width: 100%;
    max-width: 250px;
  }

  .prod-img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 6px;
  }

  .prod-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .p-brand {
    font-size: 0.55rem;
    font-weight: 800;
    color: #bfa075;
  }

  .prod-info h4 {
    margin: 0.15rem 0;
    font-size: 0.75rem;
    font-weight: 700;
    color: #1e293b;
  }

  .prod-info p {
    font-size: 0.65rem;
    color: #64748b;
    margin: 0 0 0.25rem 0;
  }

  .p-price {
    font-size: 0.75rem;
    font-weight: 700;
    color: #b45309;
  }

  /* BARRA DE FOOTER CHAT */
  .chat-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #f1f5f9;
  }

  .input-form {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    background-color: #f1f5f9;
    padding: 0.5rem 1rem;
    border-radius: 24px;
  }

  .message-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.85rem;
    outline: none;
    color: #1e293b;
  }

  .action-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.15rem;
    color: #64748b;
    padding: 0;
  }

  .send-btn {
    background-color: #032a15;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .security-footer {
    text-align: center;
    margin-top: 0.5rem;
    font-size: 0.6rem;
    color: #94a3b8;
  }

  /* Modal Sleek Overlay */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
  }

  .confirm-modal {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 12px;
    width: 90%;
    max-width: 380px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
    text-align: center;
  }

  .confirm-modal h3 {
    margin: 0 0 0.5rem 0;
    color: #dc2626;
    font-size: 1.1rem;
    font-weight: 800;
  }

  .confirm-modal p {
    font-size: 0.825rem;
    color: #64748b;
    margin-bottom: 1.5rem;
  }

  .modal-actions {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }

  .cancel-btn {
    padding: 0.5rem 1rem;
    background: #f1f5f9;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    color: #475569;
    font-size: 0.825rem;
  }

  .delete-action-btn {
    background-color: #dc2626 !important;
  }

  .submit-btn {
    padding: 0.5rem 1rem;
    background: #032a15;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.825rem;
  }

  /* FOOTER TIENDA */
  .shop-footer {
    background-color: #032a15;
    color: #ffffff;
    padding: 3rem 4rem 1.5rem 4rem;
    margin-top: auto;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1.5fr;
    gap: 2rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 1.5rem;
  }

  @media (max-width: 900px) {
    .footer-grid {
      grid-template-columns: 1fr;
    }
  }

  .footer-brand h3 {
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 0.75rem;
  }

  .footer-brand p {
    font-size: 0.75rem;
    color: #94a3b8;
    max-width: 280px;
  }

  .footer-links-col h4 {
    font-size: 0.7rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: #e2e8f0;
  }

  .footer-links-col ul {
    list-style: none;
    padding: 0;
  }

  .footer-links-col li {
    margin-bottom: 0.5rem;
  }

  .footer-links-col a {
    color: #94a3b8;
    font-size: 0.75rem;
    text-decoration: none;
  }

  .social-icons {
    display: flex;
    gap: 0.75rem;
    font-size: 1rem;
  }

  .footer-bottom {
    text-align: center;
    padding-top: 1.5rem;
    font-size: 0.6rem;
    color: #64748b;
  }
</style>
