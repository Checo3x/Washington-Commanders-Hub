const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, '..', 'data', 'content.json');

function readContent() {
  try {
    const raw = fs.readFileSync(contentPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading content.json:', error);
    return { articles: [], podcasts: [] };
  }
}

module.exports = function handler(req, res) {
  try {
    res.status(200).json(readContent());
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
};
