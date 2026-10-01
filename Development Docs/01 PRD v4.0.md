# TeleAuto JS v1.0

## Product Requirements Document (PRD)

### Part 1

- Executive Summary
- Goals
- Non-Goals
- Terminology
- Product Overview
- System Architecture Overview
- Core Design Principles

---

# 1. Executive Summary

## 1.1 Purpose

TeleAuto JS v1.0 is a Node.js-based Telegram automation platform designed to monitor Telegram channels, discover configured file-sharing links, process those links through a conversion workflow, and distribute converted links to one or more destination channels.

The system is intended to operate continuously with minimal operator intervention while providing sufficient visibility, traceability, and administrative control through a command-line interface.

The platform is designed around a link-centric workflow where links discovered in monitored Telegram channels become business entities that move through a controlled lifecycle:

```text
Discovery
→ Conversion
→ Broadcasting
→ Archival
```

TeleAuto maintains historical records of processed links, conversion activity, and broadcast activity while avoiding unnecessary infrastructure complexity.

---

## 1.2 Intended Users

The primary user of TeleAuto is a system operator who:

- Owns or controls one or more Telegram accounts.
- Monitors Telegram channels for configured links.
- Converts those links using converter bots.
- Broadcasts converted links to destination channels.
- Requires operational visibility and reporting.
- Prefers CLI-based administration.

---

## 1.3 Product Vision

TeleAuto should provide a reliable, maintainable, and deployable automation system that can run on modest hardware without requiring enterprise-scale infrastructure.

The platform should remain:

- Easy to deploy.
- Easy to operate.
- Easy to understand.
- Easy to extend.

while supporting future enhancements without requiring major architectural redesign.

---

# 2. Goals

## 2.1 Primary Goals

### G-01: Automated Monitoring

The system shall monitor configured Telegram source channels and detect messages containing configured link domains.

---

### G-02: Automated Link Processing

The system shall automatically extract, normalize, deduplicate, and process supported links.

---

### G-03: Automated Link Conversion

The system shall support automated link conversion through Telegram converter bots.

---

### G-04: Automated Broadcasting

The system shall automatically broadcast converted links to configured destination channels.

---

### G-05: Media Preservation

The system shall download and preserve media associated with qualifying source messages.

---

### G-06: Historical Traceability

The system shall retain historical records of:

- Processed links
- Conversion batches
- Broadcast tasks

for reporting, auditing, troubleshooting, and future enhancements.

---

### G-07: Operational Visibility

The system shall expose operational information through administrative CLI commands.

Examples include:

- Accounts
- Channels
- Links
- Messages
- Conversion batches
- Broadcast tasks
- Statistics
- Exports

---

### G-08: Simple Deployment

The system shall run as a single Node.js application.

Example:

```bash
node index.js
```

No distributed deployment should be required.

---

### G-09: Resource Efficiency

The platform shall remain suitable for:

- Personal computers
- VPS servers
- Dedicated servers
- Termux environments

without requiring significant infrastructure resources.

---

# 3. Non-Goals

The following items are explicitly outside the scope of TeleAuto JS v1.0.

---

## NG-01: Web User Interface

A web interface is not part of MVP scope.

Administration will be performed through CLI.

---

## NG-02: Distributed Architecture

TeleAuto JS v1.0 will not implement:

- Distributed workers
- Multi-node clusters
- Service mesh architectures

---

## NG-03: Message Queue Infrastructure

The MVP will not require:

- RabbitMQ
- Kafka
- Redis Queue
- BullMQ
- ActiveMQ

MongoDB-backed task collections are sufficient.

---

## NG-04: Advanced Monitoring Infrastructure

The MVP will not require:

- Prometheus
- Grafana
- ELK Stack
- OpenTelemetry

---

## NG-05: Multiple Conversion Accounts

The MVP supports only one conversion account.

Multi-account conversion strategies are future scope.

---

## NG-06: Automatic Retry Frameworks

The MVP will not implement:

- Conversion retries
- Retry scheduling
- Retry backoff strategies

Failed operations remain failed until manually reviewed.

---

## NG-07: Complex Channel Ownership

The MVP assumes:

```text
One Channel
→ One Owner Account
```

Scenarios where multiple accounts share ownership of the same channel are future scope.

---

## NG-08: Dynamic Template Management

Broadcast and conversion templates will not be managed through database-driven administration.

Templates will be configuration-based.

---

## NG-09: Real-Time Analytics Platform

The MVP is not intended to provide:

- Business intelligence dashboards
- Real-time analytics systems
- Advanced reporting engines

---

# 4. Terminology

## Account

A Telegram account managed by TeleAuto.

Accounts may perform:

- Monitoring
- Conversion
- Broadcasting

depending on configuration.

---

## Source Channel

A Telegram channel monitored by TeleAuto for incoming messages.

---

## Destination Channel

A Telegram channel used as a broadcast target.

---

## Message

A Telegram message that contains at least one configured link and therefore qualifies for processing.

---

## Link

The primary business entity within TeleAuto.

A link progresses through discovery, conversion, broadcasting, and archival workflows.

---

## Normalized Link

A canonical representation of a link used for duplicate detection.

Normalization rules include:

- Lowercase hostname
- Remove protocol
- Remove trailing slash
- Ignore query parameters
- Ignore fragments

---

## Conversion Batch

A group of links submitted together to a converter bot.

---

## Converter Provider

A logical abstraction representing a converter bot.

Example:

```json
{
  "name": "Provider A",
  "username": "@providerA",
  "enabled": true
}
```

---

## Broadcast Task

A unit of work representing a single broadcast operation to a destination channel.

One broadcast task is created for each destination channel.

---

## Media

Files attached to qualifying Telegram messages and stored on the filesystem.

---

## Scheduler

The internal module responsible for periodic system activities.

Examples:

- Batch creation
- Cleanup jobs
- Maintenance operations

---

## Archival

The final state of a processed link after all required broadcasting activities have completed successfully.

---

# 5. Product Overview

## 5.1 High-Level Workflow

TeleAuto performs the following sequence:

```text
Source Channel Message
↓
Link Detection
↓
Message Recording
↓
Media Download
↓
Link Creation
↓
Duplicate Detection
↓
Conversion Batch Creation
↓
Converter Bot Processing
↓
Converted Link Storage
↓
Broadcast Task Creation
↓
Destination Channel Broadcasting
↓
Archival
```

---

## 5.2 Core Business Entity

The Link entity is the central business object within TeleAuto.

All major workflows ultimately revolve around the processing of links.

Examples:

```text
Monitoring
→ Creates Links

Conversion
→ Updates Links

Broadcasting
→ Uses Links

Archival
→ Finalizes Links
```

---

## 5.3 Data Retention Philosophy

TeleAuto favors historical preservation over deletion.

Examples:

- Links are archived rather than deleted.
- Conversion history is preserved.
- Broadcast history is preserved.

This approach supports:

- Troubleshooting
- Reporting
- Future rebroadcast features
- Operational audits

---

# 6. System Architecture Overview

## 6.1 Runtime Model

TeleAuto operates as a single Node.js process.

Example:

```bash
node index.js
```

All system components execute within the same runtime.

---

## 6.2 Major Components

```text
TeleAuto

├── Session Manager
├── Monitoring Worker
├── Recorder Worker
├── Conversion Worker
├── Broadcast Worker
├── Scheduler Worker
└── Admin CLI
```

---

## 6.3 Session Manager

Responsible for:

- Session loading
- Session validation
- Login state management
- Account readiness

---

## 6.4 Monitoring Worker

Responsible for:

- Source channel monitoring
- Message reception
- Link detection
- Message processing initiation

---

## 6.5 Recorder Worker

Responsible for:

- Message persistence
- Media metadata persistence
- Message cache maintenance

---

## 6.6 Conversion Worker

Responsible for:

- Batch creation
- Converter communication
- Response parsing
- Link updates

---

## 6.7 Broadcast Worker

Responsible for:

- Broadcast task execution
- Destination channel delivery
- Broadcast status updates
- Link archival

---

## 6.8 Scheduler Worker

Responsible for:

- Periodic jobs
- Batch scheduling
- Maintenance operations
- Cleanup operations

---

## 6.9 Admin CLI

Responsible for:

- Administration
- Inspection
- Statistics
- Export operations
- Operational management

---

# 7. Core Design Principles

## DP-01: Simplicity First

Architectural simplicity takes precedence over unnecessary scalability mechanisms.

---

## DP-02: Single Process Execution

The system shall remain deployable through:

```bash
node index.js
```

without requiring orchestration platforms.

---

## DP-03: MongoDB-Centric Persistence

MongoDB is the primary persistence mechanism.

No secondary queue infrastructure is required.

---

## DP-04: Filesystem-Based Media Storage

Media files shall be stored on the filesystem rather than inside MongoDB.

MongoDB stores metadata only.

---

## DP-05: Link-Centric Design

Links are the primary business entity and drive the majority of workflows.

---

## DP-06: Operational Transparency

The operator should be able to inspect and manage the system without direct database access.

---

## DP-07: Historical Preservation

Historical business records should be preserved whenever practical.

Archival is preferred over deletion.

---

## DP-08: Future Extensibility

The architecture should permit future expansion without requiring fundamental redesign.

Examples include:

- Multiple converter accounts
- Advanced broadcast rules
- Web UI administration
- Additional provider types

---

## DP-09: Minimal Infrastructure Dependency

The MVP should avoid dependencies that introduce operational complexity without proportional value.

---

## DP-10: Explicit Workflow State

Business entities should maintain explicit workflow states to simplify:

- Debugging
- Reporting
- Troubleshooting
- Recovery

# TeleAuto JS v1.0

## Product Requirements Document (PRD)

### Part 2

- Account Management
- Session Management
- Source Channel Management
- Destination Channel Management

---

# 8. Account Management

## 8.1 Overview

An Account represents a Telegram user account that has been configured within TeleAuto.

Accounts provide the operational identity used by the system to interact with Telegram.

Depending on configuration, an account may perform one or more responsibilities:

```text
Monitoring
Conversion
Broadcasting
```

---

## 8.2 Account Capabilities

Each account shall support independent capability flags.

Example:

```text
Account A

Monitoring    = Enabled
Conversion    = Enabled
Broadcasting  = Enabled
```

```text
Account B

Monitoring    = Enabled
Conversion    = Disabled
Broadcasting  = Enabled
```

```text
Account C

Monitoring    = Disabled
Conversion    = Disabled
Broadcasting  = Enabled
```

---

## 8.3 Account Lifecycle

An account may exist in one of the following operational states:

```text
ACTIVE
REQUIRES_LOGIN
DISABLED
```

### ACTIVE

The account session is valid and available for use.

---

### REQUIRES_LOGIN

The account requires operator intervention before it can be used.

Examples:

- Session expired
- Session deleted
- Telegram authentication required

---

### DISABLED

The account is intentionally disabled and must not be used by any worker.

---

## 8.4 Account Ownership

Accounts own channels.

Relationships:

```text
Account
├── Source Channels
└── Destination Channels
```

A channel shall have exactly one owner account in MVP scope.

---

## 8.5 Account Requirements

### FR-AM-001

The system shall support multiple Telegram accounts.

---

### FR-AM-002

Accounts shall be individually enabled or disabled.

---

### FR-AM-003

Accounts shall expose separate capability controls for:

```text
Monitoring
Conversion
Broadcasting
```

---

### FR-AM-004

The system shall validate all configured accounts during startup.

---

### FR-AM-005

Invalid sessions shall not prevent startup of other valid accounts.

---

### FR-AM-006

