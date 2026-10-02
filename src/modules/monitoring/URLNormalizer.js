const ConfigManager = require('../../core/config/ConfigManager');

class URLNormalizer {
  normalize(rawUrl) {
    let urlObj;
    try {
      urlObj = new URL(rawUrl);
    } catch (e) {
      return null; // Invalid URL
    }

    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.replace(/\/+$/, ''); // remove trailing slash

    // Find canonical provider mapping
    let canonicalProvider = hostname;
    const providers = ConfigManager.providers || [];
    
    for (const provider of providers) {
      if (provider.aliases && provider.aliases.includes(hostname)) {
        canonicalProvider = provider.provider;
        break;
      }
    }

    // Normalized pattern: ignores protocol, ignores query params/fragments. Uses Canonical Provider + pathname
    return `${canonicalProvider}${pathname}`;
  }
}

module.exports = new URLNormalizer();
