Edited package.json

I noticed your `npm start` command just showed the help menu and exited. That happened because our CLI tool requires the `start` argument (i.e. `node src/index.js start`). I just quickly updated your `package.json` so that simply typing `npm start` will automatically run it correctly!

Here is a simple explanation of what has been built so far (Phase 1A) and how the execution flows:

### What I Built (The "Telegram Foundation")

Instead of jumping straight into monitoring or converting links, we built the **core engine** that handles Telegram securely and efficiently.

1. **Config Manager**: A system that reads your settings from `config.json` and your telegram accounts from `accounts.json`.
2. **Session Manager**: A system that saves your Telegram login state (like a browser cookie) into local `.session` files so you only ever have to log in once.
3. **Client Manager**: The factory that creates the actual connection to Telegram using the saved session. It enforces your strict rule of **1 Account = 1 Client**.
4. **Login Wizard**: A simple terminal interface. If you don't have a saved session, it steps in and asks you for your phone number and OTP code right in the console.

### The Execution Flow (Step-by-Step)

When you run `npm start` right now, here is exactly what happens under the hood:

1. **Wake Up**: The application starts up and loads all the JSON configuration files into memory.
2. **Find Accounts**: It looks at `src/config/accounts.json` to find any accounts marked `"enabled": true`.
3. **Load Session**: For each enabled account, the `SessionManager` looks in the `storage/sessions/` folder to see if you have logged in before.
4. **Connect**: The `ClientManager` attempts to connect to Telegram using your `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, and the session.
5. **Authorization Check**:
   - **If it's your first time (No Session)**: The app pauses and the `LoginWizard` asks you to type your phone number and Telegram OTP code in the console. Once successful, it saves a permanent session file.
   - **If you've logged in before (Valid Session)**: It connects instantly in the background without bothering you.
6. **Ready State**: The Telegram Client is successfully connected and sits idle.

Right now, the flow ends at Step 6 because we haven't built the **Event Router and Listeners (Phase 1B)** to tell it what to listen for yet.

If you'd like to test this flow right now, just fill in your API keys in the `.env` file, put your phone number in `accounts.json`, and run `npm start`! Otherwise, we can move straight to building Phase 1B.

Created SourceChannelFilter.js
Created MonitoringModule.js
Created EventRouter.js
Created ListenerManager.js
Edited index.js

Awesome! Phase 1B (The Listener Runtime) is now fully integrated. Here is what has been built:

1. **`ListenerManager.js`**: Enforces your _Single Listener Rule_. It attaches exactly one `NewMessage` event listener to the Telegram client upon successful connection.
2. **`EventRouter.js`**: The central traffic cop! It receives all raw Telegram messages from the Listener and decides where they should go. Right now, it's checking if the message came from a Source Channel.
3. **`SourceChannelFilter.js`**: A smart filter that compares incoming message `peerId`/`chatId`s against your `source-channels.json` config.
4. **`MonitoringModule.js`**: The destination for source channel messages. Currently, it just logs the message to the console in a pretty format to prove the pipeline works (we will add the MongoDB saving and link extraction logic in Phase 1C).

### How to Test Phase 1B:

1. Create a `source-channels.json` file inside `src/config/` (I left a default empty array `[]` there, or you can create it). Add a channel you are a member of:
   ```json
   [
     {
       "telegramChannelId": "-1001234567890",
       "telegramChannelUsername": "some_test_channel"
     }
   ]
   ```
   _(Note: Telegram Channel IDs almost always start with `-100`. The filter will still try to match it if you accidentally forget the `-100`)._
2. Run `npm start`.
3. Wait for the `Listeners attached...` log.
4. Send a test message inside that Telegram channel, and you should instantly see it print to your terminal!

Try it out, and let me know when you're ready to tackle **Phase 1C: Monitoring Pipeline (Link Extraction & MongoDB)**!

Viewed SourceChannelFilter.js:1-37
