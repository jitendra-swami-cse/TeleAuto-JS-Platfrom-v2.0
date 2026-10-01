# TeleAuto Platform - Comprehensive Development Plan

**Status:** Active Development
**Current Phase:** Transitioning to Phase 1C

---

## 1. Architectural Rules & Core Principles

Before writing any code, every developer must adhere to these strict architectural rules discovered through testing and design:

### 1.1 The "One Telegram Client" Rule
*   **Rule:** 1 Account = 1 Session = 1 Telegram Client.
*   **Why:** Creating multiple clients for monitoring, conversion, and broadcasting causes missed events, connection drops, and rate limits (FloodWait).
*   **How:** Everything must route through the `ClientManager`. 

### 1.2 The "Single Listener" Architecture
*   **Rule:** Each Telegram Client has exactly ONE top-level event listener (e.g., `NewMessage`).
*   **Why:** Multiple listeners cause race conditions and unpredictable event consumption.
*   **How:** The `ListenerManager` catches the event and passes it to the `EventRouter`, which acts as a traffic cop directing it to the correct business module (`MonitoringModule`, `ConversionModule`, etc.).

### 1.3 Configuration vs. Database Separation
*   **Configuration (`src/config/*.json`):** Holds operational data that defines *how* the system runs (Accounts, Source Channels, Destination Channels, App Settings).
*   **Database (MongoDB):** Holds *business history* (Messages, Links, Conversion Batches, Broadcast Tasks).
*   **Why:** Portability. If you move servers, you don't lose your operational settings just because the database was wiped.

### 1.4 Module Singleton Pattern
*   **Rule:** Core managers (`ConfigManager`, `SessionManager`, `ClientManager`) are instantiated and exported as singletons.
*   **Why:** Node.js caches `require()` calls. Exporting `new ConfigManager()` ensures that no matter how many files require it, they all share the exact same configuration data in memory without overhead.

---

## 2. Database Design Philosophy (MongoDB)

*   **Primary Keys:** Always use MongoDB `ObjectId` internally. Never use Telegram IDs as primary keys.
*   **Denormalization:** Optimize for fast worker queries. A worker checking for pending links shouldn't need a complex JOIN. Put everything the worker needs directly on the `Link` document (e.g., `sourceChannelId`, `status`).
*   **Never Delete Links:** Links are the core business entity. They move from `PENDING` -> `BATCHED` -> `BATCH_SENT` -> `COMPLETED` -> `TASKS_CREATED` -> `BROADCASTING` -> `ARCHIVED`. They are never deleted so we preserve historical data for deduplication and audits.

---

## 3. Development Phases (Vertical Slice Strategy)

We are developing vertically. Each phase must result in a runnable, testable slice of the platform.

### Phase 1: The Monitoring Foundation
*   ✅ **Phase 1A: Telegram Foundation** - Setup ConfigManager, SessionManager, ClientManager, Login Wizard, and CLI entry point.
*   ✅ **Phase 1B: Listener Runtime** - Setup ListenerManager, EventRouter, SourceChannelFilter, and route messages to the MonitoringModule.
*   ⏳ **Phase 1C: Monitoring Pipeline (Next)** - Build Mongoose models for `Message` and `Link`. Implement link extraction, URL normalization (to handle domain aliases), duplicate detection, and save them to MongoDB. Enforce the `messageCacheLimit`.

### Phase 2: The Conversion System
*   **Goal:** Convert links automatically.
*   **Key Modules:** `BatchBuilder`, `ConverterSender`, `ConverterListener`, `ResponseParser`.
*   **Critical Rules:** 
    *   Strict Batch Size: Do NOT send a batch until `pendingLinks >= config.batchSize`.
    *   Batch Locking: Max 1 active batch in state `SENT` or `WAITING_RESPONSE`.
    *   Template Formatting: Send links to bot as `1. - LINK_ID - URL |` to ensure deterministic parsing on response.

### Phase 3: The Broadcasting System
*   **Goal:** Publish converted links to destination channels.
*   **Key Modules:** `BroadcastTaskCreator`, `BroadcastWorker`.
*   **Flow:** Once a link is `COMPLETED` (converted), generate a `BroadcastTask` for every enabled destination channel. The worker picks up queued tasks, formats the message with captions/media, and sends it.

### Phase 4: Operational Layer & Media
*   **Goal:** Media preservation and system stability.
*   **Key Modules:** `MediaModule`, `WinstonLogger`, `CrashRecovery`.
*   **Flow:** Download files using the `mediaId` format (`YYYYMMDD-HHMMSS-SEQ`).

### Phase 5: Final Interactive CLI
*   **Goal:** Make administration easy.
*   **Flow:** Expand the `commander` CLI to include interactive menus for checking stats, managing channels, and viewing pending links without touching MongoDB directly.

### Phase 6: History Sync
*   **Goal:** Fetch past messages on startup.
*   **Critical Rule:** Do not write a separate history processor. Pass historical messages through the exact same `MonitoringModule.processMessage()` function used for live messages to guarantee 100% code reuse.

---

## 4. Known Pitfalls to Avoid

1.  **Multiple Telegram Clients:** Do not spawn a new client to send a conversion message. Use the existing one.
2.  **Assuming Converter Replies:** Converter bots often send entirely *new* messages instead of *replies*. Do not rely on `replyToMsgId` for parsing. Rely on the `LINK_ID` injected into the template.
3.  **Invalid Link Silence:** If the bot cannot convert a link, it might return the original link or an empty string. Handle this gracefully as `FAILED` rather than breaking the parser.
