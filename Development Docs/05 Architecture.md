# TeleAuto Platform Architecture Document (Current Design)

**Version:** 0.1 Alpha Architecture
**Based On:** PRD v4.0, Helping Prompts v4.0, Development Useful Point v4.0, Latest Resolutions, and architecture decisions from this chat session.

---

# 1. Project Goal

TeleAuto is a Telegram automation platform designed to:

```text
Monitor Source Channels
        ↓
Extract Links
        ↓
Convert Links
        ↓
Broadcast Results
        ↓
Track Everything
```

Primary objectives:

```text
Maximum Code Reusability
High Maintainability
Multi Account Ready
Single Listener Architecture
Scalable Module Design
Production Safe
```

---

# 2. Core Design Principles

## 2.1 Single Responsibility

Every module performs only one responsibility.

Example:

```text
Monitoring Module
    ↓
Only Monitoring

Conversion Module
    ↓
Only Conversion

Broadcast Module
    ↓
Only Broadcasting
```

---

## 2.2 Reusability First

Avoid duplicated logic.

Bad:

```text
History Processor
Live Processor
```

Good:

```text
processIncomingMessage()

History Message
      ↓
processIncomingMessage()

Live Message
      ↓
processIncomingMessage()
```

---

## 2.3 Centralized Telegram Access

No module directly talks to Telegram.

Always:

```text
Module
 ↓
Telegram Service
 ↓
Client Manager
 ↓
Telegram Client
```

---

# 3. High-Level Architecture

```text
CLI
 ↓

Application Core

 ├── Config Manager
 ├── Logger
 ├── Database Manager
 ├── Session Manager
 ├── Client Manager
 ├── Event Router
 └── Worker Scheduler

 ↓

Business Modules

 ├── Monitoring Module
 ├── Link Module
 ├── Conversion Module
 ├── Broadcast Module
 └── Media Module

 ↓

MongoDB
```

---

# 4. Telegram Architecture

---

## 4.1 Account

Represents:

```text
Telegram Account
```

Stored in:

```text
accounts.json
```

Example:

```json
{
  "_id": "acc001",
  "phoneNumber": "+919999999999",
  "enabled": true,
  "sessionFile": "acc001.session"
}
```

---

## 4.2 Session

Represents:

```text
Authenticated Login State
```

Stored as:

```text
storage/sessions/*.session
```

Example:

```text
storage/sessions/acc001.session
```

---

## 4.3 Client

Represents:

```text
Live Telegram Connection
```

Created from:

```text
API_ID
API_HASH
SESSION
```

Flow:

```text
Account
 ↓
Session
 ↓
Client
```

---

## 4.4 Client Rule

Mandatory:

```text
1 Account
      ↓
1 Session
      ↓
1 Client
```

Never:

```text
1 Session
      ↓
Many Clients
```

---

# 5. Listener Architecture

---

## Single Listener Rule

Each client owns:

```text
1 Top-Level Listener
```

Example:

```text
Client
 ↓
NewMessage Listener
```

---

## Listener Flow

```text
Telegram
 ↓
NewMessage Event
 ↓
Listener
 ↓
Event Router
```

Listener does not process business logic.

Listener only forwards.

---

# 6. Event Router

Central event entry point.

```text
Telegram Event
      ↓
Event Router
      ↓
Correct Module
```

Examples:

```text
Source Channel Message
        ↓
Monitoring Module

Converter Bot Message
        ↓
Conversion Module
```

---

# 7. Config Files

---

## accounts.json

Stores accounts.

```json
[
  {
    "_id": "acc001",
    "phoneNumber": "+919999999999",
    "enabled": true,
    "sessionFile": "acc001.session"
  }
]
```

---

## source-channels.json

Stores monitored channels.

```json
[
  {
    "telegramChannelId": "-1001234567890",
    "telegramChannelUsername": "movies_channel"
  }
]
```

---

## destination-channels.json

Stores broadcast destinations.

```json
[
  {
    "telegramChannelId": "-1009999999999",
    "telegramChannelUsername": "destination_channel"
  }
]
```

---

## config.json

Stores runtime settings.

Example:

```json
{
  "batchSize": 10,
  "pollInterval": 10,
  "logRetentionDays": 5
}
```

---

# 8. Startup Flow

```text
Application Start
        ↓
Load Config
        ↓
Connect MongoDB
        ↓
Load Accounts
        ↓
Load Sessions
        ↓
Create Clients
        ↓
Connect Clients
        ↓
Register Listeners
        ↓
Start Workers
        ↓
Ready
```

---

# 9. Monitoring Module

Purpose:

```text
Watch Source Channels
```

---

## Flow

```text
New Message
     ↓
Source Channel Filter
     ↓
Monitoring Service
```

