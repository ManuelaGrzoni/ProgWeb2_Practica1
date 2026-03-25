const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://localhost:27017/productos';

async function test() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected');

    const Mensaje = mongoose.model('Mensaje', new mongoose.Schema({
      text: String,
      username: String,
      roomId: String,
      visto: Boolean,
      timestamp: Date,
      userId: mongoose.Schema.Types.ObjectId
    }));

    const socketUsername = 'Luispe'; // Mocking an admin name

    const list = await Mensaje.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$roomId",
          lastMessage: { $first: "$text" },
          lastTimestamp: { $first: "$timestamp" },
          messages: { $push: { username: "$username", userId: "$userId", visto: "$visto" } },
          unreadCount: { 
            $sum: { 
              $cond: [
                { $and: [{ $eq: ["$visto", false] }, { $ne: ["$username", socketUsername] }] }, 
                1, 
                0
              ] 
            } 
          }
        }
      },
      { $sort: { lastTimestamp: -1 } }
    ]);

    console.log('Result length:', list.length);
    if (list.length > 0) {
      console.log('Sample item:', JSON.stringify(list[0], null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
