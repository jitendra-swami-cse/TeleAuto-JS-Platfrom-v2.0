const ConfigManager = require("../../core/config/ConfigManager");
const ClientManager = require("../../core/telegram/ClientManager");
const ConversionBatch = require("../../models/ConversionBatch");
const Link = require("../../models/Link");

class ConverterSender {
  async sendBatch(batch, links) {
    const providerConfig = ConfigManager.appConfig.converters?.find(
      c => c.providerId === batch.providerId
    );

    if (!providerConfig) {
      console.error(`[ConverterSender] 🛑 Provider config not found for providerId: ${batch.providerId}`);
      batch.status = "FAILED_TO_SEND";
      await batch.save();
      await Link.updateMany({ _id: { $in: batch.linkIds } }, { $set: { conversionStatus: "FAILED_TO_SEND" } });
      return;
    }

    const account = ConfigManager.getEnabledAccounts().find(a => a._id === providerConfig.accountId);
    if (!account) {
      console.error(`[ConverterSender] 🛑 Account ${providerConfig.accountId} not found or not enabled.`);
      return;
    }

    const client = ClientManager.getClient(account._id);
    if (!client) {
      console.error(`[ConverterSender] 🛑 Client for account ${account._id} not connected.`);
      return;
    }

    const botUsername = providerConfig.botUsername;
    if (!botUsername) {
      console.error(`[ConverterSender] 🛑 botUsername not specified in provider config for ${batch.providerId}!`);
      return;
    }

    // Build the deterministic template
    let messageText = "";
    links.forEach((link, index) => {
      messageText += `${index + 1}. - ${link._id.toString()} - ${link.originalUrl} |\n`;
    });

    try {
      console.log(
        `[ConverterSender] 📤 Sending batch ${batch._id} (${links.length} links) to ${botUsername}...`,
      );

      const sentMessage = await client.sendMessage(botUsername, {
        message: messageText,
      });

      batch.requestMessageId = sentMessage.id;
      batch.status = "SENT";
      batch.converterAccountId = account._id;
      batch.sentAt = new Date();
      await batch.save();

      // Update link statuses
      await Link.updateMany(
        { _id: { $in: batch.linkIds } },
        {
          $set: {
            conversionStatus: "BATCH_SENT",
            conversionBatchId: batch._id,
          },
        },
      );

      console.log(
        `[ConverterSender] ⏳ Batch sent successfully! Waiting for bot response...`,
      );
    } catch (err) {
      console.error(
        `[ConverterSender] ❌ Failed to send batch ${batch._id}:`,
        err.message,
      );
      batch.status = "FAILED_TO_SEND";
      await batch.save();

      await Link.updateMany(
        { _id: { $in: batch.linkIds } },
        { $set: { conversionStatus: "FAILED_TO_SEND" } },
      );
    }
  }
}

module.exports = new ConverterSender();
