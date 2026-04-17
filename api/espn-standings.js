const { fetchEspnApi } = require('./espn-api-utils.js');

const LEAGUE = 'nfl';
const API_PATH = `sports/football/${LEAGUE}/standings`;

module.exports = async function handler(req, res) {
  try {
    const queryParams = {
      groups: 'all',
      limit: 500,
    };

    const data = await fetchEspnApi(API_PATH, queryParams);
    res.status(200).json(data);
  } catch (error) {
    console.error(`Error in espn-standings handler (fetching ${LEAGUE} standings):`, error.message);
    res.status(500).json({ error: `Failed to fetch ESPN ${LEAGUE} standings. ${error.message}` });
  }
};
