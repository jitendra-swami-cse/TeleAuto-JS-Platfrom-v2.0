const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  sourceChannelId: { type: String, required: true },
  sourceChannelTitle: { type: String },
  telegramMessageId: { type: Number, required: true },
  originalUrl: { type: String, required: true },
  normalizedUrl: { type: String, required: true, unique: true },
  convertedUrl: { type: String },
  mediaId: { type: String, default: 'noMedia' },
  conversionBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConversionBatch' },
  conversionStatus: { 
    type: String, 
    enum: ['PENDING', 'BATCHED', 'BATCH_SENT', 'COMPLETED', 'FAILED'], 
    default: 'PENDING' 
  },
  broadcastStatus: { 
    type: String, 
    enum: ['NOT_CREATED', 'TASKS_CREATED', 'BROADCASTING', 'COMPLETED', 'FAILED'], 
    default: 'NOT_CREATED' 
  }
}, { timestamps: true });

linkSchema.index({ conversionStatus: 1, createdAt: 1 });
linkSchema.index({ broadcastStatus: 1 });
linkSchema.index({ sourceChannelId: 1 });

module.exports = mongoose.model('Link', linkSchema);
