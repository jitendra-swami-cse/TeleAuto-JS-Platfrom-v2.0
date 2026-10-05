const ConfigManager = require("../../core/config/ConfigManager");
const ClientManager = require("../../core/telegram/ClientManager");
const Message = require("../../models/Message");
const MonitoringModule = require("../monitoring/MonitoringModule");

class HistorySyncModule {
  async syncAll() {
    console.log("\n[HistorySync] 🔄 Starting Phase 6: History Sync...");

    // Global toggle check
    if (ConfigManager.appConfig.historySyncEnabled === false) {
      console.log("[HistorySync] ⏭️ Global history sync is disabled in config.json. Skipping.");
      return;
    }

    const sourceChannels = ConfigManager.sourceChannels || [];
    
    // Process channels strictly one by one
    for (const channel of sourceChannels) {
      await this.syncChannel(channel);
    }

    console.log("[HistorySync] ✅ All source channels synced successfully.\n");
  }

  async syncChannel(channel) {
    const channelName = channel.title || channel.telegramChannelUsername || channel.telegramChannelId;
    
    // Per-channel toggle check
    if (channel.historySyncEnabled === false) {
      console.log(`[HistorySync] ⏭️ Skipping [${channelName}] (disabled in source-channels.json).`);
      return;
    }

    const client = ClientManager.getClient(channel.ownerAccountId);
    if (!client) {
      console.warn(`[HistorySync] ⚠️ No connected client found for [${channelName}] (Account: ${channel.ownerAccountId}). Skipping.`);
      return;
    }

    // Determine the hard limit for this channel
    const limit = channel.historySyncLimit || ConfigManager.appConfig.historySyncDefaultLimit || 100;

    // Find the latest message we have in the database for this channel
    const lastDbMessage = await Message.findOne({ sourceChannelId: channel.telegramChannelId })
      .sort({ telegramMessageId: -1 })
      .lean();

    const stopMessageId = lastDbMessage ? lastDbMessage.telegramMessageId : 0;
    
    console.log(`[HistorySync] ⏳ Syncing [${channelName}] | Limit: ${limit} | Stop ID: ${stopMessageId > 0 ? stopMessageId : "None (New Channel)"}`);

    let fetchedMessages = [];
    let currentOffsetId = 0;
    let totalFetched = 0;
    let reachedStopCondition = false;

    // Fetch messages from Telegram (newest to oldest)
    while (!reachedStopCondition && totalFetched < limit) {
      const fetchCount = Math.min(100, limit - totalFetched); // Max 100 per request
      
      try {
        const history = await client.getMessages(channel.telegramChannelId, {
          limit: fetchCount,
          offsetId: currentOffsetId,
        });

        if (!history || history.length === 0) {
          break; // No more messages in channel
        }

        for (const msg of history) {
          // Check stop condition (we've reached messages we already have)
          if (msg.id <= stopMessageId) {
            reachedStopCondition = true;
            break;
          }

          // We only care about normal messages (skip service messages like 'pinned a message')
          if (msg.className === 'Message') {
             fetchedMessages.push(msg);
          }
          currentOffsetId = msg.id; // prepare offset for next chunk if needed
        }

        totalFetched += history.length;
        
      } catch (error) {
        console.error(`[HistorySync] ❌ Error fetching history for [${channelName}]:`, error.message);
        break; // Stop fetching on error, but we'll still process what we managed to get
      }
    }

    if (fetchedMessages.length === 0) {
      console.log(`[HistorySync] ✨ [${channelName}] is already up to date.`);
      return;
    }

    console.log(`[HistorySync] 📥 Downloaded ${fetchedMessages.length} new historical messages for [${channelName}]. Processing chronologically...`);

    // Reverse the array so we process them Oldest -> Newest (Chronological order)
    fetchedMessages.reverse();

    // Process them through the standard MonitoringModule sequentially
    let processedCount = 0;
    for (const msg of fetchedMessages) {
      await MonitoringModule.processMessage(msg, channel.ownerAccountId, channel);
      processedCount++;
    }

    console.log(`[HistorySync] ✅ Finished integrating ${processedCount} historical messages for [${channelName}].`);
  }
}

module.exports = new HistorySyncModule();
