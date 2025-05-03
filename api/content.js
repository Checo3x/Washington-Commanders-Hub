const path = require('path');
const fs = require('fs');

module.exports = (req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'data', 'content.json');
        const content = fs.readFileSync(filePath, 'utf8');
        res.status(200).json(JSON.parse(content));
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar content.json' });
    }
};
