const ESPN_API_BASE_URL = 'https://site.api.espn.com/apis/site/v2';

async function fetchEspnApi(path, queryParams = {}) {
  const apiKey = process.env.ESPN_API_KEY;
  if (!apiKey) {
    throw new Error('ESPN_API_KEY is not defined in environment variables. This is a server configuration issue.');
  }

  const queryString = new URLSearchParams({ ...queryParams, apikey: apiKey }).toString();
  const url = `${ESPN_API_BASE_URL}/${path}?${queryString}`;

  let response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    console.error(`Network error while fetching ESPN API at ${url}:`, networkError);
    throw new Error('A network error occurred while trying to reach the ESPN API. Please check connectivity.');
  }

  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch (textError) {
      console.warn(`Failed to read error response body from ${url} (Status: ${response.status}):`, textError.message);
    }
    console.error(`Error fetching from ESPN API at ${url}. Status: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    throw new Error(`Request to ESPN API failed with status ${response.status} (${response.statusText}).`);
  }

  try {
    return await response.json();
  } catch (jsonError) {
    console.error(`Error parsing JSON response from ESPN API at ${url}:`, jsonError);
    throw new Error('Failed to parse a supposedly valid JSON response from the ESPN API.');
  }
}

module.exports = { fetchEspnApi };
