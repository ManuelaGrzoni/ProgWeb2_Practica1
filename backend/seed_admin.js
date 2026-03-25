const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mongoURI = "mongodb://127.0.0.1:27017/productos";

async function run() {
  try {
    await mongoose.connect(mongoURI);
    console.log("Conectado a MongoDB para seeding");
    
    // Check if model already exists
    let Usuario;
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, default: 'usuario' },
      phone: { type: String, default: '' },
      profilePicture: { type: String, default: '' }
    });
    
    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    try {
       Usuario = mongoose.model('Usuario');
    } catch {
       Usuario = mongoose.model('Usuario', userSchema, 'usuarios'); 
    }
    
    // Delete if exists
    await Usuario.deleteOne({ email: "admin@gmail.com" });
    
    const admin = new Usuario({
      username: "Admin Test",
      email: "admin@gmail.com",
      password: hashedPassword,
      role: "administrador",
      phone: "+55 11 99999-9999"
    });
    
    await admin.save();
    console.log("Admin creado con éxito: admin@gmail.com / admin123");
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
