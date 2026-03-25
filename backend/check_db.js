const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/productos";

mongoose.connect(mongoURI).then(async () => {
    const Producto = require('./models/Producto');
    const productos = await Producto.find();
    console.log(JSON.stringify(productos, null, 2));
    process.exit(0);
}).catch(console.error);
