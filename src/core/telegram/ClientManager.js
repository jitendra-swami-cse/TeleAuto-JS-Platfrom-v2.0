const ClientFactory = require('./ClientFactory');
const SessionManager = require('./SessionManager');
const LoginWizard = require('./LoginWizard');
require('dotenv').config();

class ClientManager {
  constructor() {
    this.clients = new Map(); // accountId -> client instance
  }

  async connectAccount(account) {
    const apiId = process.env.TELEGRAM_API_ID;
    const apiHash = process.env.TELEGRAM_API_HASH;

    if (!apiId || !apiHash) {
      throw new Error('[ClientManager] TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env');
    }

    const session = SessionManager.loadSession(account.sessionFile);
    const client = ClientFactory.createClient(session, apiId, apiHash);

    console.log(`[ClientManager] Connecting account ${account._id} (${account.phoneNumber})...`);
    
    // We try to connect. If session is empty or invalid, we will need to login.
    await client.connect();

    const isAuthorized = await client.checkAuthorization();
    if (!isAuthorized) {
      console.log(`[ClientManager] Account ${account._id} needs login.`);
      await this.login(client, account);
    } else {
      console.log(`[ClientManager] Account ${account._id} connected successfully.`);
    }

    this.clients.set(account._id, client);
    return client;
  }

  async login(client, account) {
    const phoneNumber = account.phoneNumber || await LoginWizard.ask(`Enter phone number for account ${account._id} (with country code): `);
    
    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () => await LoginWizard.ask('Enter 2FA password (if any): '),
      phoneCode: async () => await LoginWizard.ask('Enter Telegram code: '),
      onError: (err) => console.log('[ClientManager] Login error:', err),
    });

    console.log(`[ClientManager] Account ${account._id} logged in successfully!`);
    SessionManager.saveSession(account.sessionFile, client.session.save());
  }

  getClient(accountId) {
    return this.clients.get(accountId);
  }
  
  async disconnectAll() {
    for (const [id, client] of this.clients) {
      console.log(`[ClientManager] Disconnecting account ${id}...`);
      await client.disconnect();
    }
    LoginWizard.close();
  }
}

module.exports = new ClientManager();