Account information shall be accessible through the Administrative CLI.

---

# 9. Session Management

## 9.1 Overview

The Session Manager is responsible for managing Telegram authentication sessions.

The Session Manager operates within the primary TeleAuto process.

No external session service is required.

---

## 9.2 Session Strategy

TeleAuto JS v1.0 uses:

```text
Single Process Session Management
```

Expected scale:

```text
5 to 20 Accounts
```

This scale does not justify distributed session infrastructure.

---

## 9.3 Startup Session Validation

During startup:

```text
Load Configuration
↓
Load Accounts
↓
Validate Sessions
↓
Continue Startup
```

Each account shall be validated independently.

---

## 9.4 Session Validation Outcomes

### Valid Session

```text
Session Status = ACTIVE
```

The account becomes available for workers.

---

### Invalid Session

```text
Session Status = REQUIRES_LOGIN
```

The account remains unavailable until corrected.

---

## 9.5 Session Isolation

Failure of one account shall not stop:

- Startup
- Monitoring
- Broadcasting
- Conversion

for other valid accounts.

---

## 9.6 Session Requirements

### FR-SM-001

The system shall load all configured account sessions during startup.

---

### FR-SM-002

The system shall validate account sessions before worker startup.

---

### FR-SM-003

The system shall maintain session status information.

---

### FR-SM-004

Session state shall be visible through Administrative CLI commands.

---

### FR-SM-005

Session validation failures shall be logged.

---

# 10. Source Channel Management

## 10.1 Overview

Source Channels are Telegram channels monitored by TeleAuto.

Messages received from source channels are candidates for:

```text
Link Detection
Media Download
Message Recording
Link Creation
```

---

## 10.2 Ownership Model

Each source channel belongs to exactly one account.

Relationship:

```text
Account
↓
Source Channel
```

MVP does not support multi-owner channels.

---

## 10.3 Monitoring Status

A source channel may exist in one of the following states:

```text
PENDING_HISTORY
READY
DISABLED
```

---

### PENDING_HISTORY

Historical synchronization has not completed.

---

### READY

Channel is actively monitored.

---

### DISABLED

Monitoring is intentionally disabled.

---

## 10.4 Startup Recovery Validation

During startup:

```text
Validate Session
↓
Validate Source Channel
↓
Compare Telegram State
↓
Compare Database State
↓
Determine Missing History
↓
Fetch History
↓
Mark READY
```

---

## 10.5 Historical Synchronization

Historical synchronization shall occur:

### Scenario A

When a source channel is added.

---

### Scenario B

When downtime caused missed messages.

---

## 10.6 Historical Fetch Limits

Historical synchronization shall be limited by configuration.

Example:

```json
{
  "maxHistoricalMessages": 1000
}
```

The system shall not attempt unlimited history retrieval.

---

## 10.7 Message Eligibility

A message becomes eligible for processing only when:

```text
Configured Links Detected
```

Messages without configured links shall be ignored.

---

## 10.8 Source Channel Requirements

### FR-SC-001

The system shall support multiple source channels.

---

### FR-SC-002

Each source channel shall belong to one owner account.

---

### FR-SC-003

Source channels shall support enable and disable operations.

---

### FR-SC-004

The system shall perform startup recovery validation for source channels.

---

### FR-SC-005

The system shall support historical synchronization.

---

### FR-SC-006

Historical synchronization limits shall be configurable.

---

### FR-SC-007

Source channel information shall be accessible through Administrative CLI commands.

---

# 11. Destination Channel Management

## 11.1 Overview

Destination Channels are Telegram channels used as broadcast targets.

Converted links are distributed to destination channels through Broadcast Tasks.

---

## 11.2 Ownership Model

Each destination channel belongs to exactly one owner account.

Relationship:

```text
Account
↓
Destination Channel
```

---

## 11.3 Broadcast Availability

A destination channel may be:

```text
Enabled
Disabled
```

and may additionally expose:

```text
availableForBroadcasting
```

to control broadcast eligibility.

---

## 11.4 MVP Broadcast Strategy

TeleAuto JS v1.0 uses:

```text
Broadcast To All Eligible Destination Channels
```

Whenever a converted link is ready for broadcasting:

```text
Converted Link
↓
Destination Channels
↓
Create Broadcast Task Per Channel
```

---

## 11.5 Destination Channel Selection

Eligible channels are:

```text
Enabled
AND
availableForBroadcasting = true
```

---

## 11.6 Broadcast Ownership Constraint

The MVP assumes:

```text
One Destination Channel
↓
One Owner Account
```

Multi-account ownership of the same destination channel is future scope.

---

## 11.7 Destination Channel Requirements

### FR-DC-001

The system shall support multiple destination channels.

---

### FR-DC-002

Each destination channel shall belong to one owner account.

---

### FR-DC-003

Destination channels shall support enable and disable operations.

---

### FR-DC-004

Destination channels shall support broadcast eligibility configuration.

---

### FR-DC-005

The system shall generate broadcast tasks for all eligible destination channels.

---

### FR-DC-006

Destination channel information shall be accessible through Administrative CLI commands.

---

# 12. Ownership Relationship Summary

## Account → Source Channels

```text
One Account
↓
Many Source Channels
```

---

## Account → Destination Channels

```text
One Account
↓
Many Destination Channels
```

---

## Source Channel → Account

```text
One Source Channel
↓
One Account
```

---

## Destination Channel → Account

```text
One Destination Channel
↓
One Account
```

---

## MVP Ownership Constraint

The following scenarios are explicitly out of scope:

```text
Multiple Accounts
↓
Same Source Channel
```

and

```text
Multiple Accounts
↓
Same Destination Channel
```

These may be supported in future versions but shall not influence MVP implementation decisions.

# TeleAuto JS v1.0

## Product Requirements Document (PRD)

### Part 3

- Monitoring System
- Historical Fetching
- Message Processing
- Media Processing

---

# 13. Monitoring System

## 13.1 Overview

The Monitoring System is responsible for observing configured source channels and identifying messages that contain supported link domains.

Monitoring is one of the primary entry points into the TeleAuto processing pipeline.

The Monitoring Worker shall continuously observe all eligible source channels and initiate downstream processing when qualifying messages are detected.

---

## 13.2 Monitoring Responsibilities

The Monitoring Worker shall be responsible for:

```text id="q2j2n7"
Monitoring source channels
Receiving incoming messages
Detecting configured domains
Creating message records
Triggering media downloads
Creating link records
```

The Monitoring Worker shall not perform:

```text id="6mfg0k"
Link conversion
Broadcasting
Retry handling
Administrative operations
```

These responsibilities belong to other system modules.

---

## 13.3 Monitoring Eligibility

A source channel is eligible for monitoring when:

```text id="v8q8zv"
Source Channel Status = READY
```

and

```text id="g9f6gc"
Owner Account Status = ACTIVE
```

and

```text id="w0m0y4"
Monitoring Capability = Enabled
```

---

## 13.4 Message Reception

Upon receiving a Telegram message, the Monitoring Worker shall evaluate the message for supported domains.

Example:

```text id="x7q0m5"
Movie XYZ

https://terabox.com/s/abc123
```

---

## 13.5 Supported Domain Detection

The system shall only process links belonging to configured domains.

Examples:

```text id="a4n4dy"
terabox
terashare
1024tera
1024terabox
terasharelink
```

Additional domains may be added through configuration.

---

## 13.6 Unsupported Messages

If a message contains no configured links:

```text id="f7z2u4"
Ignore Message
```

No database records shall be created.

No media shall be downloaded.

No further processing shall occur.

---

## 13.7 Supported Messages

If a message contains at least one configured link:

```text id="q5r4cw"
Create Message Record
↓
Process Media
↓
Extract Links
↓
Create Link Records
```

---

## 13.8 Monitoring Requirements

### FR-MON-001

The system shall continuously monitor eligible source channels.

---

### FR-MON-002

Only configured domains shall trigger processing.

---

### FR-MON-003

Messages without configured links shall be ignored.

---

### FR-MON-004

Messages with configured links shall be recorded.

---

### FR-MON-005

Monitoring shall support multiple accounts and multiple source channels.

---

### FR-MON-006

Monitoring failures shall be logged.

---

# 14. Historical Fetching

## 14.1 Overview

Historical Fetching allows TeleAuto to recover messages that may have been missed due to:

- Application downtime
- Newly added channels
- Session interruptions
- Network interruptions

Historical Fetching is performed during startup validation.

---

## 14.2 Startup Validation Sequence

The startup validation process shall execute in the following order:

```text id="j6q4zo"
Load Configuration
↓
Load Accounts
↓
Validate Sessions
↓
Validate Source Channels
↓
Perform History Validation
↓
Start Monitoring
```

---

## 14.3 History Validation

For each source channel:

```text id="k0x1am"
Fetch Telegram State
↓
Fetch Database State
↓
Compare States
```

The system shall compare:

```text id="z3k8sk"
Latest Telegram Message Timestamp
```

against

```text id="uhd7fq"
Latest Stored Message Timestamp
```

---

## 14.4 Synchronization Required

If timestamps do not match:

```text id="1qf3mf"
Historical Synchronization Required
```

The system shall begin fetching historical messages.

---

## 14.5 Synchronization Not Required

If timestamps match:

```text id="l6o6iw"
Channel Ready
```

No history fetch shall occur.

---

## 14.6 Historical Fetch Limits

Historical fetching shall be limited by configuration.

Example:

```json id="q5s5y2"
{
  "maxHistoricalMessages": 1000
}
```

The system shall never attempt unlimited history retrieval.

---

## 14.7 Processing Historical Messages

Historical messages shall be processed using the same workflow as live messages.

Example:

```text id="m4w4kc"
Historical Message
↓
Link Detection
↓
Message Record
↓
Media Download
↓
Link Creation
```

No separate processing path shall exist.

---

## 14.8 History Completion

After synchronization completes:

```text id="q8p7r7"
historyFetchedAt
```

shall be updated.

Example:

```text id="m8q5rn"
20260926_1400
```

The source channel status shall become:

```text id="n6u3bn"
READY
```

---

## 14.9 Historical Fetch Requirements

### FR-HIS-001

The system shall validate source channel history during startup.

---

### FR-HIS-002

The system shall support recovery of missed messages.

---

### FR-HIS-003

Historical synchronization limits shall be configurable.

---

### FR-HIS-004

Historical messages shall follow the standard processing workflow.

---

### FR-HIS-005

History synchronization completion shall be recorded.

---

# 15. Message Processing

## 15.1 Overview

Message Processing converts a qualifying Telegram message into a TeleAuto message record and one or more link records.

Only messages containing configured links are eligible.

---

## 15.2 Message Processing Flow

```text id="n0w7wu"
Receive Message
↓
Domain Detection
↓
Create Message Record
↓
Process Media
↓
Extract Links
↓
Normalize Links
↓
Duplicate Check
↓
Create Link Records
```

---

## 15.3 Message Record Creation

When a qualifying message is detected:

```text id="v2x6s7"
Message Record Created
```

---

## 15.4 Message Record Structure

The message record shall contain:

```js id="h4v6lw"
{
  (telegramMessageId, sourceChannelId, messageBody, extractedLinks, mediaId, receivedAt);
}
```

---

## 15.5 Message Storage Rules

Messages shall only be stored when:

```text id="j1z8ha"
Configured Links Detected
```

Messages without configured links shall not be stored.

---

## 15.6 Message Cache Strategy

The messages collection acts as a FIFO cache.

Messages are retained for operational visibility and troubleshooting.

---

## 15.7 Cache Limit

