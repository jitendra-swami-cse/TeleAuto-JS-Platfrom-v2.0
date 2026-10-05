const Link = require('../../models/Link');
const BroadcastTask = require('../../models/BroadcastTask');
const ConfigManager = require('../../core/config/ConfigManager');

class BroadcastTaskCreator {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    const intervalMs = (ConfigManager.appConfig.pollInterval || 15) * 1000;
    this.intervalId = setInterval(() => this.run(), intervalMs);
    console.log(`[BroadcastTaskCreator] Started polling for COMPLETED links every ${intervalMs / 1000} seconds.`);
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
      await this.createTasks();
    } catch (err) {
      console.error("[BroadcastTaskCreator] Error:", err.message);
    } finally {
      this.isRunning = false;
    }
  }

  async createTasks() {
    // Find Links that have been converted successfully but have no broadcast tasks yet
    const pendingLinks = await Link.find({ 
      conversionStatus: 'COMPLETED', 
      broadcastStatus: 'NOT_CREATED' 
    }).limit(50); // Process in chunks

    if (pendingLinks.length === 0) return;

    const destinationChannels = ConfigManager.destinationChannels || [];
    if (destinationChannels.length === 0) {
      console.log("[BroadcastTaskCreator] No destination channels configured. Cannot create tasks.");
      return;
    }

    const broadcastAccounts = ConfigManager.getEnabledAccounts().filter(a => a.broadcastingEnabled);
    if (broadcastAccounts.length === 0) {
      console.log("[BroadcastTaskCreator] No accounts with broadcastingEnabled=true found.");
      return;
    }

    for (const link of pendingLinks) {
      console.log(`[BroadcastTaskCreator] Creating separate broadcast tasks for Link ${link._id}...`);
      
      const allSourceChannels = ConfigManager.sourceChannels || [];
      const sourceChannelConfig = allSourceChannels.find(
        sc => sc.telegramChannelId === link.sourceChannelId
      );

      let allowedDestinationChannels = destinationChannels;
      if (
        sourceChannelConfig &&
        sourceChannelConfig.broadcastTo &&
        sourceChannelConfig.broadcastTo.length > 0
      ) {
        allowedDestinationChannels = destinationChannels.filter(dest =>
          sourceChannelConfig.broadcastTo.includes(dest.telegramChannelId)
        );
      }

      if (allowedDestinationChannels.length === 0) {
         console.log(`[BroadcastTaskCreator] No allowed destination channels for Link ${link._id} (source ${link.sourceChannelId}). Marking broadcast as COMPLETED.`);
         link.broadcastStatus = 'COMPLETED';
         await link.save();
         continue;
      }

      const tasksToCreate = [];
      for (const dest of allowedDestinationChannels) {
        // Assign the correct owner account, or fallback to the first enabled broadcast account
        const accountId = dest.ownerAccountId || broadcastAccounts[0]._id;
        
        tasksToCreate.push({
          linkId: link._id,
          destinationChannelId: dest.telegramChannelId,
          broadcasterAccountId: accountId,
          status: 'QUEUED'
        });
      }

      if (tasksToCreate.length > 0) {
        await BroadcastTask.insertMany(tasksToCreate);
        
        // Track which channel titles tasks were created for
        const channelTitles = allowedDestinationChannels.map(d => d.title || d.telegramChannelId);
        link.broadcastStatus = 'TASKS_CREATED';
        link.broadcastingTaskCreatedForChannels = channelTitles;
        await link.save();
        console.log(`[BroadcastTaskCreator] Created ${tasksToCreate.length} tasks for Link ${link._id}.`);
      }
    }
  }
}

module.exports = new BroadcastTaskCreator();
