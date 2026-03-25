const API_URL = "http://localhost:3000";
let usuarioActual = null;
let token = null;

const mensaje = document.getElementById("mensaje");

// Verificar autenticación al cargar
document.addEventListener("DOMContentLoaded", () => {
    token = localStorage.getItem("token");
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!token || !usuarioGuardado) {
        window.location.href = "auth.html";
        return;
    }

    usuarioActual = JSON.parse(usuarioGuardado);
    cargarPerfil();
    configurarInterfaz();
});

function configurarInterfaz() {
    document.getElementById("display-username").textContent = usuarioActual.username;
    document.getElementById("display-email").textContent = usuarioActual.email;
    document.getElementById("display-role").textContent = usuarioActual.role === 'administrador' ? 'Administrador' : 'Usuario';
    document.getElementById("edit-username").value = usuarioActual.username;

    if (usuarioActual.profilePicture) {
        document.getElementById("current-pic").src = `${API_URL}${usuarioActual.profilePicture}`;
    }

    if (usuarioActual.role === 'administrador') {
        document.getElementById("admin-orders").style.display = "block";
        cargarOrdenesAdmin();
    } else {
        document.getElementById("user-orders").style.display = "block";
        cargarMisOrdenes();
    }
}

async function cargarPerfil() {
    try {
        const res = await fetch(`${API_URL}/auth/perfil`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            usuarioActual = data.usuario;
            localStorage.setItem("usuario", JSON.stringify(usuarioActual));
            configurarInterfaz();
        }
    } catch (err) {
        console.error("Error al cargar perfil:", err);
    }
}

document.getElementById("form-perfil").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("edit-username").value.trim();
    const foto = document.getElementById("edit-foto").files[0];

    const formData = new FormData();
    formData.append("username", username);
    if (foto) {
        formData.append("foto", foto);
    }

    try {
        const res = await fetch(`${API_URL}/auth/perfil`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) throw new Error("Error al actualizar perfil");

        const data = await res.json();
        usuarioActual = data.usuario;
        localStorage.setItem("usuario", JSON.stringify(usuarioActual));
        configurarInterfaz();
        mostrarMensaje("Perfil actualizado correctamente", "ok");
    } catch (err) {
        mostrarMensaje(err.message, "error");
    }
});

async function cargarOrdenesAdmin() {
    try {
        const res = await fetch(`${API_URL}/ordenes`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Error al cargar ordenes");
        const ordenes = await res.json();
        
        const tbody = document.querySelector("#tabla-ordenes tbody");
        tbody.innerHTML = "";

        ordenes.forEach(o => {
            const tr = document.createElement("tr");
            const fecha = new Date(o.createdAt).toLocaleString();
            const productos = o.items.map(i => `${i.productId?.nombre || 'Producto eliminado'} (x${i.quantity})`).join(", ");
            const cliente = o.userId ? `${o.userId.username} (${o.userId.email})` : 'Usuario eliminado';

            tr.innerHTML = `
                <td>${fecha}</td>
                <td>${cliente}</td>
                <td>${productos}</td>
                <td style="font-weight:bold">$${o.totalPrice.toFixed(2)}</td>
                <td><span class="status-pill status-${o.status.toLowerCase()}">${o.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

async function cargarMisOrdenes() {
    try {
        const res = await fetch(`${API_URL}/ordenes/mis-ordenes`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Error al cargar mis ordenes");
        const ordenes = await res.json();
        
        const tbody = document.querySelector("#tabla-mis-ordenes tbody");
        tbody.innerHTML = "";

        ordenes.forEach(o => {
            const tr = document.createElement("tr");
            const fecha = new Date(o.createdAt).toLocaleString();
            const productos = o.items.map(i => `${i.productId?.nombre || 'Producto eliminado'} (x${i.quantity})`).join(", ");

            tr.innerHTML = `
                <td>${fecha}</td>
                <td>${productos}</td>
                <td style="font-weight:bold">$${o.totalPrice.toFixed(2)}</td>
                <td><span class="status-pill status-${o.status.toLowerCase()}">${o.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = "mensaje " + (tipo === 'ok' ? 'success' : 'error');
    mensaje.style.display = "block";
    setTimeout(() => mensaje.style.display = "none", 3000);
}