---

## Processing

```text
Message
 ↓
Link Extractor
 ↓
URL Normalizer
 ↓
Duplicate Detector
 ↓
Mongo Save
```

---

# 10. Link Module

Purpose:

```text
Manage Links
```

Responsibilities:

```text
Link Creation
Normalization
Duplicate Detection
Status Tracking
```

---

## Link Lifecycle

```text
NEW
 ↓
PENDING_CONVERSION
 ↓
CONVERTED
 ↓
BROADCASTED
```

---

# 11. Conversion Module

Purpose:

```text
Send Links To Converter Bot
```

Internal Components:

```text
Batch Builder
Converter Sender
Converter Listener
Response Parser
```

---

## Flow

```text
Links
 ↓
Batch Builder
 ↓
Converter Bot
 ↓
Converted Links
```

---

# 12. Broadcast Module

Purpose:

```text
Publish Converted Links
```

Flow:

```text
Converted Link
 ↓
Create Tasks
 ↓
Broadcast Worker
 ↓
Destination Channel
```

---

# 13. Media Module

Purpose:

```text
Media Download
Media Storage
Media Reuse
```

Used by:

```text
Monitoring
Broadcasting
```

---

# 14. Database Collections

---

## Accounts

```text
accounts
```

Stores:

```text
Account Metadata
```

---

## Messages

```text
messages
```

Stores:

```text
Source Messages
```

---

## Links

```text
links
```

Stores:

```text
Extracted Links
```

---

## Conversion Batches

```text
conversionBatches
```

Stores:

```text
Batch Information
```

---

## Broadcast Tasks

```text
broadcastTasks
```

Stores:

```text
Publishing Queue
```

---

# 15. Logging Architecture

---

## Development

Maximum logging.

Levels:

```text
TRACE
DEBUG
INFO
WARN
ERROR
```

Log:

```text
Client Creation
Telegram Events
Mongo Queries
Message Processing
Link Extraction
Duplicate Detection
```

---

## Production

Reduced logging.

Levels:

```text
INFO
WARN
ERROR
```

Log:

```text
Startup
Shutdown
FloodWait
Reconnect
Failures
Important Events
```

---

## Storage

```text
Console
+
File
```

---

## Rotation

```text
Daily Rotation
```

Retention:

```text
5 Days
```

Configurable.

---

# 16. CLI Architecture

---

## Commands

Only two top-level commands.

### Interactive Mode

```bash
teleauto
```

Launches:

```text
Accounts
Channels
System
Logs
Exit
```

---

### Runtime Mode

```bash
teleauto start
```

Starts platform.

---

## Design Goal

Avoid:

```bash
teleauto account add
teleauto account list
teleauto ...
```

Prefer interactive menus.

---

# 17. Error Handling

---

## FloodWait

```text
Telegram Error
      ↓
FloodWait Handler
      ↓
Sleep
      ↓
Retry
```

---

## Disconnect

```text
Connection Lost
      ↓
Reconnect Manager
      ↓
Reconnect Client
```

---

# 18. Session Storage

Directory:

```text
storage/
 └── sessions/
```

Example:

```text
storage/sessions/acc001.session
```

---

# 19. Current Development Status

Completed Architecture:

```text
✓ Account Model
✓ Session Model
✓ Client Model
✓ Single Listener Design
✓ Event Router Design
✓ Monitoring Flow
✓ Link Flow
✓ Conversion Flow
✓ Broadcast Flow
✓ Logging Design
✓ CLI Design
✓ Startup Flow
```

Partially Implemented Modules:

```text
✓ Session Manager
✓ Client Manager
✓ Event Router
✓ Listener Registration
✓ FloodWait Handler
✓ Reconnect Manager
```

Remaining For Full Phase 1:

```text
□ Real Login Wizard
□ Account Management UI
□ Source Channel Loader
□ Monitoring Pipeline
□ Mongo Integration Wiring
□ Duplicate Detection Persistence
□ Production Logger
□ Full Runtime Bootstrap
```

---

# Final Execution Flow

```text
Start
 ↓
Load Config
 ↓
Load Accounts
 ↓
Load Sessions
 ↓
Create Clients
 ↓
Connect Telegram
 ↓
Register Listener
 ↓
Wait For Events
 ↓
New Message
 ↓
Event Router
 ↓
Source Filter
 ↓
Monitoring Service
 ↓
Extract Links
 ↓
Normalize URLs
 ↓
Duplicate Detection
 ↓
Mongo Save
 ↓
Conversion
 ↓
Broadcast
 ↓
Complete
```

This architecture is currently the most consistent design derived from all project documents and the decisions made throughout this chat, while preserving your core requirement of **maximum code reusability** and the **single-client, single-listener architecture**.