Example:

```json id="v4w4sm"
{
  "messageCacheLimit": 1000
}
```

---

## 15.8 Cache Cleanup

When the cache exceeds the configured limit:

```text id="c2k7qe"
Newest Message Inserted
↓
Oldest Message Deleted
```

The cache behaves as:

```text id="n4w6md"
FIFO
```

---

## 15.9 Link Extraction

The system shall extract all supported links from a qualifying message.

Example:

```text id="p9e6lh"
Link A
Link B
Link C
```

Each extracted link shall be processed independently.

---

## 15.10 Message Processing Requirements

### FR-MSG-001

Only qualifying messages shall be stored.

---

### FR-MSG-002

Message records shall contain extracted links.

---

### FR-MSG-003

Message cache size shall be configurable.

---

### FR-MSG-004

Cache cleanup shall follow FIFO behavior.

---

### FR-MSG-005

Multiple links within a message shall be supported.

---

# 16. Media Processing

## 16.1 Overview

Media Processing is responsible for downloading media attached to qualifying messages.

Media downloads occur immediately during message processing.

Media storage is filesystem-based.

---

## 16.2 Media Processing Trigger

Media processing occurs only when:

```text id="g4t7vf"
Configured Links Detected
```

If a message contains no configured links:

```text id="k8q2zu"
No Media Download
```

---

## 16.3 Media Download Workflow

```text id="z9m8pk"
Qualifying Message
↓
Media Present?
↓
Generate Media ID
↓
Download Media
↓
Store Metadata
```

---

## 16.4 Media Identifier Generation

Media IDs shall include a date prefix.

Format:

```text id="r5g9km"
yyyymmdd_xxxxx
```

Example:

```text id="t3j5ox"
20260926_abcd123
```

This improves filesystem organization and operational management.

---

## 16.5 Filesystem Storage

Media files shall be stored on the filesystem.

Directory structure:

```text id="r0v5df"
/media
    /<mediaId>
```

Example:

```text id="o7m6zu"
/media/20260926_abcd123
```

---

## 16.6 Download Success

When download succeeds:

```text id="g8h4bi"
mediaId = Generated Media ID
```

The message record shall reference the downloaded media.

---

## 16.7 Download Failure

When download fails:

```text id="v5m2zw"
mediaId = DOWNLOAD_FAILED
```

The message record shall remain valid.

Link processing shall continue.

---

## 16.8 No Media Present

When no media exists:

```text id="c8k4iu"
mediaId = NO_MEDIA
```

---

## 16.9 Media Metadata

Media metadata shall be stored separately from media files.

The media collection shall store:

```text id="w1r3ka"
Media ID
File Path
Source Message
Source Channel
File Size
Mime Type
Download Status
Created Timestamp
```

---

## 16.10 Media Processing Requirements

### FR-MED-001

Media downloads shall occur during message processing.

---

### FR-MED-002

Media files shall be stored on the filesystem.

---

### FR-MED-003

Media metadata shall be stored in MongoDB.

---

### FR-MED-004

Media download failures shall not stop link processing.

---

### FR-MED-005

Media identifiers shall contain a date-based prefix.

---

### FR-MED-006

The system shall support messages without media.

# TeleAuto JS v1.0

## Product Requirements Document (PRD)

### Part 4

- Link Management
- Link Lifecycle
- Conversion System
- Converter Providers

---

# 17. Link Management

## 17.1 Overview

The Link entity is the primary business object within TeleAuto.

Every major workflow in the system revolves around links.

Examples:

```text id="s1u7aj"
Monitoring
→ Creates Links

Conversion
→ Updates Links

Broadcasting
→ Uses Links

Archival
→ Finalizes Links
```

A link represents a discovered URL that has passed domain validation and duplicate detection.

---

## 17.2 Link Creation

A link shall be created when:

```text id="n4h8qe"
Message Contains Configured Link
```

and

```text id="c7k9mp"
Link Is Not A Duplicate
```

---

## 17.3 Link Record

Each link shall maintain sufficient information to support:

```text id="u5x4dh"
Conversion
Broadcasting
History
Troubleshooting
Reporting
```

---

## 17.4 Link Relationships

A link shall maintain references to:

```text id="f6z2or"
Source Channel
Source Message
Conversion Batch
Media
Broadcast Tasks
```

---

## 17.5 Original URL

The system shall preserve the original URL exactly as discovered.

Example:

```text id="z2m4yo"
https://terabox.com/s/abc123?utm=test
```

Original URLs are preserved for traceability.

---

## 17.6 Normalized URL

The system shall create a normalized URL used for duplicate detection.

Normalization rules:

```text id="r8v7mc"
Lowercase hostname
Remove protocol
Remove trailing slash
Ignore query parameters
Ignore fragments
```

---

### Example

Input:

```text id="y7t3lh"
https://abc.com/file/123
https://abc.com/file/123/
https://ABC.com/file/123
http://abc.com/file/123
https://abc.com/file/123?utm_source=x
https://abc.com/file/123#section
```

Normalized Result:

```text id="d2f9kr"
abc.com/file/123
```

---

## 17.7 Supported Domain Normalization

The system shall support domain-family normalization.

Example:

```text id="x4j7gh"
terabox.com
www.terabox.com
1024tera.com
1024terabox.com
www.1024terabox.com
```

may normalize to a common hostname representation.

This behavior shall be configurable.

---

## 17.8 Duplicate Detection

Duplicate detection shall occur at two levels.

### Application Layer

The system shall:

```text id="j4z8ab"
Normalize URL
Check Existing Link
```

before insertion.

---

### Database Layer

MongoDB shall enforce uniqueness through a unique index.

This prevents race-condition duplicates.

---

## 17.9 Duplicate Handling

When a duplicate link is detected:

```text id="w9n2uv"
Do Not Create New Link
```

The existing link remains authoritative.

---

## 17.10 Link Requirements

### FR-LINK-001

The system shall preserve original URLs.

---

### FR-LINK-002

The system shall generate normalized URLs.

---

### FR-LINK-003

The system shall detect duplicates.

---

### FR-LINK-004

Duplicate detection shall occur in application and database layers.

---

### FR-LINK-005

Links shall maintain references to related entities.

---

# 18. Link Lifecycle

## 18.1 Overview

A link moves through multiple workflow stages from discovery to archival.

The lifecycle is explicitly represented through status fields.

---

## 18.2 Separate Status Domains

Links shall maintain separate workflow domains.

Example:

```js id="x3q7jw"
{
  conversionStatus: "COMPLETED",
  broadcastStatus: "PENDING"
}
```

Conversion and broadcasting shall be tracked independently.

---

## 18.3 Conversion Lifecycle

A link shall progress through the following conversion states:

```text id="g8t4yv"
PENDING
↓
ASSIGNED
↓
SENT
↓
WAITING_RESPONSE
↓
COMPLETED
```

or

```text id="q5m2bp"
PENDING
↓
ASSIGNED
↓
SENT
↓
WAITING_RESPONSE
↓
FAILED
```

---

## 18.4 Broadcast Lifecycle

A link shall progress through the following broadcast states:

```text id="y6c7ka"
NOT_CREATED
↓
TASKS_CREATED
↓
BROADCASTING
↓
COMPLETED
↓
ARCHIVED
```

or

```text id="f2x4rv"
NOT_CREATED
↓
TASKS_CREATED
↓
BROADCASTING
↓
FAILED
```

---

## 18.5 Archival

Links shall not be deleted after successful processing.

Instead:

```text id="n9d7ew"
Broadcast Complete
↓
ARCHIVED
```

---

## 18.6 Archival Benefits

Archival preserves:

```text id="u7f2mq"
Duplicate History
Conversion History
Broadcast History
Reporting Data
Troubleshooting Data
Future Rebroadcast Possibilities
```

---

## 18.7 Link Lifecycle Requirements

### FR-LC-001

Conversion status shall be tracked independently.

---

### FR-LC-002

Broadcast status shall be tracked independently.

---

### FR-LC-003

Links shall support archival.

---

### FR-LC-004

Successful links shall not be deleted.

---

# 19. Conversion System

## 19.1 Overview

The Conversion System converts discovered links using a Telegram converter bot.

The conversion workflow is batch-based.

---

## 19.2 Conversion Architecture

The Conversion Worker is responsible for:

```text id="w4j9sq"
Batch Creation
Batch Submission
Response Processing
Link Updates
Status Management
```

---

## 19.3 Batch Builder

The Batch Builder executes periodically.

Example:

```json id="h5n3zx"
{
  "batchBuilderIntervalSeconds": 15
}
```

---

## 19.4 Pending Link Selection

The Batch Builder shall query:

```text id="k8v5ta"
conversionStatus = PENDING
```

Links shall be selected:

```text id="y1s8wp"
FIFO
Oldest First
```

---

## 19.5 Batch Size

Example:

```json id="j3m6rh"
{
  "conversionBatchSize": 10
}
```

---

## 19.6 Batch Creation Rule

A batch shall only be created when:

```text id="e7k2nv"
Pending Links >= Batch Size
```

---

### Example

Batch Size:

```text id="v8q1jt"
10
```

Pending Links:

```text id="m2z5fk"
10
```

Create Batch.

---

Pending Links:

```text id="t7f9ur"
9
```

Do Not Create Batch.

---

## 19.7 No Partial Batches

The MVP shall not create partial batches.

---

## 19.8 No Wait Threshold

The MVP shall not implement:

```text id="p9x6bd"
Maximum Wait Time
Forced Batch Creation
Partial Batch Scheduling
```

A batch exists only when sufficient links are available.

---

## 19.9 Conversion Batch Lifecycle

A batch shall progress through:

```text id="u4d2om"
PENDING
↓
ASSIGNED
↓
SENT
↓
WAITING_RESPONSE
↓
COMPLETED
```

or

```text id="o1h8cv"
PENDING
↓
ASSIGNED
↓
SENT
↓
WAITING_RESPONSE
↓
FAILED
```

---

## 19.10 Batch Assignment

When a batch is created:

```text id="w6q3af"
Links
↓
Batch
↓
Status = ASSIGNED
```

---

## 19.11 Request Format

The conversion request shall use a configurable template.

Example:

```text id="r5m8uj"
123 - https://example.com/a

124 - https://example.com/b

125 - https://example.com/c
```

---

Configuration Example:

```json id="q9z2sy"
{
  "requestTemplate": "{links}"
}
```

---

## 19.12 Link Identifier Usage

Every link included in a batch shall include its internal identifier.

This enables deterministic response matching.

---

## 19.13 Sending To Converter

After successful submission:

```text id="f4u9gj"
Batch Status
↓
SENT
```

then

```text id="c8v6ew"
WAITING_RESPONSE
```

---

## 19.14 Conversion Timeout

Example:

```json id="m7d1na"
{
  "conversionTimeoutSeconds": 300
}
```

---

If no response arrives:

```text id="t3r8km"
Batch Status = FAILED
```

and

```text id="s5y4jq"
Affected Links = FAILED
```

---

## 19.15 Response Matching

The system shall expect responses similar to:

```text id="x1c9pl"
123 - Converted Link A

124 - Converted Link B

125 - Converted Link C
```

---

## 19.16 Matching Strategy

Primary matching:

```text id="j7v3ko"
Link Identifier
```

Secondary validation:

```text id="g9t6yx"
Position
```

No fuzzy matching shall be implemented.

---

## 19.17 Successful Conversion

Upon successful parsing:

```text id="p6m5bd"
Store Converted URL
↓
conversionStatus = COMPLETED
```

---

## 19.18 Failed Conversion

Upon failure:

