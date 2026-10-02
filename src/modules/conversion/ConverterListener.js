const ConversionBatch = require("../../models/ConversionBatch");
const Link = require("../../models/Link");

class ConverterListener {
  async processMessage(message, accountId, botUsername) {
    try {
      // 1. Verify this message actually came from the converter bot
      const sender = await message.getSender();
      const cleanBotUsername = botUsername.replace("@", "");

      if (
        !sender ||
        (sender.username &&
          sender.username.toLowerCase() !== cleanBotUsername.toLowerCase())
      ) {
        return; // Not from our configured bot
      }

      console.log(
        `\n[ConverterListener] 📥 Received response from Converter Bot (@${sender.username})`,
      );

      // 2. Find the active batch that is waiting for a response
      const activeBatch = await ConversionBatch.findOne({
        status: "SENT",
        converterAccountId: accountId,
      });

      if (!activeBatch) {
        // console.log(
        //   `[ConverterListener] ⚠️ Got a message from the bot, but no active batch is waiting. Ignoring.`,
        // );
        return;
      }

      const messageText = message.message || "";
      if (!messageText) {
        // console.log(
        //   `[ConverterListener] ⚠️ Bot response is empty or just media. Marking batch as FAILED_TO_PARSE.`,
        // );
        await this.markBatchFailed(activeBatch);
        return;
      }

      // 3. Parse the message for IDs
      const lines = messageText.split("\n");
      let convertedCount = 0;
      let failedCount = 0;

      for (const line of lines) {
        // Regex to find the 24-character MongoDB ObjectId
        const idMatch = line.match(/([a-fA-F0-9]{24})/);
        if (!idMatch) continue;

        const linkId = idMatch[1];

        // Verify this link actually belongs to the active batch
        if (!activeBatch.linkIds.includes(linkId)) {
          continue;
        }

        // Extract the converted URL
        // We look for http/https following the ID
        const urlMatch = line.match(/(https?:\/\/[^\s\|]+)/);

        // Ensure the matched URL isn't exactly the original URL, which means it failed to convert
        // Or if there is no URL matched at all
        const originalLink = await Link.findById(linkId);
        if (!originalLink) continue;

        const convertedUrl = urlMatch ? urlMatch[1] : null;

        if (convertedUrl && convertedUrl !== originalLink.originalUrl) {
          await Link.findByIdAndUpdate(linkId, {
            convertedUrl: convertedUrl,
            conversionStatus: "COMPLETED",
          });
          convertedCount++;
        } else {
          // The bot returned the original link untouched, or stripped the URL completely
          await Link.findByIdAndUpdate(linkId, {
            conversionStatus: "FAILED_TO_PARSE",
          });
          failedCount++;
        }
      }

      // 4. Update Batch Status
      activeBatch.providerResponseMessageId = message.id;
      activeBatch.status = "COMPLETED";
      activeBatch.completedAt = new Date();
      await activeBatch.save();

      console.log(`[ConverterListener] ✅ Batch ${activeBatch._id} processed!`);
      console.log(
        `[ConverterListener] 📊 Stats: ${convertedCount} converted, ${failedCount} failed.`,
      );
    } catch (err) {
      console.error(
        "[ConverterListener] ❌ Error processing message:",
        err.message,
      );
    }
  }

  async markBatchFailed(batch) {
    batch.status = "FAILED_TO_PARSE";
    batch.completedAt = new Date();
    await batch.save();

    await Link.updateMany(
      { _id: { $in: batch.linkIds } },
      { $set: { conversionStatus: "FAILED_TO_PARSE" } },
    );
  }
}

module.exports = new ConverterListener();
