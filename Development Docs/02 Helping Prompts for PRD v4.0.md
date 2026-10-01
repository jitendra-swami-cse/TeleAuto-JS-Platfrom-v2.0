Some Points that were not included in PRD so i wrote them Here

# 1 — Media Storage Strategy

- One Small Improvement in media naming
- Format of name - YYYYMMDD-HHMMSS-SEQ
  - Here "YYYYMMDD-HHMMSS" is not timestamp when media downloaded it is actually a time stamp wof the telegram message which have that media.
  - Example: 20260925-143015-001, 20260925-143015-002,

# 2 — Cross-Domain Duplicate Detection

- This is a major business rule. Links: terabox.com/s/abc123, www.terabox.com/s/abc123, 1024tera.com/s/abc123, 1024terabox.com/s/abc123. these 4 links are DUPLICATES
- This means: Domain Aliases Exist. The uniqueness key is NOT: hostname + path. Instead: canonicalProvider + path
  - Example: Configuration:
    { provider: "terabox",
    aliases: ["terabox.com", "www.terabox.com", "1024tera.com", "1024terabox.com" ] }
    Normalization: 1024terabox.com/s/abc123 -> terabox/s/abc123
    This is actually an important design decision.

# 3 — Link Lifecycle

- After successful broadcasting to all generated broadcast tasks: PENDING -> ASSIGNED_FOR_CONVERSION -> CONVERTING -> CONVERTED -> BROADCAST_TASKS_CREATED -> BROADCASTING -> ARCHIVED. I strongly agree with `ARCHIVED` rather than deletion.
- This preserves: Duplicate detection history, Conversion history, Broadcast history, Reporting, Troubleshooting, Future rebroadcast features
  - while still clearly separating: Active Links from Archived Links

# 4 — Converter Account Ownership

- Same Accounts may perform: Monitoring, Conversion, Broadcasting
- The same account may perform all responsibilities simultaneously.
  - Let's say:
    - Account A
      Monitoring = true
      Conversion = true
      Broadcasting = true
    - Account B
      Monitoring = true
      Conversion = false
      Broadcasting = true
    - Account C
      Monitoring = false
      Conversion = true
      Broadcasting = false
- When a link needs conversion: Preferred Account + Fallback Accounts
- Example: Link discovered by Account A -> Try Account A -> If unavailable -> Use Account C
  **_Note_** If preferred account failed to convert than retry by using other account must be configurable and at present in PRD i want this to be a future upgrade of have more than one account for link conversion at present i want project have only one account for conversion at present i don't want any code for retry or for anything related to more than one accounts for conversion. Restrict the development / code to one account for conversion.

# 5 — Session Storage Location

Locally in Filesystem + MongoDB Metadata
./sessions/accountA.session
./sessions/accountB.session
MongoDB:

```JSON
{
    accountId,
    phoneNumber,
    sessionStatus,
    lastConnectedAt
}
```

# 6 — Web UI, CLI, or Hybrid

At present I chose CLI may be in future we upgrade to WebUI or Hybrid

# 7 — Session Lifecycle Rule

This should absolutely be included in the PRD:

- Sessions are long-lived assets.
- TeleAuto must reuse existing sessions whenever possible.
- Routine session recreation is prohibited.
- Session destruction and recreation should occur only through explicit account management actions.

# 8 — Queue Architecture

- TeleAuto does not need an external queue system, i think MongoDB-backed task collections are sufficient for the MVP

# 9 — Scheduler

    - I thinnk it is Necessary, But very small. Not a separate service. Just: Scheduler Module inside Node.js.
    - Some teams would build: MongoDB + Redis + BullMQ + Workers + Scheduler, I think that's overengineering for project requirements.
    - So keep in mind we need schedular but very very simple and small.
    - Important Rule: The Scheduler must not become a second workflow engine. Its responsibility is: Maintenance, Recovery and Periodic Operations (like: Retry Processing: Failed Conversion Tasks, Failed Broadcast Tasks, Account Health Checks: Session Validation, Connectivity Validation, Message Cache Cleanup: FIFO Enforcement etc..) not core business processing.

# 10 — Worker Model

