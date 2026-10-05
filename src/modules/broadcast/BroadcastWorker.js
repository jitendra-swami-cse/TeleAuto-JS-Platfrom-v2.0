const Link = require("../../models/Link");
const BroadcastTask = require("../../models/BroadcastTask");
const ConfigManager = require("../../core/config/ConfigManager");
const ClientManager = require("../../core/telegram/ClientManager");
const MediaDownloader = require("../media/MediaDownloader");

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
      // Resolve destination channel title from config (for tracking arrays)
      const destChannels = ConfigManager.destinationChannels || [];
      const destConfig = destChannels.find(
        (d) => d.telegramChannelId === task.destinationChannelId,
      );
      const channelTitle = destConfig
        ? destConfig.title || destConfig.telegramChannelId
        : task.destinationChannelId;

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

        // Check mediaId to determine how to send
        if (!link.mediaId || link.mediaId === "noMedia" || link.mediaId.startsWith("download disabled")) {
          // No media or disabled — send text only
          sentMessage = await client.sendMessage(task.destinationChannelId, {
            message: messageText,
          });
        } else if (link.mediaId === "pending" || link.mediaId === "processing") {
          // Media download still queued or in progress — defer this task
          console.log(
            `[BroadcastWorker] ⏳ Media not ready yet (${link.mediaId}) for link ${link._id}. Deferring task ${task._id} by 30s...`,
          );
          task.status = "QUEUED";
          task.startedAt = undefined;
          task.scheduledAt = new Date(Date.now() + 30 * 1000);
          await task.save();
          continue;
        } else if (link.mediaId.startsWith("error - ")) {
          // Media download failed — log warning and fall back to text-only
          console.warn(
            `[BroadcastWorker] ⚠️ Media download FAILED (${link.mediaId}). Sending text-only.`,
          );
          sentMessage = await client.sendMessage(task.destinationChannelId, {
            message: messageText,
          });
        } else {
          // Valid mediaId (timestamp format) — file should be on disk
          const localFilePath = MediaDownloader.getFilePath(link.mediaId);
          if (localFilePath) {
            console.log(
              `[BroadcastWorker] 📎 Sending with media (${link.mediaId}) to ${task.destinationChannelId}...`,
            );
            sentMessage = await client.sendFile(task.destinationChannelId, {
              file: localFilePath,
              caption: messageText,
            });
          } else {
            // File was deleted (cleaned up) — fall back to text
            console.warn(
              `[BroadcastWorker] ⚠️ Media file missing on disk for ${link.mediaId}. Sending text-only.`,
            );
            sentMessage = await client.sendMessage(task.destinationChannelId, {
              message: messageText,
            });
          }
        }


        // Update task on success
        task.status = "COMPLETED";
        task.completedAt = new Date();
        if (sentMessage && sentMessage.id) {
          task.telegramMessageId = sentMessage.id;
        }
        await task.save();

        // Move channel title: remove from pending, add to completed
        await Link.findByIdAndUpdate(task.linkId, {
          $push: { broadcastedOnChannels: channelTitle },
          $pull: { broadcastingTaskCreatedForChannels: channelTitle },
        });

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

        // Move channel title: remove from pending, add to failed
        await Link.findByIdAndUpdate(task.linkId, {
          $push: { broadcastingFailedOnChannels: channelTitle },
          $pull: { broadcastingTaskCreatedForChannels: channelTitle },
        });
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
        link.broadcastStatus = "COMPLETED";
        await link.save();
        console.log(
          `[BroadcastWorker] 📦 Link ${link._id} is now fully ARCHIVED (All broadcasts done).`,
        );
        // Note: Media file cleanup is handled by MediaCleanupWorker based on disk thresholds.
      }
    }
  }
}

module.exports = new BroadcastWorker();
