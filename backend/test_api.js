const tokenUser = { email: "admin@gmail.com", password: "admin123" };

async function run() {
  try {
    // 1. Login
    let res = await fetch("http://localhost:3001/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenUser)
    });
    let data = await res.json();
    if (!res.ok) throw new Error("Login fallido: " + JSON.stringify(data));
    const token = data.token;
    console.log("Logged in, token:", token.substring(0, 10) + "...");

    // 2. Create product using native fetch and FormData
    const formData = new FormData();
    formData.append("nombre", "Test Product");
    formData.append("precio", "9.99");
    formData.append("categoria", "Food");
    formData.append("descripcion", "Test description");

    res = await fetch("http://localhost:3001/productos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });
    data = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch(e) {
    console.error(e);
  }
}

run();
