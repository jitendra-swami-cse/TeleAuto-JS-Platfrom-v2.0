# TeleAuto Platform - Architecture and Developer Reference

> **Purpose:** This is the single source of truth for developers working on TeleAuto. Before adding any feature or changing any functionality, read the relevant section here to understand the full flow and know exactly which file(s) to modify.

---

## 1. Project Directory Map

```
TeleAuto JS Platform v2.0/
|
+-- src/
|   +-- index.js                       # Entry point (delegates to cli/)
|   +-- cli/
|   |   +-- index.js                   # STARTUP SEQUENCE - boot order lives here
|   +-- config/                        # ALL RUNTIME CONFIGURATION FILES
|   |   +-- config.json                # Global app settings
|   |   +-- accounts.json              # Telegram account credentials
|   |   +-- source-channels.json       # Source channel definitions + per-channel settings
|   |   +-- destination-channels.json  # Broadcast target channels
|   |   +-- providers.json             # URL normalization alias rules
|   +-- core/
|   |   +-- config/ConfigManager.js    # Loads all JSON config into memory (singleton)
|   |   +-- database/DatabaseManager.js# MongoDB connection lifecycle
|   |   +-- telegram/
|   |   |   +-- ClientManager.js       # [CORE] Client registry (1 account = 1 client)
|   |   |   +-- ClientFactory.js       # Builds a raw gramJS TelegramClient
|   |   |   +-- SessionManager.js      # Loads/saves .session files
|   |   |   +-- LoginWizard.js         # Interactive OTP login prompt
|   |   |   +-- ListenerManager.js     # Attaches single NewMessage listener per account
|   |   +-- events/
|   |       +-- EventRouter.js         # [CORE] Traffic cop - routes messages to modules
|   +-- models/
|   |   +-- Message.js                 # Raw telegram message cache (capped collection)
|   |   +-- Link.js                    # [CORE] The core business entity
|   |   +-- ConversionBatch.js         # Groups links sent to converter bot
|   |   +-- BroadcastTask.js           # One task = one link to one destination channel
|   +-- modules/
|       +-- monitoring/
|       |   +-- MonitoringModule.js    # [CORE] Parses messages, creates Link records
|       |   +-- LinkExtractor.js       # Regex to extract URLs from message text
|       |   +-- URLNormalizer.js       # Normalizes URLs using providers.json aliases
|       |   +-- SourceChannelFilter.js # Checks if message is from a configured source
|       +-- conversion/
|       |   +-- BatchBuilder.js        # Polls DB for PENDING links, builds batches
|       |   +-- ConverterSender.js     # Formats and sends batch to converter bot
|       |   +-- ConverterListener.js   # Parses bot reply, updates Link records
|       +-- broadcast/
|       |   +-- BroadcastTaskCreator.js# Polls for COMPLETED links, creates tasks
|       |   +-- BroadcastWorker.js     # Processes QUEUED tasks, sends to channels
|       +-- media/
|       |   +-- MediaDownloader.js     # [CORE] Sequential media download poller
|       |   +-- MediaCleanupWorker.js  # FIFO cleanup when media exceeds thresholds
|       +-- history/
|           +-- HistorySyncModule.js   # Fetches historical messages on startup
|
+-- data/media/                        # Downloaded media files (YYYYMMDD-HHMMSS-001.ext)
+-- storage/sessions/                  # Telegram .session files (one per account)
+-- logs/                              # Application log files
```

---

## 2. Startup Sequence (src/cli/index.js)

When you run `npm start`, this is the **exact boot order**:

```
1. ConfigManager.loadAll()              Load all JSON config into memory
2. DatabaseManager.connect()            Connect to MongoDB (BLOCKS until success)
3. For each enabled account:
   a. ClientManager.connectAccount()    Connect to Telegram, load session
   b. ListenerManager.attachListeners() Attach single NewMessage listener per account
4. HistorySyncModule.syncAll()          Sync history for all channels (BLOCKS until complete)
5. BatchBuilder.start()                 Start background worker (every 15s)
6. BroadcastTaskCreator.start()         Start background worker (every 15s)
7. BroadcastWorker.start()              Start background worker (every 15s)
8. MediaCleanupWorker.start()           Start background worker (every 5 min)
```

> IMPORTANT: Workers only start AFTER history sync completes. This prevents the
> conversion and broadcast workers from racing with historical data being inserted.

---

## 3. Complete Message Lifecycle (Live Messages)

### Stage 1 - Event Reception

```
Telegram sends event
  -> ListenerManager (gramJS NewMessage listener)
  -> EventRouter.handleNewMessage()
  -> SourceChannelFilter.isSourceChannel()
       Checks message.peerId against source-channels.json
       Returns the matched channel config object, or null
  -> If match    : MonitoringModule.processMessage(msg, accountId, sourceChannel)
  -> If no match : ConverterListener.processMessage() [bot reply check]
```

