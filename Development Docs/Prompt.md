Analyze the attached documents and their priority order is as below:
"01 PRD v4.0.md" < "02 Helping Prompts for PRD v4.0.md" < "03 Latest Resolutions by me.md" < "04 Development Usefull Point v4.0.md" < "05 Architecture.md" < "06 Development Plan.md" < "Startup Flow.md" < "07 Comprehensive Development Plan.md" < "Development Status.md".
If any contradiction in concepts or features or anything occur in markdown documents than use priority order which has more priority will win the contradiction and don't ask me about that contradiction even after that you have suggestions or questions related to contradiction or anything else feel free to ask me but before that Please analyze all javascript and json files of this project except files inside node_modules folder and except files inside "\_Less Useful Files" folder Then we will proceed for next development phase.

<!-- ---------------------------- -->

I have completed the implementation of **Phase 1C (Monitoring Pipeline)** based on approvals!

Here is a summary of what was successfully built and integrated into the project:

### 1. New Configurations & Managers

- **`src/config/providers.json`**: Created a configuration file to store canonical providers and their domain aliases (e.g., `terabox.com` -> `terabox`).
- **`ConfigManager.js`**: Updated to load and expose the `providers.json` rules in-memory.
- **`DatabaseManager.js`**: Created to establish a stable connection with MongoDB using `process.env.MONGODB_URI`.
- **`cli/index.js`**: Updated the startup sequence. The CLI now properly loads `.env` variables, initializes the database connection before allowing Telegram clients to connect, and gracefully disconnects from MongoDB during shutdown.

### 2. MongoDB Models (The Business State)

- **`src/models/Message.js`**: Implemented using **MongoDB Capped Collections** to enforce the exact `messageCacheLimit`. It automatically manages the FIFO eviction (dropping the oldest message cache without any extra cleanup jobs!).
- **`src/models/Link.js`**: Created as the core business entity. It implements the duplicate detection by enforcing a `unique` constraint on the `normalizedUrl`.

### 3. Monitoring Module Pipeline

- **`LinkExtractor.js`**: Added a fast regex-based utility that extracts and filters exact duplicate URLs from raw Telegram messages.
- **`URLNormalizer.js`**: Replaces aliases with their canonical provider mappings based on `providers.json`, ignoring trailing slashes, queries, and fragments for a fully consistent uniqueness key.
- **`MonitoringModule.js`**: Replaced the boilerplate logging logic with the real pipeline:
  1. Grabs the message text and extracts links.
  2. Creates a timestamp-based `mediaId` (e.g., `20261001-143015-001`) if the original message contains media, otherwise falls back to `'noMedia'`.
  3. Caches the original `Message` to MongoDB.
  4. For every extracted link, it runs normalization and attempts to create a `Link` record.
  5. Intercepts MongoDB's `11000 Duplicate Key Error` natively to cleanly flag and ignore duplicates!

<!-- -------------------------------------------- -->

suppose 10 messages came in source channel and all 10 messages have media attached what will happen 10 media download processes triggerd simitualteanously and run at same time if yes than this is the one which actaully creates error as 10 downolading processes runing at same time can be the reason of media download fail, tell me am i right or media download in any other way.

```text
What i suggest is (i am talking about related to media only remaining things like links are must not be affected by this) -
when message recevied
1 if message don't have link then ignore this message.
2 if message don't have media then store property of link "mediaId" = "noMedia"
3 if message have media then

  3.1 Store property of link "mediaId" = "pending" and after saving this

  3.2 Check ClientManager.isMediaDownloader
    3.2.1 if ClientManager.isMediaDownloader="running" then ok
    3.2.2 if ClientManager.isMediaDownloader="stopped" then
            - Set ClientManager.isMediaDownloader="running"
            - Run ClientManager.mediaDownloader()


4 As app started ClientManager a property on this isMediaDownloader must be defined on it. And a method to start and a method to stop - a polling mechanism named "MediaDownloader" must also have to be on Client Manager.

5. MediaDownloader Polling -
  5.1 After each 15 seconds (Configured) it checks for links have property mediaId="pending"
  5.2 links (having media="pending") got from db are sorted so the oldest link can be selected for first to download and set mediaId="processing" to this link.
  5.3 when a link chosen for download first find the right account using "sourceChannelId" stored on the link.
  5.4 when right account is found get client of this account from client manager
  5.5 Using right client start download for the media.
      - if media download successful then set mediaId= generated media id
      - if media download failed then set mediaId= error - ErrorMessage
  5.7 Again polls for links with mediaId="pending"
      - if there are links then repeat the flow
      - if there are no links with mediaId="pending" then first stop MediaDownloader Polling Mechanism and set ClientManager.isMediaDownloader="stopped"

  Next time when ever link or links with media appear the MediaDownloader polling will be started again and runs until all media either downloaded or failed.
```