- Single Node.js process. Multiple internal workers. Example:

  TeleAuto
  ├── Session Manager
  ├── Recorder Worker
  ├── Conversion Worker
  ├── Broadcast Worker
  ├── Scheduler Worker
  └── Monitoring Worker

- All launched from: node index.js, This keeps deployment simple while preserving a clean architecture that can later be split into separate processes if needed.

- suggested Model of Runtime architecture is some what similar to as below:
  TeleAuto
  ├── Configuration Manager
  ├── Session Manager
  ├── Recorder Worker
  │ ├── Listener
  │ ├── Historical Fetcher
  │ └── Message Processor
  ├── Conversion Worker
  │ ├── Batch Builder
  │ ├── Conversion Assigner
  │ └── Converter Engine
  ├── Broadcast Worker
  │ ├── Broadcast Assigner
  │ └── Broadcaster
  ├── Scheduler Worker
  ├── Monitoring Worker
  └── MongoDB Layer
  Everything starts from: node index.js
  Simpler Monitoring - Single process, Single log stream and Single startup sequence.

# 11 — Proposed Workflow

    - Step 1 - New links arrive will get conversionStauts: PENDING
    - Step 2 - Batch Builder runs periodically (wait must be configurable). Example: Every 10 or 15 Seconds
               Batch Builder queries: {status: "PENDING";}
               - links should be batched: FIFO - Oldest links first.
    - Step 3 - Batch Creation Rules Suppose: if conversionBatchSize (configurable) = 10, than wait until at least 10 pending links available.
               Importantly there is no waitThreshold
    - Step 4 - Batch Statuses - PENDING, ASSIGNED, SENT, WAITING_RESPONSE, SUCCESS/COMPLETED, FAILED.
               Imporatant failed conversion will retried but this is future upgarde at present if any link gets FAILED than just let it be.
    - Step 5 - Sending To Converter Bot - Suppose Batch #45 contains: Link A, Link B, Link C,...Link J. as one Telegram message.

                Important - message should be in given format/Template so that it would be helpful while extracting the converted links from converter bot's reply

                ```text
                linkIdA - Link A
                linkIdB - Link B
                linkIdC - Link C
                .
                .
                linkIdJ - Link J
                ```

                (newline separated)

                ```js
                {
                requestTemplate: "{links}";
                }
                ```

    - Step 6 - Response Matching: This is the most important part. This could be done easily as Bot responds generally in the same template
                ```text
                    linkIdA - Converted A
                    linkIdB - Converted B
                    linkIdC - Converted C
                    .
                    .
                    linkIdJ - Converted J
                ```
                No fuzzy matching. Just positional mapping.


    - Step 7 - Advertisement Messages: as already mentioned: Bot may send ads, Bot may send extra messages. But We can assume: First reply = conversion reply or Error Message, as this is most usual behaviour of bots. It gives Minimal complexity.
    - Step 8 - Timeout after Batch sent for No response means after how long should we consider conversion failed. I think 300 seconds is enough.

# 12 — Broadcasting Workflow

- How should broadcast messages be formatted?
  Using a locally stored templated some what like:
  `${link}
How to watch video @how_to_watch
Please Join our Backup Channel @kaliya`

- Should media and links be sent as one message or multiple messages?
  Yes as One message is imporatant.

- What constitutes a successful broadcast?
  Response of broadcasting request to API must have something for confirmation.

- How should broadcast failures be recorded?
  As status of broadcast task.

- What metadata should be stored per broadcast task?
  Suggest me for that what i think metadata should be as: destination channelId on which broadcast, accountId which will be used for broadcast, status of broadcasting task, the back-reference to the link, scheduled time before which this broadcast must not happen (called as scheduledAt),telegramMessageId (id recevied in response from API after successful broadcast until then null), ...etc.
  Note - scheduledAt is for Future scheduling support. Even if at present MVP sends immediately.

- How should destination account selection work when a channel is accessible by multiple accounts (even if full overlap support is future scope)?
  I know this will increases complexity too much and hence i said it is in future scope but to be careful i will keep a constarint that any destination channel must not have more than one owner account.
  It eliminates: Account selection logic, Ownership ambiguity, Duplicate broadcast risks, Permission conflicts.