| Goal | File to Edit |
|------|-------------|
| Add a new type of message routing (e.g. admin commands) | src/core/events/EventRouter.js |
| Change which channels are source channels | src/config/source-channels.json |
| Change how source channel matching works | src/modules/monitoring/SourceChannelFilter.js |

---

### Stage 2 - Monitoring and Link Creation

```
MonitoringModule.processMessage()
  1. LinkExtractor.extractLinks(messageText)
        Regex finds all https:// URLs in the message text
        Returns empty array => message is IGNORED (no links, not processed further)
  2. Determines initial mediaId value:
        No media attachment                => "noMedia"
        mediaDownloadEnabled=false globally=> "download disabled globally"
        mediaDownloadEnabled=false channel => "download disabled for channel 'X'"
        Media present and enabled          => "pending"
  3. Message.create() => saves raw message to DB (capped collection)
  4. For each extracted URL:
        URLNormalizer.normalize(rawUrl)
          - Strips UTM params, trailing slashes
          - Applies domain alias rules from providers.json
          - Creates a canonical key used for duplicate detection
        Link.create() with normalizedUrl (unique index)
          - If normalizedUrl already exists => DUPLICATE, silently ignored
  5. If any link has mediaId="pending" AND MediaDownloader is stopped:
        ClientManager.startMediaDownloader()
```

| Goal | File to Edit |
|------|-------------|
| Restrict to only specific link types (e.g. only terabox) | src/modules/monitoring/LinkExtractor.js - filter matches array before returning |
| Add a new URL domain alias (e.g. newsite.com maps to terabox) | src/config/providers.json |
| Change how URLs are cleaned or normalized | src/modules/monitoring/URLNormalizer.js |
| Disable media download globally | src/config/config.json -> mediaDownloadEnabled: false |
| Disable media download for one channel | src/config/source-channels.json -> mediaDownloadEnabled: false on that channel |
| Add new fields to the Link record | src/models/Link.js (add to schema) + MonitoringModule.js (set on create) |

---

### Stage 3 - Media Downloading (Sequential Poller)

```
MediaDownloader (polling every pollInterval seconds, only when active)
  1. Query DB: find Link where mediaId="pending" (oldest first / FIFO)
        If none found => self-stop, set ClientManager.isMediaDownloader="stopped"
  2. Find ALL links with same telegramMessageId + sourceChannelId
        Update all of them to mediaId="processing"
        This ensures 1 download per message, not 1 download per link
  3. Find the right Telegram client:
        Lookup ownerAccountId from source-channels.json config
        ClientManager.getClient(ownerAccountId)
        Fallback: first available connected client
  4. client.getMessages() to re-fetch the full Telegram message
  5. client.downloadMedia() to download the file

     SUCCESS => Save to data/media/YYYYMMDD-HHMMSS-001.ext
                Update all links in group: mediaId = "YYYYMMDD-HHMMSS-001"
     FAILURE => Update all links in group: mediaId = "error - <error message>"
```

| Goal | File to Edit |
|------|-------------|
| Change media downloader poll interval | src/config/config.json -> pollInterval |
| Support new media file types | src/modules/media/MediaDownloader.js -> _getExtension() |
| Change the media file naming format | src/modules/media/MediaDownloader.js -> generateMediaId() |
| Change where media files are stored | src/modules/media/MediaDownloader.js -> MEDIA_DIR constant |
| Change cleanup thresholds (1000 files / 1GB) | src/modules/media/MediaCleanupWorker.js |

---

### Stage 4 - Conversion

```
BatchBuilder (polling every 15s)
  1. Count links where conversionStatus="PENDING"
        If count < batchSize (default 10) => wait for more links
        If an active batch already exists (status=SENT) => wait (batch lock)
  2. Take exactly batchSize PENDING links
  3. Create ConversionBatch document (status=CREATED)
  4. Update link.conversionStatus => "BATCHED"

ConverterSender
  5. Format batch as: "1. - LINK_ID - URL |" for each link
  6. Send formatted message to converter bot via Telegram
  7. Update batch status => "SENT", link.conversionStatus => "BATCH_SENT"

ConverterListener (triggered by EventRouter when bot sends a reply)
  8. Parse bot reply to extract LINK_ID and converted URL pairs
  9. For each successfully parsed pair:
        link.conversionStatus => "COMPLETED", link.convertedUrl = convertedUrl
        If parse fails => link.conversionStatus => "FAILED"
 10. ConversionBatch.status => "COMPLETED"
```

