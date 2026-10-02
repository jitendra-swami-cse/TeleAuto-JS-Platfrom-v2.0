const mongoose = require('mongoose');

class DatabaseManager {
  async connect() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('[DatabaseManager] MONGODB_URI is not set in .env');
    }

    try {
      await mongoose.connect(uri);
      console.log('[DatabaseManager] Connected to MongoDB successfully.');
    } catch (error) {
      console.error('[DatabaseManager] MongoDB connection error:', error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      console.log('[DatabaseManager] Disconnected from MongoDB.');
    } catch (error) {
      console.error('[DatabaseManager] MongoDB disconnection error:', error.message);
    }
  }
}

module.exports = new DatabaseManager();
