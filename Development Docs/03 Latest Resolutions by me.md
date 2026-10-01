# 1 Account - 1 Session - 1 Client (Most important Rule)

## Explanation

### 1. What is a Telegram Session?

- A Telegram session is the **saved login state** of a Telegram account.
- When you login once using - Phone Number + OTP Code + (2FA Password if enabled) Telegram gives your application authorization data.
  - That authorization data is stored in a **session file**. Example: "account1.session" As long as this session is valid No OTP required again, No Login required again The application can reconnect automatically.
- Simple Words - Think of a session like: Browser Login Cookie When you login to Gmail and close the browser, you don't login again every time. Why? Because Gmail saved your login state. Telegram session is exactly that saved login state.

### 2. What is a Telegram Client?

- A Telegram client is the **active connection** between your application and Telegram servers. Example:
  account1.session -> Telegram Client -> Telegram Servers
  The client can: Send Messages, Receive Messages, Listen Events, Download Media, Upload Media, Read History, Join Channels.
  The client is the object your code uses to talk to Telegram.
- Simple Words -
  Session = Saved Login
  Client = Logged-in Telegram App running inside your code
  Example: Your Mobile Telegram App is a Telegram client. Similarly: Node.js Program can also run a Telegram client.

### 3. How Does a Listener Work?

- A listener waits for Telegram events. Example: Someone sends a message. Telegram server notifies your client. Your listener receives the event. Flow:
  New Message -> Telegram Server -> Telegram Client -> Listener -> Your Code
  Example: Channel receives: "Hello World"
  Listener gets notified: Message Received Then your code executes.

# 1 Client - 1 Listener - 1 Sender

## Listener -

- No separate listeners for monitoring, conversion, and broadcasting on separate clients. One client and one top-level listener per account is the cleanest and safest architecture.
  <!-- -------------------------------------------------- -->
  <!-- -------------------------------------------------- -->
  <!-- -------------------------------------------------- -->
  Based on the three documents **with Development Useful Point having highest priority**, and your requirement of **maximum code reusability**, I would design TeleAuto as follows.

---

# High Level Architecture

```text
CLI
 ↓

Application

 ├── Config Manager
 ├── Session Manager
 ├── Telegram Client Manager
 ├── Telegram Event Router
 ├── Worker Scheduler
 └── MongoDB

                ↓

        Business Modules

 ├── Monitoring Module
 ├── Link Module
 ├── Conversion Module
 ├── Broadcast Module
 └── Media Module
```

---

# Simple Explanation

Think of TeleAuto as a factory.

```text
Source Channel
      ↓
Message
      ↓
Link
      ↓
Conversion
      ↓
Broadcast
      ↓
Archive
```

Every module only does one job.

---

# Core Layer

These modules know nothing about business logic.

They are reusable infrastructure.

---

## Config Manager

Responsible for:

```text
accounts.json
source-channels.json
destination-channels.json
```

Loads configuration.

Nothing else.

---

## Session Manager

Responsible for:

```text
Load Session
Validate Session
Reconnect Session
```

Simple:

```text
Account
↓
Session
```

---

## Telegram Client Manager

Responsible for:

```text
Create Client
Start Client
Stop Client
Get Client
```

Rule:

```text
1 Account
↓
1 Client
```

Example:

```text
Account A
↓
Client A

Account B
↓
Client B
```

---

## Telegram Event Router

Most important module.

Only place listening to Telegram.

```text
Telegram Message
      ↓
Event Router
      ↓
Correct Module
```

Example:

```text
Source Channel Message
      ↓
Monitoring Module

Converter Bot Message
      ↓
Conversion Module
```

---

# Monitoring Module

Purpose:

```text
Watch Source Channels
```

Flow:

```text
New Channel Message
      ↓
Contains Supported Link?
      ↓
YES
      ↓
Store Message
      ↓
Extract Links
      ↓
Create Link Records
```

Nothing else.

No conversion.

No broadcasting.

---

# Link Module

Purpose:

```text
Link Management
```

Responsibilities:

```text
Normalization
Duplicate Detection
Link Creation
Link Updates
```

Flow:

