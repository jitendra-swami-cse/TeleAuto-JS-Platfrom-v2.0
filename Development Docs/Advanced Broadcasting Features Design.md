# Advanced Broadcasting Features — Design Document

> **Status:** Proposed Features — Not Yet Implemented
> **Purpose:** Detailed design specifications for advanced broadcasting capabilities to be implemented in a future phase.

---

## Feature 1: Source-to-Destination Channel Linking

### What is it?

Currently, when a link is extracted from **any** source channel, a `BroadcastTask` is created for **every** destination channel. There is no relationship between where a link came from and where it gets sent.

**Channel Linking** adds a direct configuration that says:
> "Links extracted from Source Channel A must ONLY be broadcast to Destination Channels X, Y, and Z."

### Why is this useful?

- You may run multiple niche source channels. A "Movies" source channel should only broadcast to "Movies Destination" channels, not to a "Software" channel.
- Gives you granular control over content routing without writing any code.
- Allows future scaling to many channels without cross-contamination of content.

---

### Configuration Design

The linking is configured directly on the `source-channels.json` file. Each source channel gets an optional `broadcastTo` array containing the `telegramChannelId` values of the destination channels it is allowed to broadcast to.

```json
// src/config/source-channels.json
[
  {
    "telegramChannelId": "-1004324690702",
    "telegramChannelUsername": "For_ac_01",
    "title": "Movies Source Channel",
    "ownerAccountId": "acc001",
    "historySyncEnabled": true,
    "historySyncLimit": 200,
    "mediaDownloadEnabled": true,

    // NEW FIELD: Whitelist of destination channel IDs for links from this source.
    // If this field is absent or empty, links will broadcast to ALL destination channels
    // (backward-compatible default behavior).
    "broadcastTo": [
      "-1001234567890",
      "-1009876543210"
    ]
  },
  {
    "telegramChannelId": "-1004111222333",
    "telegramChannelUsername": "Software_Source",
    "title": "Software Source Channel",
    "ownerAccountId": "acc001",
    "historySyncEnabled": true,
    "historySyncLimit": 100,
    "mediaDownloadEnabled": false,

    // This channel broadcasts to only one specific destination.
    "broadcastTo": [
      "-1005555444333"
    ]
  }
]
```

---

### How it Changes the Code

**Only one file needs to change: `src/modules/broadcast/BroadcastTaskCreator.js`**

Current flow in `createTasks()`:
```
Get ALL destination channels from ConfigManager.destinationChannels
  -> Create a task for EVERY destination channel
```

New flow after this feature:
```
Get the source channel config for this link (match via link.sourceChannelId)
  -> Check if sourceChannel.broadcastTo exists and is non-empty
       YES -> Filter destination channels to only those whose telegramChannelId
              is in the sourceChannel.broadcastTo array
       NO  -> Use ALL destination channels (default behavior, backward compatible)
  -> Create tasks only for the filtered destination channels
```

### Code Change Sketch (for BroadcastTaskCreator.js)

```js
// Inside createTasks(), replace the current destination channel block:

for (const link of pendingLinks) {
  // NEW: Find the source channel config for this link
  const allSourceChannels = ConfigManager.sourceChannels || [];
  const sourceChannelConfig = allSourceChannels.find(
    sc => sc.telegramChannelId === link.sourceChannelId
  );

  // NEW: Determine which destination channels to use
  let destinationChannels = ConfigManager.destinationChannels || [];
  if (
    sourceChannelConfig &&
    sourceChannelConfig.broadcastTo &&
    sourceChannelConfig.broadcastTo.length > 0
  ) {
    // Filter to only the whitelisted channels
    destinationChannels = destinationChannels.filter(dest =>
      sourceChannelConfig.broadcastTo.includes(dest.telegramChannelId)
    );
  }
  // If broadcastTo is absent or empty, destinationChannels remains ALL channels

  // ... rest of the task creation logic is unchanged ...
}
```

### Impact on Other Files

| File | Change Required |
|------|----------------|
| `src/config/source-channels.json` | Add `broadcastTo` array per channel |
| `src/modules/broadcast/BroadcastTaskCreator.js` | Add 10 lines of filtering logic |
| All other files | **NO CHANGE NEEDED** |

---

---

## Feature 2: Broadcasting Rules (Rate Limiting & Time Windows)

### What is it?

**Broadcasting Rules** gives each destination channel its own configurable schedule that controls *when* and *how many* links can be broadcast to it. The `BroadcastWorker` checks these rules before sending a message and defers it if the rules are not satisfied.

