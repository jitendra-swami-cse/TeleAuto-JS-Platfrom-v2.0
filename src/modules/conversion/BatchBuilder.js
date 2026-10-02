const Link = require("../../models/Link");
const ConversionBatch = require("../../models/ConversionBatch");
const ConfigManager = require("../../core/config/ConfigManager");
const ConverterSender = require("./ConverterSender");

class BatchBuilder {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    // Run periodically based on config (default 15 seconds)
    const intervalMs = (ConfigManager.appConfig.pollInterval || 15) * 1000;
    this.intervalId = setInterval(() => this.run(), intervalMs);
    console.log(
      `[BatchBuilder] 🔄 Started polling for pending links every ${intervalMs / 1000} seconds.`,
    );
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async run() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      await this.buildBatch();
    } catch (err) {
      console.error("[BatchBuilder] ❌ Error:", err.message);
    } finally {
      this.isRunning = false;
    }
  }

  async buildBatch() {
    // 1. Concurrency Lock: Ensure we don't spam the bot with simultaneous batches
    const activeBatch = await ConversionBatch.findOne({
      status: { $in: ["CREATED", "SENT"] },
    });

    if (activeBatch) {
      console.log(
        `[BatchBuilder] 🔄 Active batch already processing. ${activeBatch._id}`,
      );
      return; // Already an active batch being processed, wait.
    }

    const batchSize = ConfigManager.appConfig.batchSize || 10;

    // 2. Batch Size Lock: Do not send partial batches
    const pendingCount = await Link.countDocuments({
      conversionStatus: "PENDING",
    });
    if (pendingCount < batchSize) {
      console.log(
        `[BatchBuilder] 🔄 Pending links are less than batch size. ${pendingCount}/${batchSize}`,
      );
      return;
    }

    // 3. Query Oldest Pending Links (FIFO)
    const pendingLinks = await Link.find({ conversionStatus: "PENDING" })
      .sort({ createdAt: 1 })
      .limit(batchSize);

    if (pendingLinks.length < batchSize) return; // Safety check

    const linkIds = pendingLinks.map((l) => l._id);

    // 4. Update Link States to Prevent Duplicate Batching
    await Link.updateMany(
      { _id: { $in: linkIds } },
      { $set: { conversionStatus: "BATCHED" } },
    );

    // 5. Create Conversion Batch Record
    const batch = await ConversionBatch.create({
      status: "CREATED",
      linkIds: linkIds,
    });

    console.log(`[BatchBuilder] 📦 Created new conversion batch ${batch._id}`);

    // 6. Handoff to Sender
    await ConverterSender.sendBatch(batch, pendingLinks);
  }
}

module.exports = new BatchBuilder();