```text id="q4w8as"
conversionStatus = FAILED
```

---

## 19.19 Retry Policy

The MVP shall not implement:

```text id="n8x4uf"
Retry Queue
Retry Scheduler
Automatic Retry Logic
Backoff Algorithms
```

Retries are future scope.

---

## 19.20 Conversion Requirements

### FR-CONV-001

Conversion shall be batch-based.

---

### FR-CONV-002

Batch size shall be configurable.

---

### FR-CONV-003

Batch creation shall follow FIFO ordering.

---

### FR-CONV-004

Partial batches shall not be created.

---

### FR-CONV-005

Conversion timeout shall be configurable.

---

### FR-CONV-006

The MVP shall not implement automatic retries.

---

# 20. Converter Providers

## 20.1 Overview

Converter bots shall be abstracted through a Provider model.

The Conversion Worker shall interact with providers rather than directly with bot-specific implementations.

---

## 20.2 Provider Structure

Example:

```json id="m5j7et"
{
  "name": "Bot A",
  "username": "@botA",
  "enabled": true
}
```

---

## 20.3 Provider Abstraction

The Conversion Worker shall depend on:

```text id="f9v4ah"
Provider Interface
```

rather than:

```text id="d7x1rp"
Specific Bot Logic
```

---

## 20.4 MVP Provider Strategy

The MVP supports:

```text id="j2u5wy"
Multiple Provider Definitions
```

but

```text id="k4m8sn"
Single Active Conversion Account
```

---

## 20.5 Provider Metadata

Conversion batches shall store:

```text id="p3w7hr"
Provider Identifier
Provider Response Message Identifier
```

for troubleshooting and auditing.

---

## 20.6 Future Expansion

The Provider abstraction shall support future enhancements such as:

```text id="s8q2mn"
Provider Switching
Fallback Providers
Provider Health Tracking
Provider Prioritization
```

without requiring redesign of the conversion architecture.

---

## 20.7 Provider Requirements

### FR-PROV-001

Conversion bots shall be represented through providers.

---

### FR-PROV-002

The Conversion Worker shall depend on a provider abstraction.

---

### FR-PROV-003

Conversion batches shall record provider information.

---

### FR-PROV-004

Provider definitions shall support enable and disable operations.

# TeleAuto JS v1.0

## Product Requirements Document (PRD)

### Part 5

- Broadcasting System
- Broadcast Tasks
- Delivery Workflow
- Archiving

---

# 21. Broadcasting System

## 21.1 Overview

The Broadcasting System is responsible for delivering converted links to configured destination channels.

Broadcasting begins only after successful link conversion.

The Broadcasting System operates independently from the Conversion System and maintains its own workflow states.

---

## 21.2 Broadcast Trigger

A link becomes eligible for broadcasting when:

```text
conversionStatus = COMPLETED
```

and

```text
broadcastStatus = NOT_CREATED
```

---

## 21.3 Broadcasting Philosophy

TeleAuto JS v1.0 follows a simple broadcasting model:

```text
One Converted Link
↓
All Eligible Destination Channels
```

No routing rules, filters, channel groups, account-based targeting, or custom assignment logic are part of the MVP.

---

## 21.4 Broadcast Flow

```text
Converted Link
↓
Create Broadcast Tasks
↓
Broadcast Worker
↓
Destination Channel Delivery
↓
Task Completion
↓
Link Archival
```

---

## 21.5 Broadcast Template

Broadcast messages shall be generated using locally stored templates.

Templates shall not be stored in MongoDB.

Example:

```text
${link}

How to watch video @how_to_watch

Please Join our Backup Channel @kaliya
```

---

## 21.6 Template Source

Templates may be stored as:

```text
Configuration Files
Template Files
Local Resources
```

The exact implementation is left to the engineering design phase.

---

## 21.7 Broadcast Message Composition

The broadcasted message shall contain:

```text
Converted Link
+
Template Content
+
Optional Media
```

as a single Telegram message.

---

## 21.8 One Message Policy

If media exists:

```text
Media + Caption
```

shall be sent together as one Telegram message whenever supported by Telegram APIs.

The MVP assumes destination channels support all required media types.

---

## 21.9 Broadcasting Requirements

### FR-BRD-001

Only successfully converted links shall be broadcasted.

---

### FR-BRD-002

Broadcast messages shall use templates.

---

### FR-BRD-003

Templates shall be stored locally.

---

### FR-BRD-004

Media and links shall be sent together as one message whenever possible.

---

### FR-BRD-005

Broadcasting shall create audit records.

---

# 22. Broadcast Tasks

## 22.1 Overview

A Broadcast Task represents a single delivery operation to one destination channel.

Broadcast Tasks are the primary execution units of the Broadcasting System.

---

## 22.2 Task Generation Strategy

TeleAuto uses:

```text
One Task Per Destination Channel
```

---

### Example

Destination Channels:

```text
Channel A
Channel B
Channel C
```

A converted link creates:

```text
Task A
Task B
Task C
```

---

## 22.3 Rationale

This strategy provides:

```text
Independent Status Tracking
Independent Failure Tracking
Independent Retry Possibilities
Future Routing Support
Operational Visibility
```

---

## 22.4 Task Creation

When a link becomes eligible:

```text
Broadcast Tasks Created
↓
broadcastStatus = TASKS_CREATED
```

---

## 22.5 Task Lifecycle

Each task shall progress through:

```text
PENDING
↓
PROCESSING
↓
COMPLETED
```

or

```text
PENDING
↓
PROCESSING
↓
FAILED
```

---

## 22.6 Task Independence

Failure of one task shall not affect:

```text
Other Tasks
Other Channels
Other Links
```

---

## 22.7 Broadcast Task Metadata

Each task shall maintain:

```text
Destination Channel ID
Owner Account ID
Link ID
Scheduled Time
Status
Created Time
Started Time
Completed Time
Failure Reason
Telegram Message ID
```

---

## 22.8 Broadcast Rule Reference

Each task shall include:

```text
broadcastRuleId
```

This field may be nullable.

Example:

```text
null
```

The purpose is future schema compatibility.

---

## 22.9 Scheduled Time

Every task shall support:

```text
scheduledAt
```

The Broadcast Worker shall not execute a task before its scheduled time.

For MVP:

```text
scheduledAt = immediate
```

unless explicitly configured otherwise.

---

## 22.10 Broadcast Task Requirements

### FR-BTASK-001

A task shall represent one destination delivery.

---

### FR-BTASK-002

Tasks shall maintain independent statuses.

---

### FR-BTASK-003

Tasks shall support future scheduling.

---

### FR-BTASK-004

Tasks shall maintain delivery metadata.

---

### FR-BTASK-005

Tasks shall support future broadcast rule expansion.

---

# 23. Delivery Workflow

## 23.1 Broadcast Worker Responsibilities

The Broadcast Worker is responsible for:

```text
Task Selection
Message Generation
Media Attachment
Telegram Delivery
Status Updates
```

---

## 23.2 Task Selection

The worker shall select:

```text
status = PENDING
```

and

```text
scheduledAt <= now
```

---

## 23.3 Delivery Attempt

The worker shall:

```text
Load Link
↓
Load Template
↓
Load Media
↓
Generate Message
↓
Send To Telegram
```

---

## 23.4 Successful Delivery

A delivery is considered successful when Telegram returns a successful response.

Example:

```text
Telegram Message Created
```

---

## 23.5 Success Metadata

Upon success:

```text
Task Status = COMPLETED
```

and store:

```text
Telegram Message ID
Delivery Timestamp
```

---

## 23.6 Failed Delivery

Upon failure:

```text
Task Status = FAILED
```

and record:

```text
Failure Reason
Failure Timestamp
```

---

## 23.7 MVP Failure Policy

The MVP shall not implement:

```text
Automatic Retries
Backoff Logic
Retry Scheduling
Dead Letter Queues
```

Failed tasks remain failed.

---

## 23.8 Channel Selection Constraint

The MVP assumes:

```text
One Destination Channel
↓
One Owner Account
```

The worker therefore always knows which account must perform delivery.

---

## 23.9 Delivery Requirements

### FR-DEL-001

The Broadcast Worker shall process pending tasks.

---

### FR-DEL-002

Task execution shall respect scheduled times.

---

### FR-DEL-003

Successful Telegram responses shall complete tasks.

---

### FR-DEL-004

Failed deliveries shall record failure information.

---

### FR-DEL-005

The MVP shall not perform automatic retries.

---

# 24. Archiving

## 24.1 Overview

Archiving represents the final state of a successfully processed link.

TeleAuto favors preservation over deletion.

---

## 24.2 Archive Trigger

A link becomes eligible for archival when:

```text
All Broadcast Tasks
=
COMPLETED
```

---

## 24.3 Archival Flow

```text
Converted Link
↓
Broadcast Tasks Created
↓
Broadcast Tasks Completed
↓
Link Archived
```

---

## 24.4 Archive Status

When archival occurs:

```text
broadcastStatus = ARCHIVED
```

---

## 24.5 Why Archive Instead of Delete

Archiving preserves:

```text
Duplicate Detection History
Conversion History
Broadcast History
Operational Audits
Future Rebroadcast Support
Troubleshooting Data
Reporting Data
```

---

## 24.6 Historical Record Philosophy

The Link collection functions as a permanent business-history repository.

Examples:

```text
Who discovered the link?
When was it discovered?
Which channel discovered it?
Was conversion successful?
Which provider was used?
Where was it broadcast?
When was it archived?
```

All such information remains available.

---

## 24.7 Failed Broadcast Scenarios

If one or more broadcast tasks fail:

```text
Link Remains Non-Archived
```

Example:

```text
broadcastStatus = FAILED
```

or another non-terminal operational state determined during implementation.

The link shall not be archived until archival conditions are satisfied.

---

## 24.8 Archive Requirements

### FR-ARC-001

Links shall be archived rather than deleted.

---

### FR-ARC-002

Archival shall occur only after successful completion of all broadcast tasks.

---

### FR-ARC-003

Archived links shall remain queryable.

---

### FR-ARC-004

Archived links shall participate in duplicate detection history.

---

### FR-ARC-005

Archival shall preserve operational traceability.

---

# 25. End-to-End Business Workflow Summary

The complete TeleAuto MVP workflow is:

```text
Source Channel Message
↓
Configured Link Detected
↓
Message Record Created
↓
Media Downloaded
↓
Link Created
↓
Duplicate Check
↓
conversionStatus = PENDING
↓
Batch Builder
↓
Conversion Batch Created
↓
Converter Provider
↓
Converted Link Stored
↓
conversionStatus = COMPLETED
↓
Broadcast Tasks Created
↓
broadcastStatus = TASKS_CREATED
↓
Broadcast Worker
↓
Destination Channel Delivery
↓
All Tasks Completed
↓
broadcastStatus = ARCHIVED
```

This workflow represents the complete MVP business lifecycle for a link inside TeleAuto JS v1.0.

# TeleAuto JS v1.0

## Product Requirements Document (PRD)

### Part 6

- MongoDB Data Model
- Collections
- Relationships
- Indexes
- Status Domains
- Storage Design

---

# 26. Database Philosophy

## 26.1 Overview

TeleAuto JS v1.0 uses:

```text
MongoDB
```

as its primary and only database.

No Redis.

No Kafka.

No RabbitMQ.

No Elasticsearch.

No secondary persistence systems.

---

## 26.2 Design Goals

The database design prioritizes:

```text
Simple Operations
Fast Reads
Fast Writes
Operational Visibility
Future Expandability
Minimal Infrastructure
```

---

