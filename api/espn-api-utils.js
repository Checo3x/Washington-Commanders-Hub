// Base URL for the ESPN API. All specific endpoint paths will be appended to this.
const ESPN_API_BASE_URL = 'http://site.api.espn.com/apis/site/v2';

/**
 * Fetches data from a specified ESPN API path.
 * This helper function centralizes API key management, URL construction,
 * the actual fetch request, and initial response/error handling.
 *
 * @async
 * @param {string} path - The specific API path (e.g., 'sports/football/nfl/teams/28/schedule').
 * @param {object} [queryParams={}] - An object containing query parameters to be appended to the URL (e.g., { seasontype: 2, limit: 10 }).
 *                                    The 'apikey' is automatically added.
 * @returns {Promise<object>} A promise that resolves to the JSON data from the API response.
 * @throws {Error} Throws an error if:
 *                 - The `ESPN_API_KEY` environment variable is not set.
 *                 - A network error occurs during the fetch operation (e.g., server unreachable).
 *                 - The API response status is not 'ok' (i.e., not in the 200-299 range).
 *                 - The API response is not valid JSON.
 */
export async function fetchEspnApi(path, queryParams = {}) {
  // Retrieve the ESPN API key from environment variables.
  const API_KEY = process.env.ESPN_API_KEY;
  // If the API key is missing, throw a critical error. This is a configuration issue.
  if (!API_KEY) {
    // This error will be caught by the calling handler (e.g., in espn-events.js)
    // and should result in a 500 server error, as the application is misconfigured.
    throw new Error('ESPN_API_KEY is not defined in environment variables. This is a server configuration issue.');
  }

  // Construct the query string from queryParams object and automatically add the API key.
  const queryString = new URLSearchParams({ ...queryParams, apikey: API_KEY }).toString();
  // Combine the base URL, specific path, and query string to form the full API URL.
  const url = `${ESPN_API_BASE_URL}/${path}?${queryString}`;

  let response;
  try {
    // Perform the actual fetch request to the ESPN API.
    response = await fetch(url);
  } catch (networkError) {
    // Handle network-level errors (e.g., DNS resolution failure, server down, no internet connection).
    // Log the detailed error on the server for debugging.
    console.error(`Network error while fetching ESPN API at ${url}:`, networkError);
    // Throw a more generic error to be potentially shown to the client or handled upstream.
    throw new Error(`A network error occurred while trying to reach the ESPN API. Please check connectivity.`);
  }

  // Check if the HTTP response status code indicates success (e.g., 200 OK).
  if (!response.ok) {
    let errorBody = ''; // To store potential error details from the response body.
    try {
      // Attempt to read the response body as text for more detailed error information.
      errorBody = await response.text();
    } catch (textError) {
      // If reading the response body fails, we'll rely on the status code.
      // This catch block can be left empty or log the textError if needed for debugging.
      console.warn(`Failed to read error response body from ${url} (Status: ${response.status}):`, textError.message);
    }
    // Log a detailed error message on the server, including the URL, status, and response body.
    console.error(`Error fetching from ESPN API at ${url}. Status: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    // Throw an error that includes the HTTP status, which can be used by the calling handler.
    throw new Error(`Request to ESPN API failed with status ${response.status} (${response.statusText}).`);
  }

  // Try to parse the response body as JSON.
  try {
    const data = await response.json();
    return data; // Return the parsed JSON data on success.
  } catch (jsonError) {
    // Handle cases where the response is not valid JSON, despite a 2xx status.
    // Log the detailed JSON parsing error on the server.
    console.error(`Error parsing JSON response from ESPN API at ${url}:`, jsonError);
    // Throw an error indicating that the server's response was malformed.
    throw new Error('Failed to parse a supposedly valid JSON response from the ESPN API.');
  }
}
