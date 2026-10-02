const mongoose = require("mongoose");

const conversionBatchSchema = new mongoose.Schema(
  {
    providerId: { type: String, required: false },
    converterAccountId: { type: String, required: false },
    requestMessageId: { type: Number, required: false }, // Telegram message ID sent to bot
    providerResponseMessageId: { type: Number, required: false }, // Response from bot
    status: {
      type: String,
      enum: [
        "CREATED",
        "SENT",
        "FAILED_TO_SEND",
        "FAILED_TO_PARSE",
        "COMPLETED",
      ],
      default: "CREATED",
    },
    linkIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Link" }],
    sentAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// Index for active batch locking mechanism
conversionBatchSchema.index({ status: 1 });

module.exports = mongoose.model("ConversionBatch", conversionBatchSchema);
