async function run() {
  try {
    const res = await fetch("http://localhost:3001/productos");
    const data = await res.json();
    console.log("STATUS:", res.status);
    console.log("DATA LENGTH:", data.length);
  } catch(e) {
    console.error(e);
  }
}
run();
