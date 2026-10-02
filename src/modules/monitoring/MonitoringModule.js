const LinkExtractor = require('./LinkExtractor');
const URLNormalizer = require('./URLNormalizer');
const Message = require('../../models/Message');
const Link = require('../../models/Link');

// Helper to pad zeroes for timestamp formatting
const pad = (num, size) => ('000' + num).slice(size * -1);

class MonitoringModule {
  async processMessage(message, accountId, sourceChannel) {
    const channelName = sourceChannel && (sourceChannel.telegramChannelUsername || sourceChannel.title || sourceChannel.telegramChannelId);
    console.log(`\n[MonitoringModule][Account: ${accountId}] 📩 New Message Detected from [${channelName || 'Unknown Source Channel'}]!`);
    
    const messageText = message.message || '';
    const extractedUrls = LinkExtractor.extractLinks(messageText);
    
    if (extractedUrls.length === 0) {
      console.log(`[MonitoringModule] No links found in message ${message.id}. Ignoring.`);
      console.log(`----------------------------------------------------`);
      return;
    }
    
    // Generate mediaId if media is present
    let mediaId = 'noMedia';
    if (message.media && message.date) {
      // Create timestamp based on message.date (Unix timestamp in seconds)
      const date = new Date(message.date * 1000);
      const yyyy = date.getFullYear();
      const mm = pad(date.getMonth() + 1, 2);
      const dd = pad(date.getDate(), 2);
      const HH = pad(date.getHours(), 2);
      const MM = pad(date.getMinutes(), 2);
      const SS = pad(date.getSeconds(), 2);
      
      // Using a static -001 sequence since there's typically one media object per root message event in TeleAuto scope.
      mediaId = `${yyyy}${mm}${dd}-${HH}${MM}${SS}-001`;
    }
    
    // Standardize sourceChannelId prefixing
    let sourceChannelId = '';
    if (message.peerId) {
      if (message.peerId.className === 'PeerChannel') {
         sourceChannelId = message.peerId.channelId.toString();
         if (!sourceChannelId.startsWith('-100')) {
             sourceChannelId = `-100${sourceChannelId}`;
         }
      } else if (message.peerId.className === 'PeerChat') {
         sourceChannelId = message.peerId.chatId.toString();
      } else if (message.peerId.className === 'PeerUser') {
         sourceChannelId = message.peerId.userId.toString();
      }
    }
    
    // Use fallback title if we don't have chat info eagerly loaded
    const sourceChannelTitle = message.chat ? (message.chat.title || 'Unknown') : 'Unknown';

    // Store the raw message record
    try {
      await Message.create({
        telegramMessageId: message.id,
        sourceChannelId: sourceChannelId,
        messageBody: messageText,
        extractedLinks: extractedUrls,
        mediaId: mediaId,
        receivedAt: message.date ? new Date(message.date * 1000) : new Date()
      });
      console.log(`[MonitoringModule] Message ${message.id} cached to database.`);
    } catch (error) {
      console.error(`[MonitoringModule] Error caching message ${message.id}:`, error.message);
    }
    
    // Process and normalize links
    for (const rawUrl of extractedUrls) {
      const normalizedUrl = URLNormalizer.normalize(rawUrl);
      if (!normalizedUrl) continue;
      
      try {
        await Link.create({
          sourceChannelId: sourceChannelId,
          sourceChannelTitle: sourceChannelTitle,
          telegramMessageId: message.id,
          originalUrl: rawUrl,
          normalizedUrl: normalizedUrl,
          mediaId: mediaId
        });
        console.log(`[MonitoringModule] ✅ Link created successfully: ${normalizedUrl}`);
      } catch (error) {
        if (error.code === 11000) { // MongoDB Unique Constraint Violation
           console.log(`[MonitoringModule] ⚠️ Duplicate Link Detected: ${normalizedUrl}`);
        } else {
           console.error(`[MonitoringModule] Error saving link ${normalizedUrl}:`, error.message);
        }
      }
    }
    
    console.log(`----------------------------------------------------`);
  }
}

module.exports = new MonitoringModule();
