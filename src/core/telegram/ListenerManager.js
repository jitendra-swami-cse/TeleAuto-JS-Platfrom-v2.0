const { NewMessage } = require('telegram/events');
const EventRouter = require('../events/EventRouter');

class ListenerManager {
  attachListeners(client, account) {
    console.log(`[ListenerManager] Attaching core listeners for account ${account._id}...`);
    
    // Attach the single Top-Level Listener for New Messages
    client.addEventHandler(
      EventRouter.handleNewMessage(account._id),
      new NewMessage({}) // Empty filter means it listens to ALL new messages
    );

    console.log(`[ListenerManager] Listeners attached for account ${account._id}.`);
  }
}

module.exports = new ListenerManager();
