const fs = require('fs');
const path = require('path');
const { StringSession } = require('telegram/sessions');

class SessionManager {
  constructor() {
    this.sessionsDir = path.join(__dirname, '..', '..', '..', 'storage', 'sessions');
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  getSessionPath(sessionFile) {
    return path.join(this.sessionsDir, sessionFile);
  }

  loadSession(sessionFile) {
    const sessionPath = this.getSessionPath(sessionFile);
    if (fs.existsSync(sessionPath)) {
      const sessionString = fs.readFileSync(sessionPath, 'utf-8');
      return new StringSession(sessionString);
    }
    return new StringSession('');
  }

  saveSession(sessionFile, sessionString) {
    const sessionPath = this.getSessionPath(sessionFile);
    fs.writeFileSync(sessionPath, sessionString, 'utf-8');
    console.log(`[SessionManager] Session saved: ${sessionFile}`);
  }
}

module.exports = new SessionManager();
