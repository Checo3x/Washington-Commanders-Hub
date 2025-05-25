// Import the shared ESPN API fetching utility.
import { fetchEspnApi } from './espn-api-utils.js';

// Constant defining the league for which standings are to be fetched.
// This could be made more dynamic if the application needed to support multiple leagues.
const LEAGUE = 'nfl'; // National Football League

// API path specific to fetching standings for the specified LEAGUE.
// This path is relative to the ESPN_API_BASE_URL defined in espn-api-utils.js.
const API_PATH = `sports/football/${LEAGUE}/standings`;

/**
 * Vercel serverless function handler for fetching ESPN league/team standings.
 * It uses the `fetchEspnApi` utility to retrieve data from the ESPN API
 * and then sends this data back to the client, or an error response if issues occur.
 *
 * @param {object} req - The incoming request object (unused in this specific handler).
 * @param {object} res - The outgoing response object used to send data or errors.
 */
export default async function handler(req, res) {
  try {
    // Define query parameters for the API request.
    // These parameters can filter or modify the data returned by the ESPN API.
    const queryParams = {
      groups: 'all', // 'all' usually ensures all relevant standings groups (e.g., conferences, divisions) are included.
      limit: 500     // A high limit to ensure all standings data is fetched. ESPN APIs sometimes paginate with smaller limits.
      // Other potential parameters for standings could include 'type' (e.g., 'league', 'conference', 'division')
      // or 'level' (e.g., for specific division levels if applicable).
    };

    // Call the shared utility function to fetch data from the ESPN API.
    // This handles API key, URL construction, fetching, and basic error checking.
    const data = await fetchEspnApi(API_PATH, queryParams);

    // If data is fetched successfully, send it back to the client with a 200 OK status.
    res.status(200).json(data);
  } catch (error) {
    // The fetchEspnApi function logs detailed errors on the server side.
    // Here, we log a more context-specific error message for this handler.
    console.error(`Error in espn-standings handler (fetching ${LEAGUE} standings):`, error.message);
    
    // Send a generic error response to the client to avoid exposing internal details.
    // The error message from fetchEspnApi (error.message) is included for more specific client-side debugging if needed.
    res.status(500).json({ error: `Failed to fetch ESPN ${LEAGUE} standings. ${error.message}` });
  }
}