# 13 — Configuration Strategy

- config.json + .env . Suggested Split .env for Infrastructure secrets: MONGODB_URI, LOG_LEVEL, APP_ENV and config.json for Business configuration: {
  "conversionBatchSize": 10, "batchBuilderIntervalSeconds": 15, "conversionTimeoutSeconds": 300, "messageCacheLimit": 1000 }
- MongoDB Settings Collection Future use only. Example: Runtime settings, Admin-controlled settings, Feature toggles, etc.

# 14 — Monitoring & Recovery Suggestions

- Startup Recovery Scan
  - First run starts session's validation.
    Then go for all source channels one by one and fetch their last message timestamp from telegram and from our data base if they don't match then start fetching of history messages as i already told in PRD. after doing this for all source channel make their status ready for fistening by historyFetchedAt:YYYYMMDD_HH
    - The startup procedure is not primarily about task recovery. It is primarily about Telegram state reconciliation.
    - And So Startup Flow would be something like : Application Start -> Session Validation -> Validate Accounts -> For Each Source Channel -> Fetch Latest Telegram Message Timestamp -> Compare With Database -> If Mismatch -> Fetch Missing History -> -> Update historyFetchedAt -> Channel Ready -> Start Live Monitoring/Listening.
- Worker Heartbeats that is Each worker updates: lastHeartbeatAt in memory and optionally logs it at startupa and after every 60 seconds. Useful later for diagnostics.
- (Future Scope) Health Report Command on Admin command: "node index.js health" Output:Session Manager: OK, Recorder Worker: OK, Conversion Worker: OK, Broadcast Worker: OK, Scheduler Worker: OK

# 15 — Logging Strategy Suggestions

- Keep it simple.
- Application Logs: logs/app.log General events.
- Error Logs: logs/error.log Failures only.
- Rotation: Daily rotation. 30 days (configurable.)
- No ELK, No Grafana, No Prometheus.

# 16 — Admin Operations (Most Important)

- It should be somewhat like an operational console. It will be better if these commands are classified into groups.
  - Group 1 — Account Management: account:add, account:remove, account:list, account:show <accountId>, account:enable, account:disable
  - Group 2 — Source Channel Management: source:add, source:remove, source:list, source:show
  - Group 3 — Destination Channel Management: destination:add, destination:remove, destination:list, destination:show
  - Group 4 — Conversion Management: conversion:enable, conversion:disable, conversion:status, conversion:list-batches
  - Group 5 — Broadcast Management: broadcast:list-tasks, broadcast:show-task, broadcast:stats
  - Group 6 — Message Management: messages:list, messages:count, messages:export
  - Group 7 — Link Management: links:list, links:show, links:count, links:export
  - Group 8 — Statistics: stats
    - Output: Accounts: 12, Source Channels: 40, Destination Channels: 18, Messages Cached: 1000, Links Pending: 20, Links Archived: 5000, Broadcast Tasks Completed: 12000, Broadcast Tasks Failed: 15
  - Group 9 — Export Operations: export:messages, export:links, export:broadcasts, export:accounts, export:channels
- So There sould add a dedicated **Admin CLI Module** to the PRD also but no unnecessary details in PRD about "Dedicated Admin CLI Module".
  - Only something like:
    TeleAuto CLI
    ├── Account Commands
    ├── Channel Commands
    ├── Conversion Commands
    ├── Broadcast Commands
    ├── Statistics Commands
    ├── Export Commands
    └── Health Commands

# 17 — Database Schemas in PRD

- For the **Final Database Schema Review**, I think it is better if you take the lead and make the database decisions, because: MongoDB Schema Design, Index Design, Relationship Design, Query Optimization, Collection Boundaries, Document Structure are architectural/database concerns rather than business concerns.
- I can validate whether the schema supports the business workflow correctly or not at some extent, even i need your help in that also.
  Please Ensure that the schema should be: Simple, Fast, Maintainable, MongoDB-Friendly, Future-Proof enough, Not Overengineered.
