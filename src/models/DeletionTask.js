const mongoose = require('mongoose');

const deletionTaskSchema = new mongoose.Schema({
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
  broadcastTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'BroadcastTask', required: true },
  destinationChannelId: { type: String, required: true },
  broadcasterAccountId: { type: String, required: true },
  messageIdToDelete: { type: Number, required: true },
  deleteAfter: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'COMPLETED', 'FAILED'], 
    default: 'PENDING' 
  },
  errorMessage: { type: String }
}, { timestamps: true });

deletionTaskSchema.index({ status: 1, deleteAfter: 1 });

module.exports = mongoose.model('DeletionTask', deletionTaskSchema);
