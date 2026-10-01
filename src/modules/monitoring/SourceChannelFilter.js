const ConfigManager = require('../../core/config/ConfigManager');

class SourceChannelFilter {
  isSourceChannel(message) {
    const sourceChannels = ConfigManager.sourceChannels;
    
    // GramJS message peerId handling.
    // It can be a PeerChannel, PeerUser, or PeerChat.
    // Usually, for channels, we look at message.peerId.channelId
    let chatId = null;
    
    if (message.peerId) {
      if (message.peerId.className === 'PeerChannel') {
        chatId = message.peerId.channelId.toString();
        // GramJS sometimes uses raw channel IDs without the -100 prefix.
        // We might need to handle both -100 and non -100 prefixes,
        // but for now we do a loose check.
      } else if (message.peerId.className === 'PeerChat') {
        chatId = message.peerId.chatId.toString();
      } else if (message.peerId.className === 'PeerUser') {
        chatId = message.peerId.userId.toString();
      }
    }

    if (!chatId) return false;

    // Check if the chat ID exists in our source-channels.json
    // Telegram channel IDs often start with -100. If our config has -100, we must match it.
    // A robust way is to check if the string ends with the channelId.
    return sourceChannels.some(channel => {
      const configId = channel.telegramChannelId.toString();
      return configId === chatId || configId === `-100${chatId}`;
    });
  }
}

module.exports = new SourceChannelFilter();