- Important Design Philosophy -> "I prefer fast access of data." Examples: Link -> Source Channel, Channel -> Owner Account, Account -> All Channels, Broadcast -> Link, Link -> Broadcast Tasks.
- Don't Design It Like SQL, many developers coming from SQL try: Account -> Channel -> Message -> Link -> Broadcast and then constantly perform joins, MongoDB performs best when: Read patterns drive schema design.

## My Proposed MongoDB Design Principles

- Principle 1 - Store IDs. Store important denormalized fields too. Example: Instead of:{accountId;} only, store:{(accountId, accountPhoneNumber);} when useful. Reason: Faster debugging, Faster exports, Fewer lookups.
- Principle 2 - Optimize for the Most Common Queries Not for perfect normalization. Example: From link I want source channel. Then Link document should directly contain: {sourceChannelId;} No intermediate traversal.
- Principle 3 - Every Worker Must Be Able To Work From One Collection Example: Broadcast Worker should primarily need: broadcastTasks not: broadcastTasks -> links -> channels -> accounts, for every operation.
- Preliminary Collection Design - Without going into full schema review yet, I currently expect something close to: accounts, Stores Telegram accounts. sourceChannels Stores monitored channels. destinationChannels Stores broadcast channels. messages Message cache. FIFO limited. links Core business entity is Most important collection. conversionBatches Conversion workflow. broadcastTasks Broadcast workflow. media Filesystem metadata. Possibly: settings Future only. Not required for MVP.
- Link This is where most optimization will happen. Example:
  ```js
  {
    (_id,
      sourceChannelId,
      sourceChannelTitle,
      telegramMessageId,
      originalUrl,
      normalizedUrl,
      convertedUrl,
      conversionStatus,
      broadcastStatus,
      mediaId,
      createdAt);
  }
  ```
- One Important Recommendation Before Schema Review I want to make one architectural rule that will heavily influence schema design: MongoDB ObjectId
  must be the primary internal identifier. Telegram IDs should never be used as primary keys. Example:
  Bad:
  `js
{
  _id: telegramChannelId;
}
`
  Good:
  `js
{
  _id: ObjectId(...),
  telegramChannelId: -100123456789
}
`
  Reason: Internal flexibility, Migration safety, Cleaner relationships, No Telegram coupling,
- Only ask you questions if a schema decision affects business behavior. That should allow us to move much faster toward the final PRD while still keeping the database optimized for the workflows we've already agreed upon.
  Perfect. We're now at the stage where we should stop discussing individual features and start validating that the entire architecture fits together.

I agree that the next step should be a **Final Database Schema Review**, and I'll drive it from an architecture perspective rather than asking you MongoDB-specific questions.

---

## Database Design Goals

- Fast Operational Queries: Examples: Account -> All Source Channels, Account -> All Destination Channels, Source Channel -> Recent Messages, Source Channel -> Links, Link -> Source Message, Link -> Broadcast Tasks, Broadcast Task -> Destination Channel, Destination Channel -> Owner Account, etc.
- Fast Worker Queries: Examples: Find pending links, Find pending conversion batches, Find pending broadcast tasks, Find failed items, Find oldest pending links. These are far more important than perfect normalization.
- Proposed Collections: accounts, sourceChannels, destinationChannels, messages, links, conversionBatches, broadcastTasks, media, Only. No extra collections. No queue collections. No audit collections. No statistics collections. No settings collection (yet).
- Relationship Philosophy Important rule: Store references by ObjectId, Store useful denormalized fields when it improves operational visibility.
- Status Enums It would be better to standardize these now.
  - Link Conversion Status: PENDING, ASSIGNED, SENT, WAITING_RESPONSE, COMPLETED, FAILED.
  - Link Broadcast Status: NOT_CREATED, TASKS_CREATED, BROADCASTING, COMPLETED, FAILED.
  - Conversion Batch Status: PENDING, ASSIGNED, SENT, WAITING_RESPONSE, COMPLETED, FAILED.
  - Broadcast Task Status: QUEUED, PROCESSING, COMPLETED, FAILED.
  - Channel Monitoring Status: PENDING_HISTORY, READY, DISABLED.
  - Session Status: ACTIVE, REQUIRES_LOGIN, DISABLED.
  - Keep focused on: End-to-End Workflow Validation, i mean: Source Message -> Message Cache -> Link Extraction -> Link Creation -> Conversion Batch -> Converter Response -> Broadcast Task Creation -> Broadcast -> Archive and verify that every step maps cleanly to the collections above. This review is usually where hidden gaps appear.

