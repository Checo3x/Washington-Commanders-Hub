const API_KEY = process.env.ESPN_API_KEY;
const TEAM_ID = '28'; // ID de Washington Commanders

export default async function handler(req, res) {
  try {
    const response = await fetch(`http://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${TEAM_ID}/schedule?seasontype=2&groups=all&limit=500&apikey=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`Error en la petición a la API de ESPN: ${response.status}`);
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching ESPN events:', error);
    res.status(500).json({ error: 'Failed to fetch ESPN events' });
  }
}