## 26.3 Data Access Philosophy

The schema is optimized for the most common operational queries.

Examples:

```text
Link
↓
Source Channel
↓
Owner Account
```

```text
Account
↓
All Source Channels
```

```text
Account
↓
All Destination Channels
```

```text
Link
↓
All Broadcast Tasks
```

```text
Broadcast Task
↓
Destination Channel
↓
Owner Account
```

---

## 26.4 Collection Strategy

TeleAuto JS v1.0 shall use the following collections:

```text
accounts
sourceChannels
destinationChannels
messages
media
links
conversionBatches
broadcastTasks
settings
```

---

# 27. Collection: accounts

## 27.1 Purpose

Stores Telegram account definitions.

---

## 27.2 Document Structure

```js
{
  (_id, name, phoneNumber, sessionName, status, monitoringEnabled, conversionEnabled, broadcastingEnabled, createdAt, updatedAt);
}
```

---

## 27.3 Status Values

```text
ACTIVE
REQUIRES_LOGIN
DISABLED
```

---

## 27.4 Indexes

```js
phoneNumber(unique);

status;

monitoringEnabled;

conversionEnabled;

broadcastingEnabled;
```

---

## 27.5 Relationships

```text
Account
├── Source Channels
└── Destination Channels
```

---

# 28. Collection: sourceChannels

## 28.1 Purpose

Stores monitored Telegram channels.

---

## 28.2 Document Structure

```js
{
  (_id, telegramChannelId, title, username, accountId, status, historyFetchedAt, createdAt, updatedAt);
}
```

---

## 28.3 Status Values

```text
PENDING_HISTORY
READY
DISABLED
```

---

## 28.4 Indexes

```js
telegramChannelId(unique);

accountId;

status;
```

---

## 28.5 Relationships

```text
Source Channel
↓
Owner Account
```

---

# 29. Collection: destinationChannels

## 29.1 Purpose

Stores broadcasting targets.

---

## 29.2 Document Structure

```js
{
  (_id, telegramChannelId, title, username, accountId, enabled, availableForBroadcasting, createdAt, updatedAt);
}
```

---

## 29.3 Indexes

```js
telegramChannelId(unique);

accountId;

availableForBroadcasting;

enabled;
```

---

## 29.4 Relationships

```text
Destination Channel
↓
Owner Account
```

---

# 30. Collection: messages

## 30.1 Purpose

Stores qualifying Telegram messages.

Only messages containing configured links shall be stored.

---

## 30.2 FIFO Cache Philosophy

Messages act as:

```text
Operational Cache
```

and not permanent business history.

---

## 30.3 Document Structure

```js
{
  (_id, telegramMessageId, sourceChannelId, messageBody, extractedLinks, mediaId, receivedAt);
}
```

---

## 30.4 Media Values

Possible values:

```text
NO_MEDIA

DOWNLOAD_FAILED

<mediaId>
```

---

## 30.5 Indexes

```js
sourceChannelId;

receivedAt;

telegramMessageId;
```

---

## 30.6 Cache Cleanup

The collection shall be capped logically by application logic.

Example:

```json
{
  "messageCacheLimit": 1000
}
```

When exceeded:

```text
Delete Oldest Records
```

---

# 31. Collection: media

## 31.1 Purpose

Stores media metadata.

Actual files remain on filesystem.

---

## 31.2 Document Structure

```js
{
  (_id, mediaId, sourceChannelId, sourceMessageId, filePath, fileSize, mimeType, downloadStatus, createdAt);
}
```

---

## 31.3 Download Status Values

```text
SUCCESS

FAILED
```

---

## 31.4 Indexes

```js
mediaId(unique);

sourceChannelId;

sourceMessageId;

downloadStatus;
```

---

## 31.5 Filesystem Layout

```text
/media
    /<mediaId>
```

Example:

```text
/media/20260926_abcd123
```

---

# 32. Collection: links

## 32.1 Purpose

The links collection is the core business collection.

This collection represents permanent operational history.

Links are never deleted.

---

## 32.2 Document Structure

```js
{
  (_id,
    originalUrl,
    normalizedUrl,
    convertedUrl,
    sourceChannelId,
    sourceMessageId,
    mediaId,
    conversionBatchId,
    providerId,
    conversionStatus,
    broadcastStatus,
    archivedAt,
    createdAt,
    updatedAt);
}
```

---

## 32.3 Conversion Status Values

```text
PENDING

ASSIGNED

SENT

WAITING_RESPONSE

COMPLETED

FAILED
```

---

## 32.4 Broadcast Status Values

```text
NOT_CREATED

TASKS_CREATED

BROADCASTING

COMPLETED

ARCHIVED

FAILED
```

---

## 32.5 Critical Indexes

### Duplicate Detection

```js
normalizedUrl(unique);
```

---

### Conversion Queue

```js
conversionStatus;
createdAt;
```

Compound:

```js
{
  conversionStatus: 1,
  createdAt: 1
}
```

Supports FIFO batch building.

---

### Broadcasting Queue

```js
{
  broadcastStatus: 1,
  createdAt: 1
}
```

---

### Source Lookups

```js
sourceChannelId;

sourceMessageId;
```

---

## 32.6 Access Optimization

Common query:

```text
Link
↓
Source Channel
↓
Owner Account
```

requires only:

```text
links
↓
sourceChannels
↓
accounts
```

which is efficient and predictable.

---

# 33. Collection: conversionBatches

## 33.1 Purpose

Stores conversion operations.

---

## 33.2 Document Structure

```js
{
  (_id, providerId, providerResponseMessageId, requestMessage, responseMessage, status, totalLinks, createdAt, sentAt, completedAt);
}
```

---

## 33.3 Status Values

```text
PENDING

ASSIGNED

SENT

WAITING_RESPONSE

COMPLETED

FAILED
```

---

## 33.4 Indexes

```js
status;

createdAt;

providerId;
```

---

## 33.5 Notes

Links reference the batch.

Batches do not store arrays of link identifiers.

This keeps batch documents small.

---

# 34. Collection: broadcastTasks

## 34.1 Purpose

Stores destination delivery operations.

---

## 34.2 Document Structure

```js
{
  (_id, linkId, destinationChannelId, accountId, broadcastRuleId, status, scheduledAt, telegramMessageId, failureReason, createdAt, startedAt, completedAt);
}
```

---

## 34.3 Status Values

```text
PENDING

PROCESSING

COMPLETED

FAILED
```

---

## 34.4 Indexes

### Worker Queue

```js
{
  status: 1,
  scheduledAt: 1
}
```

---

### Link Lookup

```js
linkId;
```

---

### Channel Lookup

```js
destinationChannelId;
```

---

### Account Lookup

```js
accountId;
```

---

## 34.5 Access Optimization

Common query:

```text
Link
↓
All Broadcast Tasks
```

uses:

```js
linkId;
```

index.

---

# 35. Collection: settings

## 35.1 Purpose

Stores optional runtime settings.

This collection is secondary.

Primary configuration remains:

```text
config.json
+
.env
```

---

## 35.2 Usage Philosophy

The settings collection exists for future flexibility.

MVP functionality must not depend on database settings.

---

## 35.3 Example Structure

```js
{
  (_id, key, value, updatedAt);
}
```

---

## 35.4 Indexes

```js
key(unique);
```

---

# 36. Relationship Summary

## Accounts → Source Channels

```text
One Account
↓
Many Source Channels
```

---

## Accounts → Destination Channels

```text
One Account
↓
Many Destination Channels
```

---

## Source Channels → Messages

```text
One Source Channel
↓
Many Messages
```

---

## Messages → Links

```text
One Message
↓
Many Links
```

---

## Messages → Media

```text
One Message
↓
Zero Or One Media
```

---

## Links → Conversion Batch

```text
Many Links
↓
One Batch
```

---

## Links → Broadcast Tasks

```text
One Link
↓
Many Broadcast Tasks
```

---

## Broadcast Tasks → Destination Channel

```text
Many Tasks
↓
One Destination Channel
```

---

## Destination Channel → Account

```text
Many Destination Channels
↓
One Account
```

---

# 37. MongoDB Performance Considerations

## 37.1 Expected Scale

Expected scale:

```text
< 10,000 Links Per Day
```

This scale is extremely manageable for MongoDB.

---

## 37.2 Why No Redis

The MVP does not require:

```text
Distributed Queues
Caching Layers
Pub/Sub Infrastructure
In-Memory Scheduling
```

MongoDB indexes are sufficient.

---

## 37.3 Why No Separate Queue System

Worker queues are implemented through:

```text
MongoDB Collections
+
Status Fields
+
Indexes
```

Examples:

```text
conversionStatus = PENDING
```

and

```text
status = PENDING
```

already form efficient queues.

---

## 37.4 Future Scalability

The schema intentionally allows future migration to:

```text
Redis
BullMQ
RabbitMQ
Kafka
Distributed Workers
```

without major collection redesign.

---

# 38. Database Design Principles

The MongoDB design follows:

```text
Simple First
Fast Reads
Fast Writes
Minimal Infrastructure
Operational Visibility
Future Expandability
```

The schema is intentionally optimized for TeleAuto JS v1.0 operational requirements rather than hypothetical large-scale distributed architectures.

# TeleAuto JS v1.0

## Product Requirements Document (PRD)

### Part 7

- Configuration System
- Scheduler
- Worker Architecture
- Startup Recovery
- Logging
- Admin CLI
- Statistics
- Export System
- Monitoring & Recovery Operations

---

# 39. Configuration System

## 39.1 Overview

TeleAuto JS v1.0 uses a layered configuration strategy.

Configuration sources:

```text id="cfg_001"
config.json
.env
MongoDB Settings Collection (optional)
```

---

## 39.2 Configuration Priority

Highest priority:

```text id="cfg_002"
Environment Variables (.env)
```

↓

```text id="cfg_003"
config.json
```

↓

```text id="cfg_004"
Database Settings
```

↓

```text id="cfg_005"
Default Values
```

---

## 39.3 Configuration Philosophy

Configuration must remain:

```text id="cfg_006"
Human Readable
Version Controllable
Easy To Backup
Easy To Deploy
```

---

## 39.4 Example Configuration

```json id="cfg_007"
{
  "messageCacheLimit": 1000,

  "maxHistoricalMessages": 1000,

  "batchBuilderIntervalSeconds": 15,

  "conversionBatchSize": 10,

  "conversionTimeoutSeconds": 300,

  "logRetentionDays": 30,

  "supportedDomains": ["terabox", "terashare", "1024tera", "1024terabox", "terasharelink"]
}
```

---

## 39.5 Configuration Requirements

### FR-CFG-001

The system shall support config.json.

---

### FR-CFG-002

The system shall support .env configuration.

---

### FR-CFG-003

Database settings shall remain optional.

---

### FR-CFG-004

Configuration values shall be validated during startup.

---

# 40. Scheduler

## 40.1 Overview

TeleAuto contains an internal scheduler.

The scheduler runs inside the primary Node.js process.

No separate scheduler service shall exist.

---

## 40.2 Purpose

The scheduler is responsible for triggering periodic operations.

Examples:

```text id="sch_001"
Batch Builder
Heartbeat Updates
Cache Cleanup
Scheduled Broadcasts
Maintenance Tasks
```

---

## 40.3 Scheduler Design

```text id="sch_002"
TeleAuto Process
↓
Internal Scheduler Module
↓
Periodic Jobs
```

---

## 40.4 Scheduler Philosophy

The scheduler shall remain:

```text id="sch_003"
Small
Simple
Predictable
```

The MVP shall not introduce:

