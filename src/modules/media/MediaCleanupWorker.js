const fs = require("fs");
const path = require("path");
const Link = require("../../models/Link");
const ConfigManager = require("../../core/config/ConfigManager");

const MEDIA_DIR = path.join(__dirname, "..", "..", "..", "data", "media");

// Thresholds
const MAX_FILE_COUNT = 1000;
const MAX_TOTAL_SIZE_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

class MediaCleanupWorker {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    // Run every 5 minutes
    const intervalMs = 5 * 60 * 1000;
    this.intervalId = setInterval(() => this.run(), intervalMs);
    console.log("[MediaCleanupWorker] Started. Checking every 5 minutes.");
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
      await this.cleanup();
    } catch (err) {
      console.error("[MediaCleanupWorker] Error during cleanup:", err.message);
    } finally {
      this.isRunning = false;
    }
  }

  async cleanup() {
    if (!fs.existsSync(MEDIA_DIR)) return;

    // Step 1: Scan all files in the media directory
    const allFiles = fs.readdirSync(MEDIA_DIR).map((fileName) => {
      const filePath = path.join(MEDIA_DIR, fileName);
      const stats = fs.statSync(filePath);
      return { fileName, filePath, size: stats.size };
    });

    if (allFiles.length === 0) return;

    const totalCount = allFiles.length;
    const totalSizeBytes = allFiles.reduce((acc, f) => acc + f.size, 0);
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(1);

    console.log(
      `[MediaCleanupWorker] 📊 Media stats: ${totalCount} files, ${totalSizeMB} MB total.`,
    );

    // Step 2: Check if either threshold is exceeded
    const countExceeded = totalCount > MAX_FILE_COUNT;
    const sizeExceeded = totalSizeBytes > MAX_TOTAL_SIZE_BYTES;

    if (!countExceeded && !sizeExceeded) {
      console.log(
        `[MediaCleanupWorker] ✅ Within limits (count: ${totalCount}/${MAX_FILE_COUNT}, size: ${totalSizeMB} MB / 1024 MB). No cleanup needed.`,
      );
      return;
    }

    console.log(
      `[MediaCleanupWorker] ⚠️ Threshold exceeded (count: ${countExceeded}, size: ${sizeExceeded}). Starting FIFO cleanup...`,
    );

    // Step 3: Get mediaIds of ARCHIVED links with a successfully downloaded file
    // Exclude state-encoding values: noMedia, pending, processing, error - ...
    const archivedLinks = await Link.find(
      {
        broadcastStatus: "COMPLETED",
        mediaId: {
          $nin: ["noMedia", "pending", "processing"],
          $not: /^error - /,
        },
      },
      { mediaId: 1 }
    ).lean();

    if (archivedLinks.length === 0) {
      console.log(
        "[MediaCleanupWorker] No archived links with media found. Skipping cleanup.",
      );
      return;
    }

    const archivedMediaIds = new Set(archivedLinks.map((l) => l.mediaId));

    // Step 4: Filter files to only those belonging to archived links
    // File names are like: 20261001-143015-001.mp4 — the mediaId is the name without extension
    const deletableFiles = allFiles
      .filter((f) => {
        const mediaId = path.parse(f.fileName).name; // strip extension
        return archivedMediaIds.has(mediaId);
      })
      .sort((a, b) => a.fileName.localeCompare(b.fileName)); // FIFO: oldest timestamp first

    if (deletableFiles.length === 0) {
      console.log(
        "[MediaCleanupWorker] No deletable archived media files found. Non-archived files are protected.",
      );
      return;
    }

    // Step 5: Delete oldest files until BOTH conditions are satisfied
    let currentCount = totalCount;
    let currentSize = totalSizeBytes;
    let deletedCount = 0;

    for (const file of deletableFiles) {
      // Stop once we are back under BOTH thresholds
      if (currentCount <= MAX_FILE_COUNT && currentSize <= MAX_TOTAL_SIZE_BYTES) break;

      try {
        fs.unlinkSync(file.filePath);
        currentCount--;
        currentSize -= file.size;
        deletedCount++;
        console.log(
          `[MediaCleanupWorker] 🗑️ Deleted: ${file.fileName} (${(file.size / 1024).toFixed(1)} KB)`,
        );
      } catch (err) {
        console.error(
          `[MediaCleanupWorker] ❌ Failed to delete ${file.fileName}:`,
          err.message,
        );
      }
    }

    const finalSizeMB = (currentSize / (1024 * 1024)).toFixed(1);
    console.log(
      `[MediaCleanupWorker] ✅ Cleanup done. Deleted ${deletedCount} files. Remaining: ${currentCount} files, ${finalSizeMB} MB.`,
    );
  }
}

module.exports = new MediaCleanupWorker();
