const SourceChannelFilter = require('../../modules/monitoring/SourceChannelFilter');
const MonitoringModule = require('../../modules/monitoring/MonitoringModule');

class EventRouter {
  handleNewMessage(accountId) {
    // We return a handler function that gramJS can use
    return async (event) => {
      const message = event.message;

      // Check if this message came from a configured source channel
      if (SourceChannelFilter.isSourceChannel(message)) {
        MonitoringModule.processMessage(message, accountId);
      }
      
      // Future: Converter Bot Handler routing will go here
      // Future: Broadcast Handler routing will go here
    };
  }
}

module.exports = new EventRouter();
