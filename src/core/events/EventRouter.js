const SourceChannelFilter = require('../../modules/monitoring/SourceChannelFilter');
const MonitoringModule = require('../../modules/monitoring/MonitoringModule');
const ConverterListener = require('../../modules/conversion/ConverterListener');
const ConfigManager = require('../config/ConfigManager');

class EventRouter {
  handleNewMessage(accountId) {
    // We return a handler function that gramJS can use
    return async (event) => {
      const message = event.message;

      // 1. Source Channel Routing
      const sourceChannel = SourceChannelFilter.isSourceChannel(message);
      if (sourceChannel) {
        MonitoringModule.processMessage(message, accountId, sourceChannel);
        return; // Handled
      }
      
      // 2. Converter Bot Routing
      if (message.isPrivate && ConfigManager.appConfig.converters) {
         ConverterListener.processMessage(message, accountId);
      }
      
      // Future: Broadcast Handler routing will go here
    };
  }
}

module.exports = new EventRouter();
