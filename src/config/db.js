const mongoose = require("mongoose");

let connectionPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  connectionPromise = mongoose
    .connect(databaseUrl, { bufferCommands: false })
    .then(() => mongoose.connection)
    .catch((error) => {
      connectionPromise = undefined;
      throw error;
    });

  return connectionPromise;
}

module.exports = connectDatabase;