```text id="sch_004"
Cron Services
External Schedulers
Distributed Scheduling
```

---

## 40.5 Scheduler Requirements

### FR-SCH-001

The system shall contain an internal scheduler.

---

### FR-SCH-002

The scheduler shall run inside the main process.

---

### FR-SCH-003

The scheduler shall support periodic jobs.

---

# 41. Worker Architecture

## 41.1 Overview

TeleAuto runs as a single Node.js process.

Startup command:

```bash id="wrk_001"
node index.js
```

---

## 41.2 Worker Model

The MVP uses:

```text id="wrk_002"
Single Process
Multiple Internal Workers
```

---

## 41.3 Worker Layout

```text id="wrk_003"
TeleAuto

├── Session Manager
├── Monitoring Worker
├── Recorder Worker
├── Conversion Worker
├── Broadcast Worker
├── Scheduler Worker
└── Admin CLI Module
```

---

## 41.4 Worker Isolation

Workers are logically separated.

Failure of one worker should not automatically terminate unrelated workers whenever recovery is possible.

---

## 41.5 Worker Communication

Workers communicate through:

```text id="wrk_004"
MongoDB Collections
Status Fields
```

Examples:

```text id="wrk_005"
conversionStatus

broadcastStatus

taskStatus
```

---

## 41.6 Queue Philosophy

The MVP shall use:

```text id="wrk_006"
MongoDB-backed Queues
```

No external queue infrastructure is required.

---

## 41.7 Worker Requirements

### FR-WRK-001

The system shall operate as a single Node.js process.

---

### FR-WRK-002

The system shall contain internal workers.

---

### FR-WRK-003

Workers shall communicate through MongoDB.

---

### FR-WRK-004

External queue systems are out of scope.

---

# 42. Startup Recovery

## 42.1 Overview

Startup Recovery ensures TeleAuto can safely resume operation after:

```text id="rec_001"
Application Restart
Crash
System Reboot
Network Failure
```

---

## 42.2 Startup Sequence

```text id="rec_002"
Load Configuration
↓
Connect MongoDB
↓
Load Accounts
↓
Validate Sessions
↓
Validate Channels
↓
History Validation
↓
Historical Fetching
↓
Worker Startup
↓
Ready
```

---

## 42.3 Session Validation

All accounts shall be validated before worker startup.

Invalid sessions shall be marked:

```text id="rec_003"
REQUIRES_LOGIN
```

---

## 42.4 Source Channel Validation

For each source channel:

```text id="rec_004"
Fetch Telegram State
↓
Fetch Database State
↓
Compare Timestamps
```

---

## 42.5 History Recovery

If differences are detected:

```text id="rec_005"
Perform Historical Synchronization
```

subject to:

```text id="rec_006"
maxHistoricalMessages
```

---

## 42.6 Completion Marker

After successful synchronization:

```text id="rec_007"
historyFetchedAt
```

shall be updated.

---

## 42.7 Startup Recovery Requirements

### FR-REC-001

The system shall validate accounts during startup.

---

### FR-REC-002

The system shall validate source channels during startup.

---

### FR-REC-003

The system shall support historical recovery.

---

### FR-REC-004

Recovery progress shall be logged.

---

# 43. Worker Heartbeats

## 43.1 Overview

Workers shall maintain heartbeat information for diagnostics.

---

## 43.2 Heartbeat Strategy

Each worker shall update:

```text id="hb_001"
lastHeartbeatAt
```

in memory.

---

## 43.3 Heartbeat Interval

Default:

```text id="hb_002"
60 Seconds
```

Configurable.

---

## 43.4 Logging

Heartbeat information may be logged periodically.

Example:

```text id="hb_003"
Monitoring Worker: OK

Conversion Worker: OK

Broadcast Worker: OK
```

---

## 43.5 Future Scope

Future versions may expose:

```bash id="hb_004"
node index.js health
```

for operational diagnostics.

---

# 44. Logging

## 44.1 Overview

TeleAuto uses a simple filesystem-based logging strategy.

---

## 44.2 Log Files

Application log:

```text id="log_001"
logs/app.log
```

Error log:

```text id="log_002"
logs/error.log
```

---

## 44.3 Application Log Content

Examples:

```text id="log_003"
Startup Events
Account Validation
History Recovery
Batch Creation
Broadcast Events
Administrative Actions
```

---

## 44.4 Error Log Content

Examples:

```text id="log_004"
Telegram Errors
Database Errors
Conversion Failures
Broadcast Failures
Unexpected Exceptions
```

---

## 44.5 Log Rotation

Rotation policy:

```text id="log_005"
Daily
```

Retention:

```text id="log_006"
30 Days
```

Configurable.

---

## 44.6 Logging Requirements

### FR-LOG-001

The system shall maintain application logs.

---

### FR-LOG-002

The system shall maintain error logs.

---

### FR-LOG-003

The system shall support log rotation.

---

### FR-LOG-004

Log retention shall be configurable.

---

# 45. Admin CLI

## 45.1 Overview

TeleAuto shall include a dedicated Administrative CLI Module.

The CLI is a first-class component of the MVP.

---

## 45.2 CLI Philosophy

The CLI functions as the operational console for TeleAuto.

All routine administration should be achievable through CLI commands.

---

## 45.3 Command Groups

```text id="cli_001"
Account Management
Channel Management
Conversion Management
Broadcast Management
Message Management
Link Management
Statistics
Exports
Health
```

---

# 46. Account Commands

```text id="cli_002"
account:add

account:remove

account:list

account:show <accountId>

account:enable

account:disable
```

---

# 47. Source Channel Commands

```text id="cli_003"
source:add

source:remove

source:list

source:show
```

---

# 48. Destination Channel Commands

```text id="cli_004"
destination:add

destination:remove

destination:list

destination:show
```

---

# 49. Conversion Commands

```text id="cli_005"
conversion:enable

conversion:disable

conversion:status

conversion:list-batches
```

---

# 50. Broadcast Commands

```text id="cli_006"
broadcast:list-tasks

broadcast:show-task

broadcast:stats
```

---

# 51. Message Commands

```text id="cli_007"
messages:list

messages:count

messages:export
```

---

# 52. Link Commands

```text id="cli_008"
links:list

links:show

links:count

links:export
```

---

# 53. Statistics Commands

```text id="cli_009"
stats
```

Example output:

```text id="cli_010"
Accounts: 12

Source Channels: 40

Destination Channels: 18

Messages Cached: 1000

Links Pending: 20

Links Archived: 5000

Broadcast Tasks Completed: 12000

Broadcast Tasks Failed: 15
```

---

# 54. Export Commands

```text id="cli_011"
export:messages

export:links

export:broadcasts

export:accounts

export:channels
```

---

## 54.1 Export Format

Default export format:

```text id="cli_012"
JSON
```

---

## 54.2 Export Destination

Default export destination:

```text id="cli_013"
exports/
```

directory.

---

# 55. CLI Requirements

### FR-CLI-001

The system shall provide a dedicated administrative CLI.

---

### FR-CLI-002

Administrative operations shall be grouped logically.

---

### FR-CLI-003

The CLI shall support export operations.

---

### FR-CLI-004

The CLI shall support statistics commands.

---

# 56. Statistics System

## 56.1 Overview

TeleAuto shall provide operational statistics.

Statistics are intended for administration and troubleshooting.

---

## 56.2 Statistics Categories

Examples:

```text id="stat_001"
Accounts
Channels
Messages
Links
Conversion Batches
Broadcast Tasks
Media
```

---

## 56.3 Statistics Source

Statistics shall be calculated from MongoDB collections.

No separate analytics system shall exist.

---

## 56.4 Statistics Requirements

### FR-STAT-001

The system shall provide operational statistics.

---

### FR-STAT-002

Statistics shall be accessible through CLI commands.

---

# 57. Export System

## 57.1 Overview

TeleAuto shall support exporting operational data.

---

## 57.2 Supported Data Types

```text id="exp_001"
Messages
Links
Broadcast Tasks
Accounts
Channels
```

---

## 57.3 Export Philosophy

Exports are intended for:

```text id="exp_002"
Backups
Troubleshooting
Reporting
Migration Assistance
```

---

## 57.4 Export Requirements

### FR-EXP-001

The system shall support JSON exports.

---

### FR-EXP-002

Exports shall be accessible from CLI commands.

---

# 58. Monitoring & Recovery Operations

## 58.1 Operational Goals

The system should recover gracefully from:

```text id="ops_001"
Restarts
Temporary Failures
Downtime
```

without requiring manual database intervention.

---

## 58.2 Recovery Sources

Recovery decisions shall be based on:

```text id="ops_002"
MongoDB State
Telegram State
Configuration State
```

---

## 58.3 Operational Simplicity

The MVP intentionally avoids:

```text id="ops_003"
Kubernetes
Docker Swarm
Redis Cluster
RabbitMQ
Kafka
Prometheus
Grafana
ELK
```

---

## 58.4 Deployment Philosophy

The MVP deployment target remains:

```bash id="ops_004"
node index.js
```

on:

```text id="ops_005"
Personal Computer

Termux

Single VPS

Dedicated Server
```

---

## 58.5 Operational Requirements

### FR-OPS-001

The system shall support startup recovery.

---

### FR-OPS-002

The system shall support operational diagnostics.

---

### FR-OPS-003

The system shall prioritize simplicity over infrastructure complexity.

---

### FR-OPS-004

The system shall support standalone deployment.

---

# 59. Operational Architecture Summary

```text id="ops_006"
node index.js

├── Session Manager
├── Monitoring Worker
├── Recorder Worker
├── Conversion Worker
├── Broadcast Worker
├── Scheduler Worker
├── Admin CLI
│
├── MongoDB
│
├── /media
│
├── logs/app.log
├── logs/error.log
│
├── config.json
└── .env
```

This architecture represents the complete operational model for TeleAuto JS v1.0 and serves as the foundation for implementation.

# TeleAuto JS v1.0

## Product Requirements Document (PRD)

### Part 8

- Non-Functional Requirements
- Performance
- Reliability
- Security
- Maintainability
- Scalability
- Deployment Constraints
- Coding Standards

---

# 60. Non-Functional Requirements Overview

## 60.1 Purpose

This section defines the quality attributes expected from TeleAuto JS v1.0.

Unlike functional requirements, these requirements describe:

```text id="nfr_001"
How The System Operates
How Reliable It Must Be
How Fast It Must Be
How Easy It Must Be To Maintain
```

---

## 60.2 Design Philosophy

TeleAuto JS v1.0 prioritizes:

```text id="nfr_002"
Reliability
Operational Simplicity
Maintainability
Predictability
```

over:

```text id="nfr_003"
Distributed Architectures
Extreme Scale
Infrastructure Complexity
Premature Optimization
```

---

# 61. Performance Requirements

## 61.1 Expected Scale

Expected production workload:

```text id="perf_001"
Accounts: 5 – 20

Source Channels: 10 – 100

Destination Channels: 10 – 100

Links Per Day: < 10,000

Messages Cached: ~1,000
```

---

## 61.2 Performance Goal

The system shall comfortably operate within expected scale on:

```text id="perf_002"
Personal Computer

Termux Environment

Single VPS

Dedicated Server
```

without requiring architectural changes.

---

## 61.3 Monitoring Throughput

The Monitoring Worker shall process incoming Telegram updates in near real-time.

Target:

```text id="perf_003"
Seconds
Not Minutes
```

---

## 61.4 Conversion Throughput

Conversion throughput depends on:

```text id="perf_004"
Batch Size
Converter Provider Response Time
Telegram Network Conditions
```

