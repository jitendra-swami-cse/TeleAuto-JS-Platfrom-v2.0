const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  sourceChannelId: { type: String, required: true },
  sourceChannelTitle: { type: String },
  telegramMessageId: { type: Number, required: true },
  originalUrl: { type: String, required: true },
  normalizedUrl: { type: String, required: true, unique: true },
  providerId: { type: String, required: true },
  convertedUrl: { type: String },
  mediaId: { type: String, default: 'noMedia' },
  // mediaId encodes state:
  //   "noMedia"            = message had no media
  //   "pending"            = queued for download
  //   "processing"         = download in progress
  //   "error - <message>"  = download failed
  //   "YYYYMMDD-HHMMSS-001" = downloaded successfully
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
  },
  broadcastingTaskCreatedForChannels: { type: [String], default: [] }, // channel titles for which tasks were created
  broadcastedOnChannels: { type: [String], default: [] },              // channel titles successfully broadcasted
  broadcastingFailedOnChannels: { type: [String], default: [] }        // channel titles where broadcast failed
}, { timestamps: true });

linkSchema.index({ conversionStatus: 1, createdAt: 1 });
linkSchema.index({ broadcastStatus: 1 });
linkSchema.index({ sourceChannelId: 1 });

module.exports = mongoose.model('Link', linkSchema);
