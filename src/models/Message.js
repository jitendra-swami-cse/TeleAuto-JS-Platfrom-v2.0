const mongoose = require("mongoose");
const ConfigManager = require("../core/config/ConfigManager");
// const ConfigManager = require('../../core/config/ConfigManager');

// Fallback to 1000 if not in config
const cacheLimit = ConfigManager.getAppConfig().messageCacheLimit || 1000;

const messageSchema = new mongoose.Schema(
  {
    telegramMessageId: { type: Number, required: true },
    sourceChannelId: { type: String, required: true },
    messageBody: { type: String, default: "" },
    extractedLinks: [{ type: String }],
    mediaId: { type: String, default: "noMedia" },
    receivedAt: { type: Date, default: Date.now },
  },
  {
    // Use a capped collection to enforce maximum messages limit (size limit approx 50MB)
    capped: { size: 52428800, max: cacheLimit },
  },
);

messageSchema.index({ sourceChannelId: 1 });
messageSchema.index({ receivedAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
