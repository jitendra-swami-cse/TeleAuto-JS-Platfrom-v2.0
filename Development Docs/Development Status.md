Edited package.json

I noticed your `npm start` command just showed the help menu and exited. That happened because our CLI tool requires the `start` argument (i.e. `node src/index.js start`). I just quickly updated your `package.json` so that simply typing `npm start` will automatically run it correctly!

Here is a simple explanation of what has been built so far (Phase 1A) and how the execution flows:

### What I Built (The "Telegram Foundation")

Instead of jumping straight into monitoring or converting links, we built the **core engine** that handles Telegram securely and efficiently.

1. **Config Manager**: A system that reads your settings from `config.json` and your telegram accounts from `accounts.json`.
2. **Session Manager**: A system that saves your Telegram login state (like a browser cookie) into local `.session` files so you only ever have to log in once.
3. **Client Manager**: The factory that creates the actual connection to Telegram using the saved session. It enforces your strict rule of **1 Account = 1 Client**.
4. **Login Wizard**: A simple terminal interface. If you don't have a saved session, it steps in and asks you for your phone number and OTP code right in the console.

### The Execution Flow (Step-by-Step)

When you run `npm start` right now, here is exactly what happens under the hood:

1. **Wake Up**: The application starts up and loads all the JSON configuration files into memory.
2. **Find Accounts**: It looks at `src/config/accounts.json` to find any accounts marked `"enabled": true`.
3. **Load Session**: For each enabled account, the `SessionManager` looks in the `storage/sessions/` folder to see if you have logged in before.
4. **Connect**: The `ClientManager` attempts to connect to Telegram using your `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, and the session.
5. **Authorization Check**:
   - **If it's your first time (No Session)**: The app pauses and the `LoginWizard` asks you to type your phone number and Telegram OTP code in the console. Once successful, it saves a permanent session file.
   - **If you've logged in before (Valid Session)**: It connects instantly in the background without bothering you.
6. **Ready State**: The Telegram Client is successfully connected and sits idle.

Right now, the flow ends at Step 6 because we haven't built the **Event Router and Listeners (Phase 1B)** to tell it what to listen for yet.

If you'd like to test this flow right now, just fill in your API keys in the `.env` file, put your phone number in `accounts.json`, and run `npm start`! Otherwise, we can move straight to building Phase 1B.

Created SourceChannelFilter.js
Created MonitoringModule.js
Created EventRouter.js
Created ListenerManager.js
Edited index.js

Awesome! Phase 1B (The Listener Runtime) is now fully integrated. Here is what has been built:

1. **`ListenerManager.js`**: Enforces your _Single Listener Rule_. It attaches exactly one `NewMessage` event listener to the Telegram client upon successful connection.
2. **`EventRouter.js`**: The central traffic cop! It receives all raw Telegram messages from the Listener and decides where they should go. Right now, it's checking if the message came from a Source Channel.
3. **`SourceChannelFilter.js`**: A smart filter that compares incoming message `peerId`/`chatId`s against your `source-channels.json` config.
4. **`MonitoringModule.js`**: The destination for source channel messages. Currently, it just logs the message to the console in a pretty format to prove the pipeline works (we will add the MongoDB saving and link extraction logic in Phase 1C).

### How to Test Phase 1B:

1. Create a `source-channels.json` file inside `src/config/` (I left a default empty array `[]` there, or you can create it). Add a channel you are a member of:
   ```json
   [
     {
       "telegramChannelId": "-1001234567890",
       "telegramChannelUsername": "some_test_channel"
     }
   ]
   ```
   _(Note: Telegram Channel IDs almost always start with `-100`. The filter will still try to match it if you accidentally forget the `-100`)._
2. Run `npm start`.
3. Wait for the `Listeners attached...` log.
4. Send a test message inside that Telegram channel, and you should instantly see it print to your terminal!

Try it out, and let me know when you're ready to tackle **Phase 1C: Monitoring Pipeline (Link Extraction & MongoDB)**!

<!-- ------------------------------------ -->

I have carefully analyzed all the provided markdown documents, respecting the strict priority order you established (`01 PRD` < `02 Helping Prompts` < `03 Latest Resolutions` < `04 Useful Point` < `05 Architecture` < `06 Dev Plan` < `Startup Flow` < `07 Comprehensive Plan` < `Development Status`), as well as the existing `.js` and `.json` files in the `src` and config folders.

### Analysis Summary

The current codebase correctly implements **Phase 1A and 1B**:

- **Client & Session Management**: Follows the strict "1 Account = 1 Session = 1 Client" rule.
- **Event Router & Single Listener**: Exactly one `NewMessage` listener is registered, pushing events to the `EventRouter`, filtering source channels, and hitting `MonitoringModule.processMessage()`.
- **Config Separation**: Secrets and operational settings are correctly loaded via `ConfigManager` from JSON and `.env`.

### Preparing for Phase 1C (Monitoring Pipeline)

In Phase 1C, we need to implement Link Extraction, URL Normalization, Duplicate Detection, and MongoDB persistence for `Message` and `Link` entities, along with enforcing the `messageCacheLimit`.

Based on the priority order of the documents, I have resolved any contradictions internally (for example, utilizing MongoDB `ObjectId` as primary keys instead of Telegram IDs, ensuring Media IDs use the message timestamp, and avoiding separate code paths for history vs. live messages).

Before I write the code for Phase 1C, I have a few suggestions/questions to ensure we are completely aligned:

Ques 1. **Domain Aliases (Canonical Providers):**
For cross-domain duplicate detection (e.g., `terabox.com`, `1024tera.com` -> `terabox`), we need to store these alias rules. Would you prefer a new config file (e.g., `src/config/providers.json`) to manage these cleanly, or should I just add a `providers` array inside the existing `config.json`?
Ans - Yes there should be a new config file to manage these cleanly.
Ques 2. **Message FIFO Cache:**
We need to enforce the `messageCacheLimit` (default 1000). Since MongoDB has native support for **Capped Collections** (which automatically maintain insertion order and drop the oldest documents when a limit is reached without needing manual cleanup jobs), I suggest we use a Capped Collection for the `messages` collection. Does that sound good to you?
Ans - Yes do this.
Ques 3. **Media ID Generation:**
According to the `07 Comprehensive Development Plan`, the actual downloading of media files happens in Phase 4. For Phase 1C, should I go ahead and generate the proper `mediaId` (e.g., `20261001-143015-001` based on the Telegram message timestamp, or `"noMedia"`) and save it to the DB so the data is fully prepared for Phase 4?
Ans - Yes
Ques 4. **MongoDB Connection Setup:**
I will need to create a `DatabaseManager.js` and inject it into the startup sequence in `cli/index.js` (right after `ConfigManager.loadAll()`) so that the database is ready before the Telegram clients connect.
Ans - Yes do this.

<!-- ----------------------------------------------------------------- -->


### Phase 2: The Conversion System (Completed)

- **BatchBuilder:** Scans for `PENDING` links, packs them into batches of `batchSize` (default 10), and enforces the '1 active batch' lock so no two batches run simultaneously.
- **ConverterSender:** Formats batches using the `1. - LINK_ID - URL |` template and sends them to the configured converter bot.
- **ConverterListener:** Listens for bot replies via the EventRouter, parses the `LINK_ID` and converted URL pairs, and updates `Link.conversionStatus` to `COMPLETED` or `FAILED`.

### Phase 3: The Broadcasting System (Completed)

- **BroadcastTaskCreator:** Watches for `conversionStatus=COMPLETED` links and creates individual `BroadcastTask` documents (one per destination channel). Atomically tracks progress using `broadcastingTaskCreatedForChannels` array on the Link.
- **BroadcastWorker:** Processes `QUEUED` tasks one by one. On success, atomically pushes channel title to `broadcastedOnChannels` and pulls from `broadcastingTaskCreatedForChannels`. On failure, pushes to `broadcastingFailedOnChannels`. Archives link when all tasks are done.
- **Broadcast Tracking Arrays on Link:** Three arrays (`broadcastingTaskCreatedForChannels`, `broadcastedOnChannels`, `broadcastingFailedOnChannels`) provide real-time visibility into broadcasting progress per channel.

### Phase 4: Media System (Completed)

- **Link.mediaId State Encoding:** Removed the separate `mediaStatus` field. `mediaId` itself encodes all states: `noMedia`, `pending`, `processing`, `error - msg`, `download disabled globally`, `download disabled for channel 'X'`, or a timestamp ID (`YYYYMMDD-HHMMSS-001`) on success.
- **MediaDownloader (Sequential Poller):** Rewrote from concurrent fire-and-forget to a sequential self-stopping poller managed via `ClientManager`. Downloads one message group at a time to avoid Telegram rate limit errors. Groups all links from the same `telegramMessageId` so media is downloaded only once per message. Self-stops when no pending links remain, and auto-restarts when new media arrives.
- **ClientManager Controls:** Added `isMediaDownloader` flag, `startMediaDownloader()`, and `stopMediaDownloader()` methods. `MonitoringModule` kicks the downloader when new pending media is detected.
- **MediaCleanupWorker:** Runs every 5 minutes. Deletes media files FIFO (oldest first) only if: (1) file count exceeds 1000 OR (2) total size exceeds 1 GB. Only targets fully archived link media. Never touches active/in-progress files.
- **Media Download Toggle:** Added `mediaDownloadEnabled` to both `config.json` (global toggle) and `source-channels.json` (per-channel toggle). When disabled, `mediaId` is set to a descriptive string (not generic `noMedia`) for audit clarity.

### Phase 5: Web Dashboard (Deferred)

- Interactive CLI phase was skipped. A Simple Web Dashboard (Express.js backend + HTML/CSS/JS frontend) is planned for a future phase after core features are stable.

### Phase 6: History Sync (Completed)

- **HistorySyncModule:** Runs on every startup after Telegram clients connect but before any background workers start. Loops over all source channels strictly one by one.
- **Stop Condition:** Fetches messages from Telegram in chunks of 100 (newest to oldest). Stops when the fetched message ID falls <= the highest ID already in the database for that channel.
- **Chronological Order:** Collected messages are reversed before being passed to `MonitoringModule.processMessage()` to ensure oldest-first insertion order.
- **Global Toggle:** `historySyncEnabled` in `config.json` is the master switch. If false, module exits immediately and workers start right away.
- **Per-Channel Toggle:** Each channel in `source-channels.json` can independently set `historySyncEnabled: false` to be skipped.
- **Per-Channel Limit:** `historySyncLimit` on each channel overrides the global `historySyncDefaultLimit` from `config.json`.
- **Code Reuse:** All historical messages flow through the exact same `MonitoringModule.processMessage()` function as live messages — zero duplicate logic.

### Documentation (Completed)

- **Platform Architecture & Developer Reference:** Comprehensive developer guide with the full directory map, 8-step startup sequence, complete 6-stage message lifecycle with arrow-flow diagrams and 'Files to Edit' tables per stage, Link document field reference with all status enums, config key reference, 7 common how-to scenarios, and 6 architectural rules that must never be violated.
- **Advanced Broadcasting Features Design:** Detailed design specification for two upcoming features:
  - **Feature 1 - Channel Linking:** `broadcastTo` array on source channels restricts which destination channels receive links from that source. Config-only change, zero new files.
  - **Feature 2 - Broadcasting Rules:** `broadcastRules` object on destination channels supports `maxPerHour`, `maxPerDay`, `minGapMinutes`, `duringTime`, `afterTime`, `beforeTime`, and `timezone` for fine-grained broadcast scheduling.

<!-- ----------------------------------------------------------------- -->