# Proposed Collections are as (here i try to give you some idea but final decision about these is yours)

- Collection 1 — accounts (Purpose:Telegram accounts known to the system) Example: { (\_id, phoneNumber, displayName, enabled, monitoringEnabled, conversionEnabled, broadcastingEnabled, sessionStatus, lastConnectedAt, createdAt, updatedAt); }, Indexes: phoneNumber(unique); enabled;
- Collection 2 — sourceChannels (Purpose: Monitored channels) Example:{ (\_id, ownerAccountId, telegramChannelId, title, enabled, monitoringStatus, historyFetchedAt, lastTelegramMessageAt, lastDatabaseMessageAt, createdAt, updatedAt); }, Indexes: telegramChannelId(unique); ownerAccountId;
- Collection 3 — destinationChannels (Purpose: Broadcast targets) Example: { (\_id, ownerAccountId, telegramChannelId, title, enabled, availableForBroadcasting, createdAt, updatedAt); }, Indexes: telegramChannelId(unique); ownerAccountId; availableForBroadcasting;
- Collection 4 — messages (Purpose: FIFO message cache) Stored only when: Configured links detected Example: {\_id, telegramMessageId, sourceChannelId, messageBody, extractedLinks: [], mediaDetected, receivedAt}, Indexes: sourceChannelId; receivedAt;
  - Cleanup worker enforces: messageCacheLimit (default configurable)
- Collection 5 — links (This is the most important collection.) Example: { (\_id, sourceChannelId, sourceChannelTitle, telegramMessageId, originalUrl, normalizedUrl, convertedUrl, mediaId, conversionBatchId, conversionStatus, broadcastStatus, createdAt, updatedAt); }, Indexes: normalizedUrl(unique); conversionStatus + createdAt; broadcastStatus; sourceChannelId; This collection drives most business workflows.
- Collection 6 — conversionBatches (Purpose: Track conversion requests) Example: { \_id, providerId, converterAccountId, requestMessageId, providerResponseMessageId, status, linkIds: [], createdAt, sentAt, completedAt }, Indexes: status; createdAt;
- Collection 7 — broadcastTasks (Purpose: One task per destination channel) Example: { (\_id, linkId, destinationChannelId, broadcasterAccountId, status, scheduledAt, startedAt, completedAt, telegramMessageId, errorMessage, createdAt, updatedAt); }, Indexes: status + scheduledAt; linkId; destinationChannelId;
- Collection 8 — media (Purpose: Filesystem metadata) Example: { (\_id, mediaId, filePath, mimeType, fileSize, status, createdAt); }, Indexes: mediaId(unique);

Excellent. This is exactly the point where architects usually discover hidden contradictions before implementation starts.

Let's perform a **full End-to-End Workflow Validation** against all decisions made so far.

---

# Workflow Validation

## Phase 1 — Startup

- node index.js -> Load Config -> Connect MongoDB -> Load Accounts -> Validate Sessions -> Validate Source Channels -> History Synchronization -> Start Workers
- Requirements covered: ✅ Single process architecture, ✅ Session Manager, ✅ Startup recovery, ✅ Historical fetching, ✅ Source channel readiness, No conflicts found.

## Phase 2 — Monitoring

- Worker: Monitoring Worker Receives: Telegram Message Example: Movie Name https://terabox.com/s/abc123
- System checks: Configured domains Examples: terabox, terashare, 1024tera, 1024terabox, terasharelink
  - If no configured links: Ignore message
  - If configured links exist:
    - Create Message Record.
    - Message Record: {(telegramMessageId, sourceChannelId, messageBody, extractedLinks, mediaId, receivedAt);}
    - if message have media then
      - Generate mediaId as described before using the timestamp of Telegram message.
      - Download media attached with message on filesystem with the name - mediaId.
        - if download successful then add mediaId to Message Record
        - if download failed then add mediaId: DownloadFailed
    - if message do not have media then add mediaId - noMedia.