### Why is this useful?

- Avoid spamming a channel with 50 messages in one minute after a long downtime.
- Broadcast content only during peak hours when your audience is active (e.g., evenings only).
- Control daily message caps per channel to keep content quality high.
- Stagger content delivery naturally across the day.

---

### Rule Types Supported

| Rule | Config Key | Description |
|------|-----------|-------------|
| Max per hour | `maxPerHour` | Max number of links that can be broadcast to this channel in any 1-hour window |
| Max per day | `maxPerDay` | Max number of links broadcast to this channel in a 24-hour UTC day |
| Only during time window | `duringTime` | Only broadcast between a start and end time (e.g., 4pm to 6pm) |
| Only after a certain time | `afterTime` | Only broadcast after this time of day (e.g., after 8am) |
| Only before a certain time | `beforeTime` | Only broadcast before this time of day (e.g., before 10pm) |
| Minimum gap between messages | `minGapMinutes` | Enforce a minimum gap (in minutes) between successive broadcasts to this channel |

All times are in **24-hour format (HH:MM)** and compared in the **local server time** (or a configurable timezone).

---

### Configuration Design

Rules are configured on the `destination-channels.json` file. Each destination channel gets an optional `broadcastRules` object.

```json
// src/config/destination-channels.json
[
  {
    "telegramChannelId": "-1001234567890",
    "title": "Movies Destination",
    "ownerAccountId": "acc001",

    // NEW FIELD: Broadcasting rules for this channel.
    // All rules are optional. If absent, there are no restrictions (default behavior).
    "broadcastRules": {
      "maxPerHour": 5,
      "maxPerDay": 30,
      "minGapMinutes": 10,
      "duringTime": { "from": "16:00", "to": "22:00" },
      "timezone": "Asia/Kolkata"
    }
  },
  {
    "telegramChannelId": "-1009876543210",
    "title": "Software Destination",
    "ownerAccountId": "acc001",

    // This channel has no rules, so it broadcasts instantly with no limits.
    "broadcastRules": null
  },
  {
    "telegramChannelId": "-1005555444333",
    "title": "Late Night Deals",
    "ownerAccountId": "acc001",
    "broadcastRules": {
      "afterTime": "20:00",
      "beforeTime": "02:00",
      "maxPerHour": 3,
      "timezone": "Asia/Kolkata"
    }
  }
]
```

---

### Architecture Design

This feature requires **two components**:

#### Component A: BroadcastRulesChecker (New File)

A pure utility class (not a worker) that answers one question:
> "Is it allowed to send a new broadcast to channel X right now?"

It does this by:
1. Reading the channel's `broadcastRules` config.
2. Counting how many `COMPLETED` BroadcastTasks exist for that channel in the last 1 hour and last 24 hours.
3. Finding the timestamp of the last `COMPLETED` BroadcastTask for that channel to enforce `minGapMinutes`.
4. Checking whether the current local time falls within the allowed time window.

If any check fails, it returns a reason string (e.g., `"maxPerHour limit reached (5/5)"`).
If all checks pass, it returns `null` (meaning: allowed, proceed).

**New file: `src/modules/broadcast/BroadcastRulesChecker.js`**

```js
// Conceptual sketch only

class BroadcastRulesChecker {
  async isAllowed(destinationChannelId, rules) {
    if (!rules) return { allowed: true }; // No rules = always allowed

    const now = /* current time in rules.timezone */;

    // 1. Check time window
    if (rules.duringTime) {
      const inWindow = isTimeBetween(now, rules.duringTime.from, rules.duringTime.to);
      if (!inWindow) {
        return { allowed: false, reason: `Outside broadcast window (${rules.duringTime.from} - ${rules.duringTime.to})` };
      }
    }
    if (rules.afterTime && now < rules.afterTime) {
      return { allowed: false, reason: `Before allowed start time (${rules.afterTime})` };
    }
    if (rules.beforeTime && now > rules.beforeTime) {
      return { allowed: false, reason: `After allowed end time (${rules.beforeTime})` };
    }

    // 2. Count broadcasts in the last 1 hour
    if (rules.maxPerHour) {
      const countLastHour = await BroadcastTask.countDocuments({
        destinationChannelId,
        status: 'COMPLETED',
        completedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      });
      if (countLastHour >= rules.maxPerHour) {
        return { allowed: false, reason: `Hourly limit reached (${countLastHour}/${rules.maxPerHour})` };
      }
    }

    // 3. Count broadcasts today
    if (rules.maxPerDay) {
      const startOfDay = /* midnight in rules.timezone */;
      const countToday = await BroadcastTask.countDocuments({
        destinationChannelId,
        status: 'COMPLETED',
        completedAt: { $gte: startOfDay }
      });
      if (countToday >= rules.maxPerDay) {
        return { allowed: false, reason: `Daily limit reached (${countToday}/${rules.maxPerDay})` };
      }
    }

    // 4. Enforce minimum gap between messages
    if (rules.minGapMinutes) {
      const lastTask = await BroadcastTask.findOne({
        destinationChannelId,
        status: 'COMPLETED'
      }).sort({ completedAt: -1 });

      if (lastTask && lastTask.completedAt) {
        const gapMs = Date.now() - lastTask.completedAt.getTime();
        const gapMinutes = gapMs / 60000;
        if (gapMinutes < rules.minGapMinutes) {
          const waitMinutes = Math.ceil(rules.minGapMinutes - gapMinutes);
          return { allowed: false, reason: `Minimum gap not reached (wait ${waitMinutes} more min)` };
        }
      }
    }

    return { allowed: true };
  }
}
```

