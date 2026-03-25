const mongoose = require('mongoose');
const mongoURI = "mongodb://127.0.0.1:27017/productos";

async function run() {
  try {
    await mongoose.connect(mongoURI);
    console.log("Conectado a MongoDB");
    
    // Define minimal schema to read roles
    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      role: String
    });
    
    // Check models
    let Usuario;
    try {
       Usuario = mongoose.model('Usuario');
    } catch {
       Usuario = mongoose.model('Usuario', userSchema, 'usuarios'); 
    }
    
    const users = await Usuario.find({});
    console.log(JSON.stringify(users, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
