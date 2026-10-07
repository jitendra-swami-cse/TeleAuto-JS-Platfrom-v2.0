const { Command } = require("commander");
require("dotenv").config();
const ConfigManager = require("../core/config/ConfigManager");
const ClientManager = require("../core/telegram/ClientManager");
const DatabaseManager = require("../core/database/DatabaseManager");

const program = new Command();

program.name("teleauto").description("TeleAuto CLI").version("1.0.0");

program
  .command("start")
  .description("Start the TeleAuto Platform")
  .action(async () => {
    console.log("Starting TeleAuto Platform...");

    ConfigManager.loadAll();

    try {
      await DatabaseManager.connect();
    } catch (dbError) {
      console.error("Failed to start TeleAuto due to database error.");
      process.exit(1);
    }

    const accounts = ConfigManager.getEnabledAccounts();

    if (accounts.length === 0) {
      console.log("No enabled accounts found. Please configure accounts.json.");
      process.exit(1);
    }

    try {
      for (const account of accounts) {
        const client = await ClientManager.connectAccount(account);

        // Attach Top-Level Listeners for the Client
        const ListenerManager = require("../core/telegram/ListenerManager");
        ListenerManager.attachListeners(client, account);
      }
      console.log(
        `TeleAuto Platform started successfully.
        Total ${accounts.length} Connected Accounts: `,
        // TODO: Add a feature to display the connected accounts
      );

      // Phase 6: Sync Historical Messages (Blocking until complete)
      const HistorySyncModule = require("../modules/history/HistorySyncModule");
      await HistorySyncModule.syncAll();

      // Start background workers
      const BatchBuilder = require("../modules/conversion/BatchBuilder");
      BatchBuilder.start();

      const BroadcastTaskCreator = require("../modules/broadcast/BroadcastTaskCreator");
      BroadcastTaskCreator.start();

      const BroadcastWorker = require("../modules/broadcast/BroadcastWorker");
      BroadcastWorker.start();

      const MediaCleanupWorker = require("../modules/media/MediaCleanupWorker");
      MediaCleanupWorker.start();

      const DeletionWorker = require("../modules/broadcast/DeletionWorker");
      DeletionWorker.start();

      const gracefulShutdown = async () => {
        console.log("\n[TeleAuto] Gracefully shutting down...");
        BatchBuilder.stop();
        BroadcastTaskCreator.stop();
        BroadcastWorker.stop();
        DeletionWorker.stop();
        MediaCleanupWorker.stop();
        await ClientManager.disconnectAll();
        await DatabaseManager.disconnect();
        console.log("[TeleAuto] All clients disconnected. Goodbye!");
        process.exit(0);
      };

      process.on("SIGINT", gracefulShutdown);
      process.on("SIGTERM", gracefulShutdown);
    } catch (error) {
      console.error("Failed to start TeleAuto:", error.message);
      await ClientManager.disconnectAll();
      process.exit(1);
    }
  });

module.exports = program;