## Phase 3 — Link Extraction

- From message: https://terabox.com/s/abc123
- Generate: normalizedUrl
  - Rules: Lowercase hostname, Remove protocol, Remove trailing slash, Ignore query parameters, Ignore fragments, Normalize approved domains
    - Example: https://terabox.com/s/abc123, https://www.terabox.com/s/abc123, https://1024terabox.com/s/abc123 -> same normalizedUrl
- Duplicate Check
  - Application Layer: Normalize, Lookup
  - Database Layer: Unique Index

## Phase 4 — Link Creation

- Create: { sourceChannelId, telegramMessageId, originalUrl, normalizedUrl, conversionStatus: "PENDING", broadcastStatus: "NOT_CREATED" }

## Phase 5 — Message Cache Cleanup

- Messages collection: Max 1000 (configurable)
- When: 1001st message inserted Oldest message removed. FIFO.

## Phase 6 — Batch Builder

- Runs: Every X seconds (Configurable) Example: 15 seconds
- Queries: { conversionStatus: "PENDING"; }
- Sorted: Oldest First
- Batch size: 10 (Configurable) Only create batch when: Pending >= 10, No partial batches., No max wait. Exactly as chosen.

## Phase 7 — Conversion Batch Creation

- Create: Batch #45 Contains: Link A, Link B, ..., Link J
- Update links: PENDING -> ASSIGNED
- Create: conversionBatch; record in data.

## Phase 8 — Send To Converter

- Worker builds using: requestTemplate as below:
  linkIdA - URLA
  linkIdB - URLB
  ...
  linkIdJ - URLJ
- Send through: Single Conversion Account No fallback accounts. No retries.

## Phase 9 — Wait For Response

- Batch: SENT -> WAITING_RESPONSE
- Wait: 300 seconds (Configurable)
- Possible Outcomes
  - Success Bot replies.
  - Failure No reply.
    - Batch: FAILED
    - Links: FAILED

## Phase 10 — Response Parsing

- Response:
  123 - ConvertedA
  124 - ConvertedB
  ...
  133 - ConvertedC
- Parser:
  - Primary: linkId
  - Fallback: position
- Update: convertedUrl and conversionStatus = COMPLETED

## Phase 11 — Broadcast Task Creation

- After successful conversion Generate: One task per destination channel
  - Example: 7 destination channels available (Configurable) for broadcast so 7 Broadcast Tasks.
- Link: broadcastStatus -> TASKS_CREATED

## Phase 12 — Broadcast Worker

- Query: QUEUED
- tasks Find: Destination Channel -> Owner Account.
- Build message using Template as below :
  ${link}
  How to watch video @how_to_watch
  Please Join our Backup Channel @kaliya
- Attach: Media + Caption as single Telegram message.

## Phase 13 — Broadcast Result

- Telegram API success: Task -> COMPLETED
  - Store: telegramMessageId
- Failure: Task -> FAILED
  - Store: errorMessage

## Phase 14 — Link Archival

- Check: All Broadcast Tasks Completed
  - If true: broadcastStatus = COMPLETED
    - Then: Link Lifecycle becomes: PENDING -> ASSIGNED -> SENT -> WAITING_RESPONSE -> COMPLETED -> TASKS_CREATED -> BROADCASTING -> ARCHIVED

<!--  -->

First Create an consize PRD and then MVP but number of development phases must be less as much as possible
May be i wrote this already or may i forgot to wrote this -
When 10 links sent to converter bot in any template format it what bot actually do is first try to convert all 10 links and after conversion it just replace the links to their respective converted links and remaining text will be as that was in sent message, if any link (in that 10 links in sent message) is invalid or cannot converted than bot will not replace or remove that link in reply instead it just ignore that link and send as it was before in reply so link parser must be coded in a way that if any link will be replied from bot as it was in sent message than treat that as invalid link and set the feild convertedLink: invalidLink and that invalid link will not processed in upcoming phases of app (means that will not broadcasted.)
