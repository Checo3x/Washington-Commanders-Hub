// Import the shared ESPN API fetching utility.
import { fetchEspnApi } from './espn-api-utils.js';

// Constant defining the specific ESPN Team ID for the Washington Commanders.
// This ID is used to fetch team-specific data like their schedule.
const TEAM_ID = '28'; 

// API path specific to fetching the schedule for the team defined by TEAM_ID.
// This path is relative to the ESPN_API_BASE_URL defined in espn-api-utils.js.
const API_PATH = `sports/football/nfl/teams/${TEAM_ID}/schedule`;

/**
 * Vercel serverless function handler for fetching ESPN team events (schedule).
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
      seasontype: 2, // Typically '2' for regular season, '3' for postseason.
      groups: 'all', // 'all' usually ensures all relevant event groups are included.
      limit: 500     // A high limit to ensure all or most events are fetched. Adjust if pagination is needed or for performance.
    };

    // Call the shared utility function to fetch data from the ESPN API.
    // This handles API key, URL construction, fetching, and basic error checking.
    const data = await fetchEspnApi(API_PATH, queryParams);

    // If data is fetched successfully, send it back to the client with a 200 OK status.
    res.status(200).json(data);
  } catch (error) {
    // The fetchEspnApi function logs detailed errors on the server side.
    // Here, we log a more context-specific error message for this handler.
    console.error(`Error in espn-events handler (fetching team schedule for ID ${TEAM_ID}):`, error.message); 
    
    // Send a generic error response to the client to avoid exposing internal details.
    // The error message from fetchEspnApi (error.message) is included for more specific client-side debugging if needed.
    res.status(500).json({ error: `Failed to fetch ESPN team events. ${error.message}` });
  }
}