| Goal | File to Edit |
|------|-------------|
| Change batch size | src/config/config.json -> batchSize |
| Change which bot handles conversion | src/config/config.json -> converterBotUsername |
| Change the message template sent to the bot | src/modules/conversion/ConverterSender.js |
| Change how the bot reply is parsed | src/modules/conversion/ConverterListener.js |
| Change conversion timeout | src/config/config.json -> conversionTimeoutSeconds |

---

### Stage 5 - Broadcasting

```
BroadcastTaskCreator (polling every 15s)
  1. Find links where broadcastStatus="NOT_CREATED" AND conversionStatus="COMPLETED"
  2. For each link, for each enabled destination channel:
        Create a BroadcastTask document (status=QUEUED)
        Push channel title to link.broadcastingTaskCreatedForChannels
  3. Update link.broadcastStatus => "TASKS_CREATED"

BroadcastWorker (polling every 15s)
  4. Find QUEUED BroadcastTasks where scheduledAt <= now (oldest first)
  5. For each task, load the associated Link document
  6. Check link.mediaId to determine how to send:
        "noMedia" or "download disabled..."  => Send text-only message
        "pending" or "processing"            => Defer task by 30s, check again later
        "error - ..."                        => Warn in log + send text-only (fallback)
        "YYYYMMDD-HHMMSS-001"               => Send with media file attached from disk

  On SUCCESS:
        BroadcastTask.status => "COMPLETED"
        Push channel title to link.broadcastedOnChannels
        Pull channel title from link.broadcastingTaskCreatedForChannels

  On FAILURE:
        BroadcastTask.status => "FAILED"
        Push channel title to link.broadcastingFailedOnChannels
        Pull channel title from link.broadcastingTaskCreatedForChannels

  Once ALL BroadcastTasks for a link are COMPLETED or FAILED:
        link.broadcastStatus => "COMPLETED"  (Link is now fully Archived)
```

| Goal | File to Edit |
|------|-------------|
| Add or remove destination channels | src/config/destination-channels.json |
| Change the message format sent to destination channels | src/modules/broadcast/BroadcastWorker.js - messageText construction block |
| Change the broadcast retry delay | src/modules/broadcast/BroadcastWorker.js - scheduledAt = Date.now() + 30 * 1000 |
| Change behavior when media download failed | src/modules/broadcast/BroadcastWorker.js - "error - " branch |

---

### Stage 6 - History Sync (runs every startup)

```
HistorySyncModule.syncAll()
  1. Check config.json -> historySyncEnabled (global master toggle)
        false => skip entirely, workers start immediately
  2. Loop over each source channel in source-channels.json ONE BY ONE:
     a. Check channel.historySyncEnabled (per-channel toggle)
     b. Query DB: find highest telegramMessageId for this sourceChannelId
     c. Fetch messages from Telegram in chunks of 100 (newest to oldest order)
     d. Stop when fetched message ID <= last DB message ID (the stop condition)
     e. Respect the limit: channel.historySyncLimit or config.historySyncDefaultLimit
     f. Reverse the collected messages array (oldest to newest for correct order)
     g. Pass each message to MonitoringModule.processMessage() sequentially
  3. Only after ALL channels are fully synced => return, then workers start
```

| Goal | File to Edit |
|------|-------------|
| Enable or disable history sync globally | src/config/config.json -> historySyncEnabled |
| Enable or disable history sync for one channel | src/config/source-channels.json -> historySyncEnabled per channel |
| Change per-channel fetch limit | src/config/source-channels.json -> historySyncLimit |
| Change default limit for new channels | src/config/config.json -> historySyncDefaultLimit |
| Change the sync logic itself | src/modules/history/HistorySyncModule.js |

---

## 4. The Link Document - The Core Entity

Every link extracted from a source channel message gets its own Link document in MongoDB.
A Link is NEVER deleted. It transitions through statuses over its lifetime.

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| sourceChannelId | String | Telegram ID of the source channel (e.g. -1004324690702) |
| sourceChannelTitle | String | Human-readable name of the source channel |
| telegramMessageId | Number | Telegram message ID the link was extracted from |
| originalUrl | String | The raw URL as found in the message |
| normalizedUrl | String | Canonical URL used for deduplication (unique index) |
| convertedUrl | String | The final converted URL from the converter bot |
| mediaId | String | See mediaId states table below |
| conversionBatchId | ObjectId | Reference to the ConversionBatch it was part of |
| conversionStatus | Enum | PENDING -> BATCHED -> BATCH_SENT -> COMPLETED or FAILED |
| broadcastStatus | Enum | NOT_CREATED -> TASKS_CREATED -> BROADCASTING -> COMPLETED or FAILED |
| broadcastingTaskCreatedForChannels | String[] | Channel titles with tasks created but not yet finished |
| broadcastedOnChannels | String[] | Channel titles where broadcast succeeded |
| broadcastingFailedOnChannels | String[] | Channel titles where broadcast failed |

