const fs = require("fs");
const path = require("path");
const Link = require("../../models/Link");
const ConfigManager = require("../../core/config/ConfigManager");

const MEDIA_DIR = path.join(__dirname, "..", "..", "..", "data", "media");

// Helper to pad zeroes
const pad = (num, size) => ("000" + num).slice(size * -1);

// Generate a timestamp-based mediaId from current time
function generateMediaId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1, 2);
  const dd = pad(now.getDate(), 2);
  const HH = pad(now.getHours(), 2);
  const MM = pad(now.getMinutes(), 2);
  const SS = pad(now.getSeconds(), 2);
  return `${yyyy}${mm}${dd}-${HH}${MM}${SS}-001`;
}

class MediaDownloader {
  constructor() {
    this.intervalId = null;

    // Ensure media directory exists
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
      console.log(`[MediaDownloader] Created media directory: ${MEDIA_DIR}`);
    }
  }

  start() {
    if (this.intervalId) return; // Already running
    const intervalMs =
      (ConfigManager.appConfig.pollInterval || 15) * 1000;
    console.log(
      `[MediaDownloader] 🟢 Polling started. Checking every ${intervalMs / 1000}s for pending media.`,
    );
    // Run immediately first, then on interval
    this._runCycle();
    this.intervalId = setInterval(() => this._runCycle(), intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log(`[MediaDownloader] 🔴 Polling stopped.`);
  }

  async _runCycle() {
    try {
      await this._processOnePendingLink();
    } catch (err) {
      console.error("[MediaDownloader] Unexpected error in cycle:", err.message);
    }
  }

  async _processOnePendingLink() {
    // Lazy-require to avoid circular dependency at module load time
    const ClientManager = require("../../core/telegram/ClientManager");

    // Step 5.1: Find links with mediaId = "pending", oldest first (FIFO)
    const pendingLink = await Link.findOne({ mediaId: "pending" }).sort({
      createdAt: 1,
    });

    if (!pendingLink) {
      // Step 5.7: No pending links — self-stop
      console.log(
        "[MediaDownloader] ✅ No pending media links. Stopping poller.",
      );
      this.stop();
      ClientManager.isMediaDownloader = "stopped";
      return;
    }

    // Step 5.2: Mark this link's entire message group as "processing"
    // All links from the same message share one media file — download it once
    await Link.updateMany(
      {
        telegramMessageId: pendingLink.telegramMessageId,
        sourceChannelId: pendingLink.sourceChannelId,
        mediaId: "pending",
      },
      { $set: { mediaId: "processing" } },
    );

    console.log(
      `[MediaDownloader] ⬇️ Processing media for message ${pendingLink.telegramMessageId} (source: ${pendingLink.sourceChannelId})...`,
    );

    // Step 5.3 & 5.4: Find the right account and client for this source channel
    const sourceChannels = ConfigManager.sourceChannels || [];
    const channelConfig = sourceChannels.find(
      (ch) => ch.telegramChannelId === pendingLink.sourceChannelId,
    );

    let client = null;
    if (channelConfig && channelConfig.ownerAccountId) {
      client = ClientManager.getClient(channelConfig.ownerAccountId);
    }

    // Fallback: use the first available connected client
    if (!client) {
      const allClients = [...ClientManager.clients.values()];
      client = allClients[0] || null;
    }

    if (!client) {
      const errMsg = "No connected Telegram client available for download";
      console.error(`[MediaDownloader] ❌ ${errMsg}`);
      await this._markGroupFailed(
        pendingLink.telegramMessageId,
        pendingLink.sourceChannelId,
        errMsg,
      );
      return;
    }

    // Step 5.5: Download the media using the correct client
    const mediaId = generateMediaId();
    try {
      // Fetch the full message to get the media object
      const messages = await client.getMessages(pendingLink.sourceChannelId, {
        ids: [pendingLink.telegramMessageId],
      });

      const fullMessage = messages && messages[0];
      if (!fullMessage || !fullMessage.media) {
        const errMsg = "Message or media not found when fetching for download";
        console.warn(`[MediaDownloader] ⚠️ ${errMsg}`);
        await this._markGroupFailed(
          pendingLink.telegramMessageId,
          pendingLink.sourceChannelId,
          errMsg,
        );
        return;
      }

      const ext = this._getExtension(fullMessage.media);
      const filePath = path.join(MEDIA_DIR, `${mediaId}${ext}`);

      const buffer = await client.downloadMedia(fullMessage.media, {
        workers: 1,
      });

      if (!buffer) {
        const errMsg = "Download returned no data (unsupported or empty)";
        console.warn(`[MediaDownloader] ⚠️ ${errMsg} for ${mediaId}`);
        await this._markGroupFailed(
          pendingLink.telegramMessageId,
          pendingLink.sourceChannelId,
          errMsg,
        );
        return;
      }

      fs.writeFileSync(filePath, buffer);
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      console.log(
        `[MediaDownloader] ✅ Downloaded: ${mediaId}${ext} (${sizeMB} MB)`,
      );

      // Success: update all links in this message group with the real mediaId
      await Link.updateMany(
        {
          telegramMessageId: pendingLink.telegramMessageId,
          sourceChannelId: pendingLink.sourceChannelId,
          mediaId: "processing",
        },
        { $set: { mediaId: mediaId } },
      );
    } catch (err) {
      console.error(
        `[MediaDownloader] ❌ Download failed for message ${pendingLink.telegramMessageId}:`,
        err.message,
      );
      await this._markGroupFailed(
        pendingLink.telegramMessageId,
        pendingLink.sourceChannelId,
        err.message,
      );
    }
  }

  // Mark all links in a message group as failed
  async _markGroupFailed(telegramMessageId, sourceChannelId, errorMessage) {
    const safeMsg = errorMessage.replace(/[\r\n]/g, " ").slice(0, 200);
    await Link.updateMany(
      {
        telegramMessageId: telegramMessageId,
        sourceChannelId: sourceChannelId,
        mediaId: "processing",
      },
      { $set: { mediaId: `error - ${safeMsg}` } },
    );
    console.error(
      `[MediaDownloader] ❌ Group marked as FAILED: ${safeMsg}`,
    );
  }

  // Determines the appropriate file extension from Telegram media type
  _getExtension(media) {
    const className = media.className || "";
    if (className === "MessageMediaDocument") {
      const doc = media.document;
      if (doc && doc.mimeType) {
        const mimeMap = {
          "video/mp4": ".mp4",
          "video/x-matroska": ".mkv",
          "video/webm": ".webm",
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/gif": ".gif",
          "image/webp": ".webp",
          "audio/mpeg": ".mp3",
          "audio/ogg": ".ogg",
        };
        return mimeMap[doc.mimeType] || ".bin";
      }
    } else if (className === "MessageMediaPhoto") {
      return ".jpg";
    }
    return ".bin";
  }

  // Resolves the file path for an existing mediaId (used by BroadcastWorker)
  getFilePath(mediaId) {
    const extensions = [
      ".mp4", ".mkv", ".webm", ".jpg", ".jpeg",
      ".png", ".gif", ".webp", ".mp3", ".ogg", ".bin",
    ];
    for (const ext of extensions) {
      const filePath = path.join(MEDIA_DIR, `${mediaId}${ext}`);
      if (fs.existsSync(filePath)) return filePath;
    }
    return null;
  }
}

module.exports = new MediaDownloader();
