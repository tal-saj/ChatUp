const mongoose = require("mongoose");

let isConnected = false;

module.exports = async function connectDB() {
  if (isConnected) return;

  const db = await mongoose.connect(process.env.MONGO_URL);

  isConnected = db.connections[0].readyState === 1;
};
