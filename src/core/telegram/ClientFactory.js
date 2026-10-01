const { TelegramClient } = require("telegram");

class ClientFactory {
  createClient(session, apiId, apiHash) {
    return new TelegramClient(session, Number(apiId), apiHash, {
      connectionRetries: 5,
    });
  }
}

module.exports = new ClientFactory();
