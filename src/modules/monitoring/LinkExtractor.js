class LinkExtractor {
  extractLinks(text) {
    if (!text) return [];
    // Basic regex to find HTTP/HTTPS URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? Array.from(new Set(matches)) : []; // remove exact string duplicates from same msg
  }
}

module.exports = new LinkExtractor();