The system shall not artificially slow conversion processing.

---

## 61.5 Broadcast Throughput

Broadcast throughput depends on:

```text id="perf_005"
Destination Count
Telegram Limits
Network Conditions
```

The Broadcast Worker shall continuously process eligible tasks.

---

## 61.6 Database Performance

All operational queues shall be index-backed.

Examples:

```text id="perf_006"
conversionStatus + createdAt

broadcastStatus + createdAt

taskStatus + scheduledAt
```

---

## 61.7 Performance Requirements

### NFR-PERF-001

The system shall support expected workload without external queue systems.

---

### NFR-PERF-002

Operational queues shall be index-backed.

---

### NFR-PERF-003

Database queries shall use indexed access patterns whenever possible.

---

### NFR-PERF-004

The system shall remain responsive under expected workload.

---

# 62. Reliability Requirements

## 62.1 Overview

Reliability is a primary objective.

The system should recover from failures without manual intervention whenever possible.

---

## 62.2 Failure Categories

Examples:

```text id="rel_001"
Application Restart

Power Failure

System Reboot

Temporary Network Failure

Telegram Connectivity Failure
```

---

## 62.3 Persistence

All operational state shall be persisted in MongoDB.

Examples:

```text id="rel_002"
Links

Messages

Conversion Batches

Broadcast Tasks

Channels

Accounts
```

---

## 62.4 Recovery Strategy

Startup Recovery shall reconstruct operational state using:

```text id="rel_003"
MongoDB State

Telegram State
```

---

## 62.5 Message Loss Prevention

Historical synchronization shall reduce the risk of missing messages during downtime.

Subject to:

```text id="rel_004"
maxHistoricalMessages
```

configuration.

---

## 62.6 Reliability Requirements

### NFR-REL-001

The system shall support startup recovery.

---

### NFR-REL-002

Operational state shall survive process restarts.

---

### NFR-REL-003

Historical synchronization shall support downtime recovery.

---

### NFR-REL-004

Worker failures shall be logged.

---

# 63. Security Requirements

## 63.1 Overview

TeleAuto is an administrative automation system.

Security requirements focus on protecting:

```text id="sec_001"
Telegram Sessions

Account Credentials

Configuration

Operational Data
```

---

## 63.2 Session Protection

Telegram session files shall never be exposed through exports.

---

## 63.3 Credential Storage

Sensitive configuration values shall be stored through:

```text id="sec_002"
Environment Variables
```

whenever practical.

Examples:

```text id="sec_003"
Database Credentials

API Credentials

Secrets
```

---

## 63.4 Principle of Minimal Exposure

Administrative outputs shall avoid displaying unnecessary sensitive information.

---

## 63.5 Security Logging

Administrative actions may be logged for troubleshooting purposes.

Examples:

```text id="sec_004"
Account Creation

Account Removal

Channel Changes
```

---

## 63.6 Security Requirements

### NFR-SEC-001

Session files shall remain outside export operations.

---

### NFR-SEC-002

Sensitive credentials should be stored through environment variables.

---

### NFR-SEC-003

Administrative operations should be auditable.

---

# 64. Maintainability Requirements

## 64.1 Overview

Maintainability is a major design goal.

The codebase should remain understandable and modifiable by a single developer.

---

## 64.2 Architecture Philosophy

The architecture shall favor:

```text id="main_001"
Simple Components

Clear Boundaries

Predictable Workflows
```

---

## 64.3 Module Separation

Major modules shall remain separated.

Examples:

```text id="main_002"
Monitoring

Recording

Conversion

Broadcasting

Scheduler

CLI
```

---

## 64.4 Complexity Control

The MVP intentionally avoids:

```text id="main_003"
Distributed Services

Microservices

Complex Infrastructure
```

---

## 64.5 Maintainability Requirements

### NFR-MAIN-001

Major business areas shall remain modular.

---

### NFR-MAIN-002

The codebase shall prioritize readability.

---

### NFR-MAIN-003

Infrastructure complexity shall be minimized.

---

# 65. Scalability Requirements

## 65.1 Overview

TeleAuto JS v1.0 is not designed for massive-scale distributed deployment.

However, reasonable growth should not require redesign.

---

## 65.2 Expected Growth

The architecture should comfortably support growth beyond the initial deployment.

Examples:

```text id="scale_001"
More Accounts

More Channels

More Links

More Broadcast Tasks
```

---

## 65.3 Scaling Philosophy

Scaling should initially occur through:

```text id="scale_002"
Better Hardware

More CPU

More Memory

Faster Storage
```

before architectural changes.

---

## 65.4 Future Evolution

The architecture intentionally allows future adoption of:

```text id="scale_003"
Redis

BullMQ

RabbitMQ

Kafka

Distributed Workers
```

if future requirements justify them.

---

## 65.5 Scalability Requirements

### NFR-SCALE-001

The architecture shall support expected operational growth.

---

### NFR-SCALE-002

The MVP shall prioritize vertical scaling.

---

### NFR-SCALE-003

Future infrastructure evolution shall remain possible.

---

# 66. Deployment Constraints

## 66.1 Supported Deployment Models

The MVP shall support:

```text id="dep_001"
Personal Computer

Termux

Single VPS

Dedicated Server
```

---

## 66.2 Startup Method

Primary startup command:

```bash id="dep_002"
node index.js
```

---

## 66.3 Infrastructure Constraints

The MVP shall not require:

```text id="dep_003"
Kubernetes

Docker Swarm

Redis Cluster

RabbitMQ

Kafka

Prometheus

Grafana

ELK
```

---

## 66.4 Installation Philosophy

Deployment should be achievable by:

```text id="dep_004"
Install Node.js

Install MongoDB

Configure Files

Run Application
```

---

## 66.5 Deployment Requirements

### NFR-DEP-001

The application shall run as a standalone Node.js process.

---

### NFR-DEP-002

The application shall not require container orchestration.

---

### NFR-DEP-003

The application shall support low-complexity deployment environments.

---

# 67. Filesystem Requirements

## 67.1 Directory Structure

Reference structure:

```text id="fs_001"
project/

├── config/
├── logs/
├── media/
├── exports/
├── sessions/
├── src/
├── config.json
├── .env
└── index.js
```

---

## 67.2 Media Storage

Media files shall be stored on filesystem.

MongoDB stores metadata only.

---

## 67.3 Session Storage

Telegram sessions shall be stored separately from business data.

---

## 67.4 Export Storage

Generated exports shall be stored under:

```text id="fs_002"
exports/
```

---

## 67.5 Filesystem Requirements

### NFR-FS-001

Media files shall not be stored inside MongoDB.

---

### NFR-FS-002

Session files shall be isolated from business data.

---

### NFR-FS-003

The application shall maintain organized storage directories.

---

# 68. Logging & Diagnostics Requirements

## 68.1 Diagnostic Goals

Diagnostics should allow operators to determine:

```text id="diag_001"
What Happened

When It Happened

Why It Happened
```

---

## 68.2 Logging Requirements

The system shall generate:

```text id="diag_002"
Application Logs

Error Logs
```

---

## 68.3 Worker Diagnostics

Workers shall expose:

```text id="diag_003"
Heartbeat Information
```

for troubleshooting.

---

## 68.4 Diagnostic Requirements

### NFR-DIAG-001

The system shall maintain operational logs.

---

### NFR-DIAG-002

Workers shall expose heartbeat information.

---

### NFR-DIAG-003

Operational failures shall be traceable through logs.

---

# 69. Data Integrity Requirements

## 69.1 Duplicate Protection

Duplicate link prevention shall occur through:

```text id="int_001"
Application Validation

MongoDB Unique Indexes
```

---

## 69.2 Referential Integrity

All references should point to valid entities whenever possible.

Examples:

```text id="int_002"
Link → Source Channel

Channel → Account

Task → Link
```

---

## 69.3 Immutable History

Historical business records should remain preserved.

Examples:

```text id="int_003"
Archived Links

Completed Broadcast Tasks

Completed Conversion Batches
```

---

## 69.4 Integrity Requirements

### NFR-INT-001

Duplicate protection shall exist at multiple layers.

---

### NFR-INT-002

Business history shall remain queryable.

---

### NFR-INT-003

Operational records should remain traceable.

---

# 70. Code Quality Standards

## 70.1 Objectives

The codebase should remain:

```text id="code_001"
Readable

Consistent

Maintainable
```

---

## 70.2 Language

Primary implementation language:

```text id="code_002"
JavaScript (Node.js)
```

---

## 70.3 Architectural Style

Preferred style:

```text id="code_003"
Modular

Layered

Service-Oriented
```

inside a single process.

---

## 70.4 Naming Consistency

The codebase should use consistent naming conventions across:

```text id="code_004"
Collections

Services

Workers

Configuration

CLI Commands
```

---

## 70.5 Error Handling

Operational failures should be:

```text id="code_005"
Logged

Classified

Traceable
```

---

## 70.6 Code Quality Requirements

### NFR-CODE-001

The codebase shall remain modular.

---

### NFR-CODE-002

Naming conventions shall remain consistent.

---

### NFR-CODE-003

Operational errors shall be logged.

---

### NFR-CODE-004

The codebase shall prioritize maintainability over premature optimization.

---

# 71. Non-Functional Requirements Summary

TeleAuto JS v1.0 shall prioritize:

```text id="summary_001"
Reliability

Simplicity

Maintainability

Operational Visibility

Low Infrastructure Requirements
```

while avoiding:

```text id="summary_002"
Premature Complexity

Distributed Architectures

Unnecessary Dependencies

Infrastructure Overengineering
```

The system is intentionally designed to deliver dependable automation through a straightforward operational model centered on:

```text id="summary_003"
Node.js
+
MongoDB
+
Filesystem Storage
+
CLI Administration
```

running as a single deployable application.

# TeleAuto JS v1.0

## Product Requirements Document (PRD)

### Part 9

- Final MVP Scope
- Explicit Out-of-Scope Features
- Acceptance Criteria
- Assumptions
- Risks
- Future Roadmap
- PRD Sign-Off

---

# 72. Final MVP Scope

## 72.1 Purpose

This section formally defines what TeleAuto JS v1.0 includes.

Anything not explicitly included in this section should be considered:

```text id="mvp_001"
Out Of Scope
Future Enhancement
Separate Project
```

---

## 72.2 MVP Functional Scope

TeleAuto JS v1.0 shall support:

### Monitoring

```text id="mvp_002"
Telegram Account Management

Source Channel Monitoring

Historical Message Recovery

Configured Domain Detection

Link Extraction

Message Recording

Media Detection

Media Download
```

---

### Link Management

```text id="mvp_003"
Link Creation

URL Normalization

Duplicate Detection

Link History

Link Archiving
```

---

### Conversion

```text id="mvp_004"
Single Conversion Account

Converter Provider Abstraction

Batch-Based Conversion

FIFO Batch Building

Configurable Batch Size

Conversion Timeouts

Response Matching
```

---

### Broadcasting

```text id="mvp_005"
Destination Channels

Broadcast Task Creation

Broadcast Templates

Media + Link Delivery

Task Tracking

Delivery Status Tracking
```

---

### Administration

```text id="mvp_006"
CLI Administration

Statistics

Exports

Logs

Operational Diagnostics
```

---

### Persistence

```text id="mvp_007"
MongoDB

Filesystem Media Storage

Filesystem Logging

Filesystem Exports
```

---

# 73. Explicitly Included MVP Features

The following capabilities are formally approved for implementation:

---

## 73.1 Accounts

```text id="inc_001"
Add Account

Remove Account

Enable Account

Disable Account

List Accounts

Show Account
```

