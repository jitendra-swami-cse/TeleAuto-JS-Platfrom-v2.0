const DeletionTask = require("../../models/DeletionTask");
const ClientManager = require("../../core/telegram/ClientManager");
const ConfigManager = require("../../core/config/ConfigManager");

class DeletionWorker {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    const intervalMinutes = ConfigManager.appConfig.autoDeletionCheckIntervalMinutes || 60;
    const intervalMs = intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => this.run(), intervalMs);
    console.log(`[DeletionWorker] Started polling for PENDING deletions every ${intervalMinutes} minute(s).`);
    // Run immediately on start
    setTimeout(() => this.run(), 5000);
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
      console.error("[DeletionWorker] Error:", err.message);
    } finally {
      this.isRunning = false;
    }
  }

  async processTasks() {
    const tasks = await DeletionTask.find({
      status: "PENDING",
      deleteAfter: { $lte: new Date() }
    }).limit(50);

    if (tasks.length === 0) return;
    
    console.log(`[DeletionWorker] Found ${tasks.length} message(s) ready for auto-deletion.`);

    for (const task of tasks) {
      try {
        const client = ClientManager.getClient(task.broadcasterAccountId);
        if (!client) {
           throw new Error(`Client for account ${task.broadcasterAccountId} not found or disconnected.`);
        }

        // Send deletion request to Telegram API
        await client.deleteMessages(task.destinationChannelId, [task.messageIdToDelete], { revoke: true });

        // Update task on success
        task.status = "COMPLETED";
        await task.save();
        console.log(`[DeletionWorker] ✅ Successfully deleted message ${task.messageIdToDelete} in channel ${task.destinationChannelId}.`);

      } catch (error) {
        console.error(`[DeletionWorker] ❌ Failed to delete message ${task.messageIdToDelete} for task ${task._id}:`, error.message);
        task.status = "FAILED";
        task.errorMessage = error.message;
        await task.save();
      }
    }
  }
}

module.exports = new DeletionWorker();
