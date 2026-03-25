const mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/productos").then(async () => {
    const Producto = require('./models/Producto');
    const productos = await Producto.find();
    console.log(productos.map(p => p.nombre));
    process.exit(0);
});
