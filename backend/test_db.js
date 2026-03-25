const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/productos';

console.log('Testing connection to:', MONGO_URI);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Success: Connected to MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failure: Could not connect to MongoDB:', err);
    process.exit(1);
  });

setTimeout(() => {
  console.log('⏳ Timeout: Connection taking too long...');
  process.exit(1);
}, 10000);
