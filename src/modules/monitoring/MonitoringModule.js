class MonitoringModule {
  processMessage(message, accountId) {
    // Phase 1B: Just verify we can receive the message.
    // In Phase 1C, we will extract links and store them in MongoDB.
    console.log(`\n[MonitoringModule][Account: ${accountId}] 📩 New Message Detected from Source Channel!`);
    console.log(`Message ID: ${message.id}`);
    console.log(`Message Text: ${message.message || '[No Text/Media Only]'}`);
    console.log(`----------------------------------------------------`);
  }
}

module.exports = new MonitoringModule();
