const LinkExtractor = require("./LinkExtractor");
const URLNormalizer = require("./URLNormalizer");
const Message = require("../../models/Message");
const Link = require("../../models/Link");
const ClientManager = require("../../core/telegram/ClientManager");

class MonitoringModule {
  async processMessage(message, accountId, sourceChannel) {
    const channelName =
      sourceChannel &&
      (sourceChannel.telegramChannelUsername ||
        sourceChannel.title ||
        sourceChannel.telegramChannelId);
    console.log(
      `\n[MonitoringModule][Account: ${accountId}] 📩 New Message Detected from [${channelName || "Unknown Source Channel"}]!`,
    );

    const messageText = message.message || "";
    const extractedUrls = LinkExtractor.extractLinks(messageText);

    if (extractedUrls.length === 0) {
      console.log(
        `[MonitoringModule] No links found in message ${message.id}. Ignoring.`,
      );
      console.log(`----------------------------------------------------`);
      return;
    }

    // Determine mediaId initial value
    // If media present: "pending" (queued for sequential download)
    // If no media:      "noMedia"
    const hasMedia = !!(message.media && message.date);
    const mediaId = hasMedia ? "pending" : "noMedia";

    // Standardize sourceChannelId prefixing
    let sourceChannelId = "";
    if (message.peerId) {
      if (message.peerId.className === "PeerChannel") {
        sourceChannelId = message.peerId.channelId.toString();
        if (!sourceChannelId.startsWith("-100")) {
          sourceChannelId = `-100${sourceChannelId}`;
        }
      } else if (message.peerId.className === "PeerChat") {
        sourceChannelId = message.peerId.chatId.toString();
      } else if (message.peerId.className === "PeerUser") {
        sourceChannelId = message.peerId.userId.toString();
      }
    }

    const sourceChannelTitle = message.chat
      ? message.chat.title || "Unknown"
      : "Unknown";

    // Store the raw message record
    try {
      await Message.create({
        telegramMessageId: message.id,
        sourceChannelId: sourceChannelId,
        messageBody: messageText,
        extractedLinks: extractedUrls,
        mediaId: mediaId,
        receivedAt: message.date ? new Date(message.date * 1000) : new Date(),
      });
      console.log(`[MonitoringModule] Message ${message.id} cached to database.`);
    } catch (error) {
      console.error(
        `[MonitoringModule] Error caching message ${message.id}:`,
        error.message,
      );
    }

    // Create Link records with correct initial mediaId
    for (const rawUrl of extractedUrls) {
      const normalizedUrl = URLNormalizer.normalize(rawUrl);
      if (!normalizedUrl) continue;

      try {
        await Link.create({
          sourceChannelId: sourceChannelId,
          sourceChannelTitle: sourceChannelTitle,
          telegramMessageId: message.id,
          originalUrl: rawUrl,
          normalizedUrl: normalizedUrl,
          mediaId: mediaId,
        });
        console.log(
          `[MonitoringModule] ✅ Link created: ${normalizedUrl} (media: ${mediaId})`,
        );
      } catch (error) {
        if (error.code === 11000) {
          console.log(
            `[MonitoringModule] ⚠️ Duplicate Link Detected: ${normalizedUrl}`,
          );
        } else {
          console.error(
            `[MonitoringModule] Error saving link ${normalizedUrl}:`,
            error.message,
          );
        }
      }
    }

    // If media present, ensure the sequential MediaDownloader is running
    if (hasMedia) {
      if (ClientManager.isMediaDownloader === "stopped") {
        console.log(
          `[MonitoringModule] 🎬 Starting MediaDownloader polling for pending media...`,
        );
        ClientManager.startMediaDownloader();
      } else {
        console.log(
          `[MonitoringModule] 🎬 MediaDownloader already running, pending media queued.`,
        );
      }
    }

    console.log(`----------------------------------------------------`);
  }
}

module.exports = new MonitoringModule();
