const mongoose = require('mongoose');

const broadcastTaskSchema = new mongoose.Schema({
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
  destinationChannelId: { type: String, required: true },
  broadcasterAccountId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'], 
    default: 'QUEUED' 
  },
  telegramMessageId: { type: Number },
  errorMessage: { type: String },
  scheduledAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date }
}, { timestamps: true });

broadcastTaskSchema.index({ status: 1, scheduledAt: 1 });
broadcastTaskSchema.index({ linkId: 1 });

module.exports = mongoose.model('BroadcastTask', broadcastTaskSchema);