---

## 73.2 Source Channels

```text id="inc_002"
Add Source Channel

Remove Source Channel

List Source Channels

Show Source Channel
```

---

## 73.3 Destination Channels

```text id="inc_003"
Add Destination Channel

Remove Destination Channel

List Destination Channels

Show Destination Channel
```

---

## 73.4 Messages

```text id="inc_004"
Store Messages Containing Configured Links

FIFO Cache Cleanup

Message Export

Message Statistics
```

---

## 73.5 Media

```text id="inc_005"
Media Detection

Media Download

Filesystem Storage

Media Metadata Storage
```

---

## 73.6 Links

```text id="inc_006"
Duplicate Detection

Conversion Tracking

Broadcast Tracking

Archiving

History Preservation
```

---

## 73.7 Conversion

```text id="inc_007"
Batch Creation

Batch Tracking

Conversion Provider

Timeout Handling

Status Tracking
```

---

## 73.8 Broadcasting

```text id="inc_008"
Broadcast Task Creation

Task Tracking

Task Completion

Failure Recording
```

---

## 73.9 Administration

```text id="inc_009"
CLI

Statistics

Exports

Logs
```

---

# 74. Explicit Out-of-Scope Features

## 74.1 Purpose

The following features are intentionally excluded from TeleAuto JS v1.0.

Their exclusion is deliberate.

---

# 75. Conversion Out-of-Scope

The MVP shall NOT implement:

```text id="oos_conv_001"
Multiple Conversion Accounts

Conversion Account Fallback

Provider Failover

Automatic Conversion Retries

Retry Scheduling

Retry Backoff

Conversion Prioritization
```

---

# 76. Broadcasting Out-of-Scope

The MVP shall NOT implement:

```text id="oos_brd_001"
Channel Routing Rules

Broadcast Groups

Broadcast Segments

Advanced Scheduling

Automatic Broadcast Retries

Rate Optimization

Per-Channel Templates
```

---

# 77. Monitoring Out-of-Scope

The MVP shall NOT implement:

```text id="oos_mon_001"
Message Editing Tracking

Message Deletion Tracking

Advanced Telegram Analytics

Real-Time Dashboards
```

---

# 78. User Interface Out-of-Scope

The MVP shall NOT implement:

```text id="oos_ui_001"
Web UI

Desktop UI

Mobile UI

REST API

GraphQL API
```

Administration shall occur through CLI.

---

# 79. Infrastructure Out-of-Scope

The MVP shall NOT require:

```text id="oos_inf_001"
Redis

BullMQ

RabbitMQ

Kafka

Prometheus

Grafana

ELK

Kubernetes

Docker Swarm
```

---

# 80. Database Out-of-Scope

The MVP shall NOT implement:

```text id="oos_db_001"
MongoDB Sharding

Distributed Databases

Multi-Region Replication

Event Sourcing
```

---

# 81. Telegram Ownership Out-of-Scope

The MVP shall NOT implement:

```text id="oos_tg_001"
Shared Destination Ownership

Shared Source Ownership

Multi-Account Channel Arbitration
```

Constraint:

```text id="oos_tg_002"
One Destination Channel
↓
One Owner Account
```

---

# 82. Future Scope (Approved Roadmap Candidates)

## 82.1 Overview

The following items are known future enhancements.

These are intentionally excluded from MVP implementation.

---

## 82.2 Conversion Enhancements

```text id="future_001"
Multiple Conversion Accounts

Conversion Fallback Chains

Provider Health Monitoring

Provider Priorities

Automatic Retries
```

---

## 82.3 Broadcasting Enhancements

```text id="future_002"
Routing Rules

Account-Based Rules

Channel-Based Rules

Broadcast Scheduling

Per-Channel Templates

Broadcast Retry Logic
```

---

## 82.4 Administration Enhancements

```text id="future_003"
Web UI

Dashboard

Live Monitoring

Health Screen

Advanced Reporting
```

---

## 82.5 Infrastructure Enhancements

```text id="future_004"
Distributed Workers

Redis

BullMQ

RabbitMQ

Kafka
```

---

## 82.6 Telegram Enhancements

```text id="future_005"
Shared Channel Ownership

Account Arbitration

Channel Assignment Logic
```

---

## 82.7 Data Enhancements

```text id="future_006"
Template Storage In MongoDB

Advanced Search

Advanced Statistics

Data Retention Policies
```

---

# 83. Assumptions

## 83.1 Operational Assumptions

The MVP assumes:

```text id="asm_001"
MongoDB Available

Filesystem Available

Telegram Accessible

Configured Accounts Valid
```

---

## 83.2 Scale Assumptions

Expected scale:

```text id="asm_002"
< 10,000 Links Per Day

5-20 Accounts

10-100 Channels
```

---

## 83.3 Deployment Assumptions

Deployment environments:

```text id="asm_003"
Personal Computer

Termux

Single VPS

Dedicated Server
```

---

## 83.4 Conversion Assumptions

The MVP assumes:

```text id="asm_004"
Converter Replies Are Structured

Converter Response Contains Link Mapping

Converter Response Arrives Within Timeout
```

---

## 83.5 Broadcasting Assumptions

The MVP assumes:

```text id="asm_005"
Destination Channels Support Required Message Types

Owner Account Has Posting Permission
```

---

# 84. Risks

## 84.1 Telegram Risks

Examples:

```text id="risk_001"
API Changes

Rate Limits

Permission Changes

Account Restrictions
```

---

## 84.2 Converter Risks

Examples:

```text id="risk_002"
Converter Bot Offline

Converter Bot Format Changes

Unexpected Responses
```

---

## 84.3 Operational Risks

Examples:

```text id="risk_003"
Disk Full

MongoDB Failure

Network Failure

Host System Failure
```

---

## 84.4 Scaling Risks

Examples:

```text id="risk_004"
Unexpected Growth

Higher Than Expected Link Volume
```

---

## 84.5 Risk Philosophy

The MVP accepts these risks in exchange for:

```text id="risk_005"
Reduced Complexity

Faster Delivery

Simpler Operations
```

---

# 85. Acceptance Criteria

## 85.1 Monitoring Acceptance

The system shall:

```text id="acc_001"
Monitor Configured Source Channels

Detect Configured Domains

Create Message Records

Download Media

Create Links
```

---

## 85.2 Duplicate Detection Acceptance

The system shall:

```text id="acc_002"
Prevent Duplicate Link Creation

Using URL Normalization

Using MongoDB Unique Indexes
```

---

## 85.3 Conversion Acceptance

The system shall:

```text id="acc_003"
Create Conversion Batches

Send Batches To Converter

Process Responses

Update Link Statuses
```

---

## 85.4 Broadcasting Acceptance

The system shall:

```text id="acc_004"
Create Broadcast Tasks

Deliver Messages

Track Delivery Status

Record Failures
```

---

## 85.5 Recovery Acceptance

The system shall:

```text id="acc_005"
Recover After Restart

Perform Historical Synchronization

Resume Operations
```

---

## 85.6 Administrative Acceptance

The system shall:

```text id="acc_006"
Support CLI Operations

Support Statistics

Support Exports
```

---

## 85.7 Deployment Acceptance

The system shall successfully operate through:

```bash id="acc_007"
node index.js
```

with:

```text id="acc_008"
MongoDB

Filesystem

Configuration Files
```

and no additional infrastructure.

---

# 86. MVP Completion Definition

TeleAuto JS v1.0 shall be considered complete when:

```text id="done_001"
Monitoring Works

Message Recording Works

Media Download Works

Link Creation Works

Duplicate Detection Works

Conversion Works

Broadcasting Works

Archiving Works

CLI Works

Recovery Works

Logging Works
```

and all acceptance criteria are satisfied.

---

# 87. PRD Sign-Off

## Product

```text id="sign_001"
TeleAuto JS v1.0
```

---

## Architecture Direction

```text id="sign_002"
Single Node.js Process

MongoDB

Filesystem Media Storage

Filesystem Logs

CLI Administration
```

---

## Infrastructure Direction

```text id="sign_003"
No Redis

No Kafka

No RabbitMQ

No Kubernetes

No Docker Swarm
```

---

## MVP Direction

```text id="sign_004"
Reliable

Simple

Maintainable

Operationally Practical
```

---

## Final Scope Lock

This PRD defines the approved scope of TeleAuto JS v1.0.

Features explicitly listed under:

```text id="sign_005"
Future Scope
```

or

```text id="sign_006"
Out Of Scope
```

shall not be implemented as part of the MVP unless the PRD is formally revised.

---

# 88. PRD Completion Statement

This document represents the complete Product Requirements Document for:

```text id="sign_007"
TeleAuto JS v1.0
```

covering:

```text id="sign_008"
Business Requirements
System Architecture
Data Architecture
Monitoring
Media Handling
Link Processing
Conversion
Broadcasting
Administration
Recovery
Operations
Non-Functional Requirements
Acceptance Criteria
Future Roadmap
```

and is considered implementation-ready for MVP development.
# Converter Response Validation and Invalid Link Handling

## Overview

Converter providers may return a response that preserves the original request structure while replacing successfully converted links.

Example request:

```text
101 - https://terabox.com/s/aaa

102 - https://terabox.com/s/bbb

103 - https://terabox.com/s/ccc
```

Example response:

```text
101 - https://converted.com/x1

102 - https://terabox.com/s/bbb

103 - https://converted.com/x3
```

In the above example:

- Link 101 converted successfully.
- Link 103 converted successfully.
- Link 102 was not converted.

---

## Conversion Result Evaluation

For every link submitted in a conversion batch:

```text
Original Link
↓
Find Matching Response Entry
↓
Extract Returned Link
↓
Compare With Original Link
```

---

## Successful Conversion

If the returned link differs from the original submitted link:

```text
convertedLink = Returned Link

conversionStatus = COMPLETED
```

Example:

```text
Original:
https://terabox.com/s/aaa

Returned:
https://converted.com/x1
```

Result:

```text
Conversion Successful
```

---

## Invalid Link Detection

If the returned link is identical to the originally submitted link:

```text
Original:
https://terabox.com/s/bbb

Returned:
https://terabox.com/s/bbb
```

then the system shall treat the link as invalid or non-convertible.

Result:

```text
convertedLink = INVALID_LINK

conversionStatus = FAILED
```

---

## Invalid Link Behavior

Links marked as:

```text
INVALID_LINK
```

shall not:

```text
Create Broadcast Tasks
Enter Broadcasting Workflow
Become Eligible For Delivery
```

---

## Historical Preservation

Invalid links shall remain stored in the Links collection for:

```text
Troubleshooting
Audit History
Duplicate Detection
Reporting
```

The link record shall not be deleted.

---

## Link Example

```js
{
  originalLink: "https://terabox.com/s/bbb",

  convertedLink: "INVALID_LINK",

  conversionStatus: "FAILED",

  broadcastStatus: "NOT_CREATED"
}
```

---

## Functional Requirements

### FR-CONV-007

The system shall compare returned links against original submitted links.

### FR-CONV-008

A returned link identical to the original link shall be treated as an invalid conversion.

### FR-CONV-009

Invalid links shall be marked with:

```text
convertedLink = INVALID_LINK
```

### FR-CONV-010

Invalid links shall not enter the broadcasting workflow.

### FR-CONV-011

Invalid links shall remain stored for historical and auditing purposes.

In the PRD, I used a naming convention:
FR = Functional Requirement
```text
FR-ARC-005
```

means:

```text
Functional Requirement
→ Archiving Section
→ Requirement #5
```
