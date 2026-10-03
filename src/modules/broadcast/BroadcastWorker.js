const Link = require("../../models/Link");
const BroadcastTask = require("../../models/BroadcastTask");
const ConfigManager = require("../../core/config/ConfigManager");
const ClientManager = require("../../core/telegram/ClientManager");

class BroadcastWorker {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    const intervalMs = (ConfigManager.appConfig.pollInterval || 15) * 1000;
    this.intervalId = setInterval(() => this.run(), intervalMs);
    console.log(
      `[BroadcastWorker] Started polling for QUEUED tasks every ${intervalMs / 1000} seconds.`,
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
      await this.processTasks();
    } catch (err) {
      console.error("[BroadcastWorker] Error:", err.message);
    } finally {
      this.isRunning = false;
    }
  }

  async processTasks() {
    // Find QUEUED tasks that are ready to run
    const tasks = await BroadcastTask.find({
      status: "QUEUED",
      scheduledAt: { $lte: new Date() },
    }).limit(10); // Process a few at a time to respect Telegram rate limits

    if (tasks.length === 0) return;

    for (const task of tasks) {
      // Mark as processing
      task.status = "PROCESSING";
      task.startedAt = new Date();
      await task.save();

      try {
        const link = await Link.findById(task.linkId);
        if (!link) throw new Error(`Link ${task.linkId} not found`);

        const client = ClientManager.getClient(task.broadcasterAccountId);
        if (!client)
          throw new Error(
            `Client for account ${task.broadcasterAccountId} not found or disconnected`,
          );

        // Prepare message content per individual link
        const urlToSend = link.convertedUrl;
        const messageText = `${urlToSend}\n\nHow to watch video @how_to_watch\nPlease Join our Backup Channel @kaliya`;

        console.log(
          `[BroadcastWorker] Broadcasting task ${task._id} to ${task.destinationChannelId}...`,
        );

        let sentMessage;

        // Handle Media Attachment (Phase 4 logic placeholder, currently logs but sends text only)
        if (link.mediaId && link.mediaId !== "noMedia") {
          console.log(
            `[BroadcastWorker] Note: Link has media attached (Media ID: ${link.mediaId}). Media sending logic will be completed in Phase 4.`,
          );
          // Send text-only for now until Phase 4 implements local file storage downloading/uploading
          sentMessage = await client.sendMessage(task.destinationChannelId, {
            message: messageText,
          });
        } else {
          // Text only
          sentMessage = await client.sendMessage(task.destinationChannelId, {
            message: messageText,
          });
        }

        // Update task on success
        task.status = "COMPLETED";
        task.completedAt = new Date();
        if (sentMessage && sentMessage.id) {
          task.telegramMessageId = sentMessage.id;
        }
        await task.save();
        console.log(
          `[BroadcastWorker] ✅ Broadcast task ${task._id} completed successfully.`,
        );
      } catch (error) {
        console.error(
          `[BroadcastWorker] ❌ Failed to broadcast task ${task._id}:`,
          error.message,
        );
        task.status = "FAILED";
        task.errorMessage = error.message;
        task.completedAt = new Date();
        await task.save();
      }

      // Ensure we archive the link when all tasks finish
      await this.checkLinkArchival(task.linkId);
    }
  }

  async checkLinkArchival(linkId) {
    const allTasks = await BroadcastTask.find({ linkId: linkId });
    const isCompleted = allTasks.every(
      (t) => t.status === "COMPLETED" || t.status === "FAILED",
    );

    // Only archive if all tasks are processed (no QUEUED or PROCESSING)
    if (isCompleted && allTasks.length > 0) {
      const link = await Link.findById(linkId);
      if (link && link.broadcastStatus !== "COMPLETED") {
        link.broadcastStatus = "COMPLETED"; // 'COMPLETED' is the archival state in broadcastStatus
        await link.save();
        console.log(
          `[BroadcastWorker] 📦 Link ${link._id} is now fully ARCHIVED (All broadcasts done).`,
        );
      }
    }
  }
}

module.exports = new BroadcastWorker();