```text
Raw URL
      ↓
Normalize
      ↓
Duplicate Check
      ↓
Insert Link
```

This becomes the central business collection.

---

# Conversion Module

Purpose:

```text
Convert Links
```

Internally divided into:

```text
Batch Builder
Converter Sender
Converter Listener
Parser
```

---

## Batch Builder

Runs every few seconds.

Looks for:

```text
PENDING
```

links.

If:

```text
pending >= batchSize
```

create batch.

As required in Development Notes.

---

## Converter Sender

Builds:

```text
LINK_ID - URL
```

format.

Sends to converter bot.

Stores:

```text
telegramMessageId
```

Updates:

```text
BATCHED
↓
BATCH_SENT
↓
WAITING_RESPONSE
```

---

## Converter Listener

Receives converter bot messages.

Flow:

```text
Converter Message
      ↓
Verify Sender
      ↓
Find Active Batch
      ↓
Parse IDs
      ↓
Update Links
```

No reply matching.

No positional matching.

Only:

```text
LINK_ID
```

matching.

---

# Broadcast Module

Purpose:

```text
Publish Converted Links
```

---

## Task Creator

When conversion completed:

```text
Link
↓
Create Broadcast Tasks
```

Example:

```text
5 Destination Channels
```

creates:

```text
5 Broadcast Tasks
```

---

## Broadcast Worker

Flow:

```text
Queued Task
      ↓
Find Destination Channel
      ↓
Find Owner Account
      ↓
Get Client
      ↓
Send Message
```

Updates task status.

---

# Media Module

Purpose:

```text
Download Media
Store Media
Provide Media
```

Monitoring module uses it.

Broadcast module uses it.

Maximum reuse.

---

# Shared Telegram Service

This is the most reusable component.

Every module uses it.

```text
TelegramMessageService
```

Methods:

```text
sendMessage()
sendMedia()
downloadMedia()
fetchHistory()
```

Nobody talks directly to Telegram client.

Instead:

```text
Module
↓
Telegram Service
↓
Client Manager
↓
Telegram Client
```

This keeps code reusable.

---

# Database Flow

```text
messages
    ↓
links
    ↓
conversionBatches
    ↓
broadcastTasks
```

Exactly matching your workflow.

---

# Actual Runtime Flow

```text
Source Channel
      ↓
Monitoring Module
      ↓
Messages Collection
      ↓
Links Collection
      ↓
Conversion Module
      ↓
Converter Bot
      ↓
Converted Links
      ↓
Broadcast Module
      ↓
Destination Channels
      ↓
Archive
```

---

# Final Architecture I Would Use

```text
Config Manager
       ↓

Session Manager
       ↓

Telegram Client Manager
       ↓

Telegram Event Router
       ↓

 ┌─────────────────────┐
 │ Monitoring Module   │
 ├─────────────────────┤
 │ Link Module         │
 ├─────────────────────┤
 │ Conversion Module   │
 ├─────────────────────┤
 │ Broadcast Module    │
 ├─────────────────────┤
 │ Media Module        │
 └─────────────────────┘

       ↓

MongoDB
```

### Why this architecture?

Because it satisfies all three documents and gives:

```text
Maximum Code Reuse
Single Client Per Account
Single Listener Per Account
Clear Separation Of Concerns
Easy Testing
Future Multi-Account Support
Future Multi-Channel Support
No Redesign Required
```

The next thing we should design is the **exact execution flow from application startup → session loading → client creation → listener registration → history sync → live monitoring**, because that determines how all workers interact with Telegram.

<!-- -------------------------------------- -->
<!-- -------------------------------------- -->
<!-- -------------------------------------- -->

Good. Let's design only the execution flow.

# Startup Flow

When user runs:

```text
node index.js
```

Flow:

```text
Load Config
↓
Connect MongoDB
↓
Load Accounts
↓
Load Sessions
↓
Create Telegram Clients
↓
Connect Clients
↓
Register Listeners
↓
History Sync
↓
Start Workers
↓
Live Monitoring
```

---

# Phase 1 — Load Config

Load:

```text
accounts.json
source-channels.json
destination-channels.json
```