### mediaId States

| Value | Meaning |
|-------|---------|
| "noMedia" | Message had no media attachment |
| "pending" | Queued for sequential download |
| "processing" | Currently being downloaded |
| "error - MESSAGE" | Download failed with this specific error |
| "download disabled globally" | mediaDownloadEnabled: false in config.json |
| "download disabled for channel 'X'" | mediaDownloadEnabled: false for that channel |
| "YYYYMMDD-HHMMSS-001" | Downloaded successfully; file is on disk at data/media/ |

---

## 5. Configuration Quick Reference

### src/config/config.json (Global Settings)

| Key | Type | Description |
|-----|------|-------------|
| batchSize | Number | How many links form one conversion batch (default: 10) |
| pollInterval | Number | Seconds between all background worker polls (default: 15) |
| conversionTimeoutSeconds | Number | Max wait for bot reply before batch is marked FAILED |
| messageCacheLimit | Number | Max messages in the capped Message collection |
| logRetentionDays | Number | How long to keep log files |
| converterBotUsername | String | The Telegram username of the link converter bot |
| historySyncEnabled | Boolean | Master switch for history sync on startup |
| historySyncDefaultLimit | Number | Message fetch limit for channels with no specific limit set |
| mediaDownloadEnabled | Boolean | Master switch for media downloading |

### src/config/source-channels.json (Per-Channel Settings)

| Key | Type | Description |
|-----|------|-------------|
| telegramChannelId | String | The channel Telegram ID (with -100 prefix) |
| telegramChannelUsername | String | The public username if the channel is public |
| title | String | Human-readable name used in logs |
| ownerAccountId | String | accountId from accounts.json that monitors this channel |
| historySyncEnabled | Boolean | Enable or disable history sync for this specific channel |
| historySyncLimit | Number | Max messages to fetch for this channel on each startup |
| mediaDownloadEnabled | Boolean | Enable or disable media download for this specific channel |

---

## 6. Common "How Do I..." Scenarios

### Restrict TeleAuto to only process specific link types (e.g. only terabox)?
Edit: src/modules/monitoring/LinkExtractor.js
Filter the matches array before returning it:

```js
extractLinks(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  // Only keep terabox-type links
  return [...new Set(matches)].filter(url =>
    url.includes('terabox') || url.includes('1024tera')
  );
}
```

### Add a new source channel?
Edit: src/config/source-channels.json
Add a new object to the array. The ownerAccountId must match an accountId in accounts.json.

### Add a new destination channel for broadcasting?
Edit: src/config/destination-channels.json
Add a new object with the channel ID and the broadcaster account ID.

### Add a new field to every link (e.g. a "category" tag)?
Edit 1: src/models/Link.js - Add the field to the Mongoose schema.
Edit 2: src/modules/monitoring/MonitoringModule.js - Set the field in the Link.create() call.

### Change the format of messages broadcast to destination channels?
Edit: src/modules/broadcast/BroadcastWorker.js
Find the messageText variable construction block inside the _processTasks() method.

### Add a second Telegram account?
Edit 1: src/config/accounts.json - Add a new account entry with "enabled": true.
Edit 2: src/config/source-channels.json - Set ownerAccountId to the new account on relevant channels.

### Add a completely new pipeline stage (e.g. a link validator)?
Step 1: Create your module at src/modules/your-module/YourModule.js
Step 2: Register it in src/cli/index.js with YourModule.start() alongside the other workers.
Step 3: Design it as a polling worker that queries MongoDB for links in a specific conversionStatus
        or broadcastStatus. This keeps it decoupled from all other workers.

---

## 7. Architectural Rules - Never Break These

RULE 1: 1 Account = 1 Client.
  Never create a new TelegramClient on the fly.
  Always use ClientManager.getClient(accountId).
  Creating multiple clients causes missed events, connection drops, and rate limits.

RULE 2: 1 Listener per Account.
  Never add a second NewMessage event listener to any account.
  All message routing goes through EventRouter which acts as the single traffic cop.

RULE 3: Never delete Links.
  Links are the permanent audit trail of the system.
  Mark them as FAILED or COMPLETED, but never remove them from the database.

RULE 4: Config describes HOW it runs. DB records WHAT happened.
  Never store operational settings (accounts, channels, bot username) in the database.
  Never store business history (link data, broadcast results) in JSON config files.

RULE 5: Workers are pollers, not triggers.
  Workers poll MongoDB on a timer. They never call each other directly.
  This keeps every worker independently restartable and decoupled.

RULE 6: MediaDownloader is sequential by design.
  Never trigger concurrent downloadMedia() calls.
  All downloads are funnelled through the single MediaDownloader polling instance
  on ClientManager. Concurrent downloads cause rate limit errors and failures.