#### Component B: BroadcastWorker (Modified)

The `BroadcastWorker` already defers tasks by updating `scheduledAt`. The rules checker plugs directly into it with just a few extra lines.

Current `BroadcastWorker` flow:
```
Pick QUEUED task
  -> Send message
```

New flow after this feature:
```
Pick QUEUED task
  -> Load destination channel config + its broadcastRules
  -> BroadcastRulesChecker.isAllowed(destinationChannelId, rules)
       NOT ALLOWED -> Defer task (update scheduledAt by e.g. 5 minutes) + log reason
       ALLOWED     -> Send message (existing logic unchanged)
```

---

### Full Data Flow with Both Features

```
Message arrives in "Movies Source Channel"
  -> MonitoringModule creates Link (sourceChannelId = "Movies Source")

BroadcastTaskCreator runs
  -> Finds sourceChannel config for this link
  -> Sees broadcastTo: ["-100DEST_1", "-100DEST_3"]
  -> Creates BroadcastTasks ONLY for Dest_1 and Dest_3
  -> Dest_2, Dest_4, Dest_5 get NO tasks (Channel Linking applied)

BroadcastWorker runs
  -> Picks up task for Dest_1
  -> Loads Dest_1's broadcastRules: { maxPerHour: 5, duringTime: "16:00-22:00" }
  -> BroadcastRulesChecker.isAllowed()
       Current time is 14:00 (2pm) => OUTSIDE window
       -> Defer task by 5 minutes, log: "Deferred: Outside broadcast window (16:00 - 22:00)"

  -> At 16:05 (4pm+) BroadcastWorker picks up the deferred task again
  -> BroadcastRulesChecker.isAllowed()
       Current time is 16:05 => inside window
       countLastHour = 2, maxPerHour = 5 => OK
       -> ALLOWED -> Send message to Dest_1
```

---

### Impact Summary

| Feature | New Files | Modified Files |
|---------|-----------|---------------|
| Channel Linking | None | `BroadcastTaskCreator.js` (~10 lines), `source-channels.json` |
| Broadcasting Rules | `BroadcastRulesChecker.js` (new) | `BroadcastWorker.js` (~15 lines), `destination-channels.json` |

---

### Recommended Implementation Order

**Step 1:** Implement Feature 1 (Channel Linking) first. It is simpler, purely config-driven, and has no new files.

**Step 2:** Implement Feature 2 (Broadcasting Rules) second. It requires a new checker utility and timezone handling.

> For timezone support, use the `dayjs` npm package with the `dayjs-timezone` plugin. It is lightweight and has a clean API for time comparisons across timezones.

---

### Summary Table

| | Feature 1: Channel Linking | Feature 2: Broadcasting Rules |
|---|---|---|
| **Config location** | `source-channels.json` | `destination-channels.json` |
| **Config key** | `broadcastTo: [...]` | `broadcastRules: { ... }` |
| **When it applies** | At task creation time (BroadcastTaskCreator) | At task execution time (BroadcastWorker) |
| **Effect of violation** | Task never created for that channel | Task deferred, rescheduled automatically |
| **Complexity** | Low | Medium (timezone + DB count queries) |
| **New files needed** | 0 | 1 (BroadcastRulesChecker.js) |
| **Backward compatible** | Yes (absent = all channels) | Yes (absent rules = no restrictions) |
