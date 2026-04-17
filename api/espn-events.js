const { fetchEspnApi } = require('./espn-api-utils.js');

const TEAM_ID = '28';
const API_PATH = `sports/football/nfl/teams/${TEAM_ID}/schedule`;

module.exports = async function handler(req, res) {
  try {
    const queryParams = {
      seasontype: 2,
      groups: 'all',
      limit: 500,
    };

    const data = await fetchEspnApi(API_PATH, queryParams);
    res.status(200).json(data);
  } catch (error) {
    console.error(`Error in espn-events handler (fetching team schedule for ID ${TEAM_ID}):`, error.message);
    res.status(500).json({ error: `Failed to fetch ESPN team events. ${error.message}` });
  }
};
