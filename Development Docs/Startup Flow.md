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
clientRegistry
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
