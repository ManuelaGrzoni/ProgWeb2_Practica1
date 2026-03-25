# Proyecto PW2-Practica1

Este proyecto es una aplicación web e-commerce con un Backend en Node.js/Express y un Frontend en Svelte 5.

---

## 📋 Descripción
Una plataforma de comercio electrónico que incluye:
- Autenticación de usuarios y gestión de perfiles.
- Catálogo de productos con gestión administrativa (CRUD).
- Carrito de compras y flujo de Checkout.
- Historial de órdenes y gestión de estados de pedidos.
- Chat de soporte/comunicación.

---

## 🛠️ Requisitos Previos
Antes de comenzar, asegúrate de tener instalado:
- **Node.js**: v18 o superior.
- **MongoDB**: Una instancia local running en `mongodb://127.0.0.1:27017` o una URI de MongoDB Atlas.

---

## 🚀 Instalación y Ejecución

### 📦 Backend
1. **Navega al directorio**:
   ```bash
   cd backend
   ```
2. **Instala las dependencias**:
   ```bash
   npm install
   ```
3. **Configura las variables de entorno**:
   Crea un archivo archivo `.env` en la raíz de `backend/` con el siguiente contenido:
   ```env
   JWT_SECRET=tu_clave_secreta_segura
   PORT=3001
   MONGO_URI=mongodb://127.0.0.1:27017/productos
   ```
4. **Inicia el servidor**:
   ```bash
   npm start
   ```
   *El backend se ejecutará en por defecto en el puerto 3001.*

---

### 💻 Frontend
1. **Navega al directorio**:
   ```bash
   cd frontend
   ```
2. **Instala las dependencias**:
   ```bash
   npm install
   ```
3. **Configura las variables de entorno**:
   Crea un archivo `.env` en la raíz de `frontend/` con el siguiente contenido:
   ```env
   VITE_API_URL=http://localhost:3001
   ```
4. **Inicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   *El frontend se ejecutará y te proporcionará una URL (usualmente `http://localhost:5173`).*

---

## ⚡ Svelte 5 Runes

El proyecto hace uso de las nuevas **Runas** de Svelte 5 para el manejo de estado y reactividad.

### `$state()`
Se utiliza para declarar el estado reactivo local y global.
*   **En Tiendas (Stores)**: `cart.svelte.js` (lista de items) y `auth.svelte.js` (usuario y token).
*   **En Páginas/Componentes**:
    *   `Login.svelte` & `Register.svelte`: Datos de formulario (`email`, `password`, `username`), estados de `loading` y `error`.
    *   `Profile.svelte`: Tabs de navegación (`currentTab`), estados de edición (`isEditing`), listados de admin (`usersList`, `ordersList`).
    *   `Products.svelte`: Lista de `products` provenientes de la API, `searchQuery`, `selectedCategory`.
    *   `Checkout.svelte`: Datos de envío (`shippingAddress`, `phone`), estado de órden completada.
    *   `Chat.svelte`: Lista de conversaciones y mensajes.

### `$derived()`
Se utiliza para valores que dependen directamente de otros estados (computed).
*   **`auth.svelte.js`**: `isAuthenticated` derivado de la presencia de un token.
*   **`Login.svelte` & `Register.svelte`**: `isValid` dependiente de las validaciones de los campos del formulario.
*   **`Profile.svelte`**: `isAdmin` derivado del rol del usuario autenticado (`authStore.user?.role === 'administrador'`).

### `$effect()`
Maneja efectos secundarios como llamadas a la API o sincronización de datos.
*   **`Profile.svelte`**: Utilizado para disparar la carga de usuarios o pedidos cuando el Administrador cambia a la pestaña correspondiente.

### `$props()`
Utilizado para la comunicación entre componentes (paso de propiedades).
*   **`Navbar.svelte`**: Recibe la propiedad `current` para marcar la vista activa.

---

## 🔑 Backend API & Roles

### 👥 Roles de Usuario
1.  **`usuario`**: Rol base. Puede ver productos, gestionar su carrito, realizar pedidos y ver su historial.
2.  **`administrador`**: Acceso total. Gestión de productos, visualización de todos los pedidos y usuarios del sistema.

### 📍 Endpoints Principales

#### 🔐 Autenticación (`/auth`)
*   `POST /auth/registro`: Crea un nuevo usuario.
*   `POST /auth/login`: Autentica y devuelve un JWT.
*   `GET /auth/perfil`: Datos del usuario actual. (`🔒 Requiere Autenticación`)
*   `PUT /auth/perfil`: Actualiza datos y foto de perfil. (`🔒 Requiere Autenticación`)

#### 🛒 Carrito de Compras (`/carrito`)
*(Todos los endpoints requieren Autenticación 🔒)*
*   `GET /`: Obtiene el carrito del usuario.
*   `POST /add`: Añade o incrementa un producto.
*   `PATCH /item/:productId`: Actualiza la cantidad.
*   `DELETE /item/:productId`: Remueve un ítem.

#### 📦 Catálogo de Productos (`/productos`)
*   `GET /`: Listado completo de productos. (`🔓 Público`)
*   `GET /:id`: Detalle del producto. (`🔓 Público`)
*   `POST /`: Crea un nuevo producto. (`👑 Solo Administrador`)
*   `PUT /:id`: Modifica un producto existente. (`👑 Solo Administrador`)
*   `DELETE /:id`: Elimina un producto. (`👑 Solo Administrador`)

#### 🧾 Órdenes de Pedido (`/ordenes`)
*   `GET /mis-ordenes`: Historial propio. (`🔒 Requiere Autenticación`)
*   `POST /`: Registra un pedido tras el Checkout. (`🔒 Requiere Autenticación`)
*   `GET /`: Lista de todas las órdenes del sistema. (`👑 Solo Administrador`)
*   `PATCH /:id/status`: Actualiza el estado (ej. Pendiente -> Enviado). (`👑 Solo Administrador`)