Build in-memory registry:

```js
{
  accounts: [],
  sourceChannels: [],
  destinationChannels: []
}
```

---

# Phase 2 — Connect MongoDB

Create:

```text
Mongo Connection
```

Verify:

```text
messages
links
conversionBatches
broadcastTasks
media
```

collections accessible.

---

# Phase 3 — Load Sessions

For every account:

```text
Account A
↓
Load Session

Account B
↓
Load Session
```

Example:

```text
Account A
→ sessionA

Account B
→ sessionB
```

No Telegram connection yet.

Just loading session data.

---

# Phase 4 — Create Clients

For every account:

```text
Session
↓
Create Client
```

Example:

```text
Account A
↓
Client A

Account B
↓
Client B
```

Store in:

```js
clientRegistry;
```

Example:

```js
Map<
 accountId,
 telegramClient
>
```

---

# Phase 5 — Connect Clients

Now connect:

```text
Client A
↓
Telegram

Client B
↓
Telegram
```

Verify:

```text
Authorized
Connected
```

If invalid:

```text
REQUIRES_LOGIN
```

---

# Phase 6 — Register Listeners

Now attach listeners.

Important:

Client first.

Listeners second.

History third.

Never reverse this.

---

Example:

```text
Client A
↓
Register Listener

Client B
↓
Register Listener
```

---

Listener structure:

```text
Client
↓
Telegram Event Router
```

Only one listener.

Example:

```text
New Message
↓
Router
```

---

# Why Before History?

Because:

```text
History Sync Running
```

and

```text
New Message Arrives
```

can happen simultaneously.

If listener not registered:

```text
Message Lost
```

---

# Phase 7 — History Sync

Now recover old messages.

For every source channel:

```text
Source Channel
↓
Fetch History
```

Example:

```text
Channel A
↓
Last 100 Messages

Channel B
↓
Last 100 Messages
```

or:

```text
Fetch Until
lastTelegramMessageId
```

depending on final design.

---

Each fetched message goes through same pipeline:

```text
History Message
↓
Monitoring Module
↓
Link Extraction
↓
Link Creation
```

No special logic.

Reuse same code.

---

# Important Rule

Do NOT create:

```text
History Processor
```

and

```text
Live Processor
```

separately.

Instead:

```text
History Message
↓
processIncomingMessage()

Live Message
↓
processIncomingMessage()
```

Same function.

Maximum reuse.

---

# Phase 8 — History Complete

When all source channels done:

```text
PENDING_HISTORY
↓
READY
```

Now monitoring officially active.

---

# Phase 9 — Start Workers

Start background workers.

Example:

```text
Batch Builder Worker
Broadcast Worker
Cleanup Worker
```

---

Recommended order:

```text
Batch Builder
↓
Converter Sender
↓
Broadcast Worker
↓
Cleanup Worker
```

---

# Phase 10 — Live Monitoring

Now system fully running.

Flow:

```text
New Telegram Message
↓
Client
↓
Listener
↓
Router
↓
Monitoring Module
↓
Links
↓
Conversion
↓
Broadcast
```

---

# Real Runtime Example

System running:

```text
Account A
↓
Client A
```

New channel message:

```text
Watch Movie

https://terabox.com/abc
```

Telegram sends event:

```text
New Message
```

Listener receives:

```text
Message Event
```

Router checks:

```text
Source Channel ?
```

Yes.

Send to:

```text
Monitoring Module
```

Monitoring:

```text
Extract Link
↓
Normalize
↓
Duplicate Check
↓
Create Link
```

Done.

No direct conversion.

No direct broadcasting.

Workers handle those later.

---

# Final Startup Sequence

```text
node index.js
        ↓
Load Config
        ↓
Connect MongoDB
        ↓
Load Sessions
        ↓
Create Clients
        ↓
Connect Clients
        ↓
Register Listeners
        ↓
History Sync
        ↓
Channels READY
        ↓
Start Workers
        ↓
Live Monitoring
```

This is the sequence I would use because it avoids missed messages, reuses the same processing pipeline for history and live events, and follows the single-client-per-account architecture from your documents.
