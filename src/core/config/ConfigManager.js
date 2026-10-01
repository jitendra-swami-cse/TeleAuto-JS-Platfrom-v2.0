const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.configDir = path.join(__dirname, '..', '..', 'config');
    this.accountsPath = path.join(this.configDir, 'accounts.json');
    this.configPath = path.join(this.configDir, 'config.json');
    this.sourceChannelsPath = path.join(this.configDir, 'source-channels.json');
    this.destinationChannelsPath = path.join(this.configDir, 'destination-channels.json');
    
    this.accounts = [];
    this.appConfig = {};
    this.sourceChannels = [];
    this.destinationChannels = [];
  }

  loadAll() {
    this.appConfig = this.loadJson(this.configPath, {});
    this.accounts = this.loadJson(this.accountsPath, []);
    this.sourceChannels = this.loadJson(this.sourceChannelsPath, []);
    this.destinationChannels = this.loadJson(this.destinationChannelsPath, []);
    console.log('[ConfigManager] Configuration loaded.');
  }

  loadJson(filePath, defaultValue) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`[ConfigManager] Error reading file ${filePath}:`, error.message);
    }
    return defaultValue;
  }
  
  getAccounts() {
    return this.accounts;
  }
  
  getEnabledAccounts() {
    return this.accounts.filter(acc => acc.enabled);
  }
  
  getAppConfig() {
    return this.appConfig;
  }
}

module.exports = new ConfigManager();
