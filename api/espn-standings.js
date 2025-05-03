const fetch = require('node-fetch');

module.exports = async (req, res) => {
    try {
        const response = await fetch('http://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/28?season=2024');
        if (!response.ok) {
            throw new Error('Error al obtener los datos de ESPN');
        }
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos de ESPN' });
    }
};
