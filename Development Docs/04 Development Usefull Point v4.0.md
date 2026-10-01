This is probably the most valuable document to create right now. If another developer started TeleAuto from only the PRD and Helping Document, they would likely repeat many of the same mistakes we already discovered through testing.

---

# TeleAuto JS v1.0

## Development Lessons Learned & Architecture Notes

### Purpose

This document captures practical knowledge discovered during implementation and testing that is not obvious from the PRD alone.

A future developer should read this before writing any code.

---

# 1. Telegram Architecture

## Critical Rule

```text
1 Telegram Account
↓
1 Telegram Client
↓
Many Features
```

Never create separate Telegram clients for:

```text
Monitoring
Converter Sender
Converter Listener
Broadcasting
```

All features must share the same Telegram client instance.

---

## Why

Creating multiple clients causes:

```text
Missed Events
Duplicate Connections
Session Problems
Hard-to-Debug Issues
Higher Resource Usage
```

---

## Recommended Design

```text
TelegramClientManager
↓
Telegram Client
↓
Telegram Event Router
 ├─ Source Channel Handler
 ├─ Converter Bot Handler
 ├─ Broadcast Handler
 └─ Future Features
```

---

# 2. Source Channels Should Not Live In MongoDB

We discovered portability problems.

If the system moves to another machine:

```text
MongoDB Restored?
No
```

Then:

```text
Accounts Missing
Channels Missing
Configuration Missing
```

---

## Recommended Storage

Store operational configuration in:

```text
config/accounts.json
config/source-channels.json
config/destination-channels.json
```

Store only business data in MongoDB.

---

## MongoDB Should Contain

```text
Messages
Links
Conversion Batches
Broadcast Tasks
Audit Data
History
```

---

# 3. Duplicate Detection

Duplicate detection already works.

However logs must explicitly show duplicates.

Recommended:

```text
Duplicate Link Detected:
https://example.com
```

instead of silently ignoring.

---

# 4. Batch Size Is Mandatory

This is extremely important.

---

## Wrong Behavior

Create batch whenever:

```text
pendingLinks > 0
```

This causes:

```text
1 link batch
2 link batch
3 link batch
```

which is not desired.

---

## Correct Behavior

Batch creation must happen only when:

```text
pendingLinks >= BATCH_SIZE
```

Example:

```text
BATCH_SIZE = 10
```

---

### 5 Links Pending

```text
NO BATCH
```

---

### 9 Links Pending

```text
NO BATCH
```

---

### 10 Links Pending

```text
CREATE BATCH
```

---

# 5. Batch Locking

Extremely important.

---

## Problem

If:

```text
Batch A Sent
```

and response not received yet

then:

```text
Batch B
Batch C
Batch D
```

must NOT be sent.

---

## Why

Converter bot is stateful.

Multiple simultaneous requests create ambiguity.

---

## Correct Rule

Maximum active batch:

```text
1
```

---

Allowed States:

```text
CREATED
SENT
WAITING_RESPONSE
```

If any batch exists in those states:

```text
DO NOT SEND NEW BATCH
```

---

# 6. Converter Message Template

This was one of the biggest discoveries.

---

## Bad Template

```text
https://linkA
https://linkB
https://linkC
```

Impossible to correlate responses reliably.

---

## Good Template

```text
1. - LINK_ID - URL |
2. - LINK_ID - URL |
3. - LINK_ID - URL |
```

Example:

```text
1. - 6abb123... - https://linkA |
```

---

## Why

The bot preserves IDs.

Replies become deterministic.

---

# 7. Converter Parser Strategy

The parser should never rely on ordering.

Use:

```text
Mongo ObjectId
```

as primary identifier.

---

## Parse Pattern

```text
LINK_ID
↓
Converted URL
```

Example:

```text
6abb123...
↓
https://1024terabox.com/...
```

---

# 8. Invalid Link Behavior

Discovered through testing.

Bot may respond in two ways.

---

## Scenario A

Returns original link.

Example:

```text
ID - OriginalLink
```

Interpretation:

```text
FAILED
```

---

## Scenario B

Returns empty value.

Example:

```text
ID -
```

Interpretation:

```text
FAILED
```

---

## Never Assume

```text
Every line contains converted URL
```

because this is false.

---

# 9. Converter Bot Responses

The bot sends:

```text
New Message
```

not

```text
Reply Message
```

This is critical.

Do not depend on:

```text
replyToMessage
```

matching.

---

Use:

```text
Batch State
+
Sender Verification
+
Parsed IDs
```

instead.

---

# 10. Required Logging

TeleAuto was difficult to debug because logs were insufficient.

Every worker should log.

---

## Monitoring

```text
Monitoring Account Started
Monitoring Source Started
Message Received
Links Captured
```

---

## Batch Builder

```text
Batch Created
Batch Size
Links Assigned
```

---

## Converter Sender

```text
Batch Sent
Telegram Message ID
```

---

## Converter Listener

```text
Converter Message Received
Sender Verified
Active Batch Found
Parsed Links
Converted Count
Failed Count
Batch Completed
```

---

# 11. Status Lifecycle

Recommended lifecycle:

```text
PENDING
↓
BATCHED
↓
BATCH_SENT
↓
COMPLETED
```

or

```text
PENDING
↓
BATCHED
↓
BATCH_SENT
↓
FAILED
```

---

## Avoid

```text
ASSIGNED
```

It created confusion during testing.

`BATCHED` is much clearer.

---

# 12. MongoDB Is Business History

Never delete links.

---

Keep:

```text
Original URL
Converted URL
Batch History
Broadcast History
Failure History
```

---

Reason:

```text
Duplicate Detection
Audits
Troubleshooting
Future Re-broadcast
Reporting
```

---

# 13. Future Scaling Assumptions

Current testing:

```text
1 Account
1 Source Channel
1 Destination Channel
```

Future architecture must support:

```text
N Accounts
N Source Channels
N Destination Channels
```

without redesign.

---

# 14. Biggest Mistakes We Made

### Mistake 1

Multiple Telegram clients.

---

### Mistake 2

Sending batches smaller than configured size.

---

### Mistake 3

Insufficient logging.

---

### Mistake 4

Using ambiguous converter message formats.

---

### Mistake 5

Treating converter responses as replies.

They are new messages.

---

### Mistake 6

Not locking active batches.

---

# Final Recommendation

If someone starts TeleAuto from scratch:

Implement in this order:

```text
Telegram Client Manager
↓
Telegram Event Router
↓
Monitoring
↓
Duplicate Detection
↓
Batch Builder
↓
Batch Locking
↓
Converter Sender
↓
Converter Listener
↓
Parser
↓
Broadcast System
```

Following this order would likely eliminate most of the debugging time we spent and produce a more scalable implementation from the beginning.
