// API endpoints for fetching data
const eventsUrl = '/api/espn-events';       // Fetches team events/schedule
const standingsUrl = '/api/espn-standings'; // Fetches team/league standings
const contentUrl = '/api/content';          // Fetches articles and podcasts

/**
 * Custom error class for more specific error handling related to data fetching operations.
 * This allows distinguishing FetchDataError instances from other generic errors.
 */
class FetchDataError extends Error {
    /**
     * Creates an instance of FetchDataError.
     * @param {string} message - The error message.
     * @param {string} type - A custom type for the error (e.g., 'NetworkError', 'HttpError', 'DataProcessingError', 'JsonParseError').
     * @param {number} [status] - The HTTP status code, if applicable.
     */
    constructor(message, type, status) {
        super(message);
        this.name = "FetchDataError";
        this.type = type;
        this.status = status;
    }
}

/**
 * Fetches data from a specified URL, processes it, and displays it in a designated DOM element.
 * Handles caching, loading states, and error display.
 *
 * @async
 * @param {string} url - The URL to fetch data from.
 * @param {string} elementId - The ID of the DOM element where data (or errors) will be displayed.
 * @param {string} cacheKey - The key to use for localStorage caching of the fetched data.
 * @param {function(object): (string|null)} processDataFunction - A function that takes the fetched JSON data as input
 *                                                              and returns an HTML string for display, or null/empty if no data.
 * @param {string} [emptyDataMessage='No data available.'] - Message to display if `processDataFunction` returns null or an empty string.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
async function fetchDataAndDisplay(url, elementId, cacheKey, processDataFunction, emptyDataMessage = 'No data available.') {
    const displayElement = document.getElementById(elementId);
    // If the main container element doesn't exist, log an error and abort.
    if (!displayElement) {
        console.error(`[${elementId}] Element with ID '${elementId}' not found. Cannot display data.`);
        return;
    }

    // Get references to loader, error message, and content area elements within the displayElement.
    const loader = displayElement.querySelector('.loader');
    const errorMessageElement = displayElement.querySelector('.error-message'); 
    // Use '.data-content' if it exists, otherwise fall back to the displayElement itself for content.
    const contentArea = displayElement.querySelector('.data-content') || displayElement;

    /**
     * Helper function to display error messages to the user.
     * @param {string} message - The error message to display.
     */
    const showError = (message) => {
        console.error(`[${elementId}] Error:`, message); // Log detailed error to console
        if (errorMessageElement) {
            // If a dedicated error message element exists, use it.
            errorMessageElement.textContent = message;
            errorMessageElement.classList.remove('hidden');
        } else {
            // Otherwise, display the error message directly in the content area.
            contentArea.innerHTML = `<p>${message}</p>`;
        }
        // If using a separate error element, clear any previous content from the main content area.
        if (errorMessageElement && contentArea !== displayElement) {
             contentArea.innerHTML = ''; 
        }
    };

    try {
        // Show loader and hide any previous error messages.
        if (loader) loader.classList.remove('hidden');
        if (errorMessageElement) errorMessageElement.classList.add('hidden');
        // Clear previous content from the content area before loading new data (unless it's the main display element itself).
        if (contentArea !== displayElement) contentArea.innerHTML = ''; 

        // Attempt to load data from localStorage cache first.
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            contentArea.innerHTML = cachedData; // Display cached HTML
            if (loader) loader.classList.add('hidden'); // Hide loader
            return; // Exit if cached data is successfully displayed
        }

        // --- Fetching data from network ---
        let response;
        try {
            response = await fetch(url);
        } catch (networkError) {
            // Handle network errors (e.g., DNS issues, server unreachable).
            console.error(`[${elementId}] Network error while fetching ${url}:`, networkError);
            throw new FetchDataError(`Could not connect to the server. Please check your internet connection.`, 'NetworkError');
        }

        // Check if the HTTP response status indicates an error.
        if (!response.ok) {
            const errorText = await response.text().catch(() => "Could not retrieve error details from response body."); 
            console.error(`[${elementId}] HTTP error ${response.status} while fetching ${url}: ${errorText}`);
            throw new FetchDataError(`Failed to load data: Server responded with ${response.status} (${response.statusText}).`, 'HttpError', response.status);
        }

        // Check if the content type of the response is JSON.
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text().catch(() => "Response was not valid JSON and its text could not be read.");
            console.error(`[${elementId}] Invalid content type. Expected JSON, got ${contentType}. Response text: ${responseText}`);
            throw new FetchDataError('The server provided data in an unexpected format (expected JSON).', 'JsonParseError');
        }

        // Parse the JSON data from the response body.
        let data;
        try {
            data = await response.json();
        } catch (jsonParseError) {
            console.error(`[${elementId}] Error parsing JSON from ${url}:`, jsonParseError);
            throw new FetchDataError('There was an issue understanding the data from the server (JSON parsing failed).', 'JsonParseError');
        }
        
        // --- Processing and Displaying Data ---
        let htmlContent;
        try {
            // Call the provided function to process the data into an HTML string.
            htmlContent = processDataFunction(data);
        } catch (processingError) {
            console.error(`[${elementId}] Error processing data for ${elementId}:`, processingError);
            // If the processing error is already a FetchDataError, rethrow it, otherwise wrap it.
            if (processingError instanceof FetchDataError) {
                throw processingError;
            }
            throw new FetchDataError('There was an issue preparing the data for display.', 'DataProcessingError');
        }

        // Display the processed HTML content or an empty data message.
        if (htmlContent && htmlContent.trim() !== '') {
            contentArea.innerHTML = htmlContent;
            localStorage.setItem(cacheKey, htmlContent); // Cache the successfully processed HTML.
        } else {
            // If processing returns null, empty string, or only whitespace, show the empty data message.
            contentArea.innerHTML = `<p>${emptyDataMessage}</p>`;
        }

    } catch (error) {
        // Catch all errors (FetchDataError instances or other unexpected errors).
        if (error instanceof FetchDataError) {
            // Display the specific message from our custom error.
            showError(`${error.message}`);
        } else {
            // For any other unexpected errors, log it and show a generic message.
            console.error(`[${elementId}] Unexpected error in fetchDataAndDisplay:`, error);
            showError('An unexpected error occurred. Please try again.');
        }
    } finally {
        // Always hide the loader, regardless of success or failure.
        if (loader) loader.classList.add('hidden');
    }
}

/**
 * Processes article data into an HTML string.
 * @param {object} data - The raw data object, expected to contain an 'articles' array.
 * @returns {string|null} An HTML string representing the articles, or null if no valid articles are found.
 */
function processArticles(data) {
    // Validate incoming data structure.
    if (!data || !data.articles || !Array.isArray(data.articles) || data.articles.length === 0) {
        console.warn("processArticles: No articles data found or data is not in the expected format.");
        return null; // Return null to indicate no processable data.
    }
    // Map each article to an HTML string.
    return data.articles.map(article => {
        // Provide default values for article properties to prevent errors.
        const title = article.title || "Untitled Article";
        const summary = article.summary || "No summary available.";
        const link = article.link || "#"; // Default link to '#' if missing.
        return `
        <article>
            <h3>${title}</h3>
            <p>${summary} <a href="${link}" rel="noopener" target="_blank">Leer más</a></p>
        </article>
    `;
    }).join(''); // Join all article HTML strings together.
}

/**
 * Processes podcast data into an HTML string.
 * @param {object} data - The raw data object, expected to contain a 'podcasts' array.
 * @returns {string|null} An HTML string representing the podcasts, or null if no valid podcasts are found.
 */
function processPodcasts(data) {
    // Validate incoming data structure.
    if (!data || !data.podcasts || !Array.isArray(data.podcasts) || data.podcasts.length === 0) {
        console.warn("processPodcasts: No podcasts data found or data is not in the expected format.");
        return null;
    }
    // Map each podcast to an HTML string.
    return data.podcasts.map(podcast => {
        const title = podcast.title || "Untitled Podcast";
        const src = podcast.src || ""; // Podcast source URL.
        // If the podcast source is missing, log a warning and skip rendering this item.
        if (!src) {
            console.warn(`processPodcasts: Podcast "${title}" is missing src and will be skipped.`);
            return ''; // Return empty string to effectively skip this item.
        }
        return `
        <div class="podcast-item">
            <h3>${title}</h3>
            <audio controls aria-label="Reproducir ${title}">
                <source src="${src}" type="audio/mpeg">
                Tu navegador no soporta audio HTML5.
            </audio>
        </div>
    `;
    }).join('');
}

/**
 * Processes team events (schedule) data into an HTML string.
 * @param {object} data - The raw data object from the ESPN events API, expected to contain an 'events' array.
 * @returns {string|null} An HTML string representing the team events, or null if no valid events can be processed.
 */
function processTeamEventsData(data) {
    // Validate the primary 'events' array.
    if (!data || !data.events || !Array.isArray(data.events) || data.events.length === 0) {
        console.warn("processTeamEventsData: No events data found or data is not in the expected format.");
        return null;
    }

    const processedEvents = data.events.map((event, index) => {
        // Basic validation for each event object.
        if (!event || typeof event !== 'object') {
            console.warn(`processTeamEventsData: Event at index ${index} is not a valid object. Skipping.`);
            return ''; // Skip this event.
        }

        // Process event date.
        let eventDateStr = 'Date N/A'; // Default date string.
        if (event.date) {
            try {
                const date = new Date(event.date);
                // Check if the date is valid before formatting.
                if (!isNaN(date)) {
                    eventDateStr = date.toLocaleString('es-ES', { 
                        timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', 
                        year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    });
                } else {
                    console.warn(`processTeamEventsData: Invalid date format for event at index ${index}: ${event.date}`);
                }
            } catch (e) {
                console.warn(`processTeamEventsData: Error parsing date for event at index ${index}: ${event.date}`, e);
            }
        }

        // Extract competition and competitor data.
        const competition = event.competitions && event.competitions[0];
        if (!competition || !competition.competitors || competition.competitors.length < 2) {
            // If essential competition/competitor data is missing, display minimal info.
            console.warn(`processTeamEventsData: Event at index ${index} ('${event.name || 'Unnamed Event'}') is missing competition or competitor data. Displaying minimal info.`);
            return `<p>Evento: ${event.name || 'Unnamed Event'} - Fecha: ${eventDateStr} - Datos de competición incompletos</p>`;
        }
        
        const competitors = competition.competitors;
        const homeTeamData = competitors.find(t => t && t.homeAway === 'home');
        const awayTeamData = competitors.find(t => t && t.homeAway === 'away');

        // Check if home and away team data (and nested team object) are present.
        if (!homeTeamData || !awayTeamData || !homeTeamData.team || !awayTeamData.team) {
            console.warn(`processTeamEventsData: Event at index ${index} ('${event.name || 'Unnamed Event'}') has incomplete team data. Displaying minimal info.`);
            return `<p>Evento: ${event.name || 'Unnamed Event'} - Fecha: ${eventDateStr} - Datos de equipo incompletos</p>`;
        }
        
        /**
         * Formats team information including logo and abbreviation.
         * @param {object} teamData - A competitor object containing team details.
         * @returns {string} HTML string for team display.
         */
        const formatTeamInfo = (teamData) => {
            const team = teamData.team;
            const name = team.displayName || team.name || 'Unknown Team'; // Fallback for team name.
            const abbreviation = team.abbreviation || 'N/A'; // Fallback for abbreviation.
            const logo = team.logo || ''; // Team logo URL.
            // Hide img tag if no logo to prevent broken image icon, alt text still useful for screen readers if logo were present.
            return `${abbreviation} <img src="${logo}" alt="${name} logo" style="height: 20px; vertical-align: middle; ${!logo ? 'display:none;' : ''}">`;
        };

        const homeTeamDisplay = formatTeamInfo(homeTeamData);
        const awayTeamDisplay = formatTeamInfo(awayTeamData);

        // Determine the score or event status.
        let score = 'Pendiente'; // Default status.
        if (competition.status && competition.status.type && competition.status.type.completed) {
            const homeScore = homeTeamData.score || '0'; // Default score to '0' if missing.
            const awayScore = awayTeamData.score || '0';
            score = `${homeScore} - ${awayScore}`;
        } else if (competition.status && competition.status.type && competition.status.type.description) {
            // Use status description if game is not completed (e.g., "Scheduled", "Postponed").
            score = competition.status.type.description; 
        }

        return `<p>${awayTeamDisplay} @ ${homeTeamDisplay} | Fecha: ${eventDateStr} | Estado: ${score}</p>`;
    }).filter(eventHtml => eventHtml !== '').join(''); // Filter out any skipped events and join.

    // If all events were skipped or resulted in empty strings.
    if (!processedEvents || processedEvents.trim() === '') {
        console.warn("processTeamEventsData: No events could be processed successfully into displayable HTML.");
        return null; 
    }
    return processedEvents;
}

/**
 * Processes team standings data into an HTML string.
 * This function tries various common structures in ESPN API responses for standings.
 * @param {object} data - The raw data object from the ESPN standings API.
 * @returns {string|null} An HTML string representing the team standings, or null if data cannot be processed.
 */
function processStandingsData(data) {
    // Basic validation of the incoming data object.
    if (!data || typeof data !== 'object') {
        console.warn("processStandingsData: No standings data found or data is not a valid object.");
        return null;
    }
    
    let teamRecord; // This will hold the specific record object for the Commanders or an overall record.

    // Attempt 1: Look for Commanders (ID '28') within a nested structure (common in league-wide standings).
    // This path might be like: data.children[conference_idx].children[division_idx].standings.entries
    // For simplicity, we iterate through direct children that might contain standings entries.
    if (data.children && Array.isArray(data.children)) {
        for (const child of data.children) { // Iterate conferences or similar groupings
            if (child.standings && child.standings.entries && Array.isArray(child.standings.entries)) {
                teamRecord = child.standings.entries.find(entry => entry.team && entry.team.id === '28'); // Washington Commanders ID
                if (teamRecord) break; // Found it, no need to search further.
            }
        }
    }
    
    // Attempt 2: Fallback to finding an 'overall' or 'total' type record in `data.record.items`.
    // This is common if the API endpoint is for a specific team or a simpler standings structure.
    if (!teamRecord && data.record && Array.isArray(data.record.items) && data.record.items.length > 0) {
        teamRecord = data.record.items.find(item => item.type === 'total' || item.description === 'Overall');
    } 
    // Attempt 3: Another common structure `data.records` array.
    else if (!teamRecord && Array.isArray(data.records) && data.records.length > 0){
         teamRecord = data.records.find(r => r.type === 'total' || r.name ==='Overall'); // 'name' can also indicate overall record type
    }

    // If no relevant record object was found after trying common paths.
    if (!teamRecord) {
        console.warn("processStandingsData: Target team record or overall record item not found in expected locations within the API response.");
        return null;
    }

    let wins = 0, losses = 0, ties = 0;

    // Priority 1: Parse from a 'summary' string (e.g., "10-6-1" or "10-6").
    if (teamRecord.summary && typeof teamRecord.summary === 'string') {
        const summaryMatch = teamRecord.summary.match(/^(\d+)-(\d+)(?:-(\d+))?$/); // Regex for W-L or W-L-T.
        if (summaryMatch) {
            wins = parseInt(summaryMatch[1], 10) || 0;
            losses = parseInt(summaryMatch[2], 10) || 0;
            ties = parseInt(summaryMatch[3], 10) || 0; // summaryMatch[3] will be undefined for W-L, so parseInt(undefined) is NaN, then || 0.
            return `<p>Washington Commanders: ${wins}V - ${losses}D - ${ties}E (Source: Summary String)</p>`;
        } else {
            // Log if summary string exists but doesn't match expected format.
            console.warn("processStandingsData: Could not parse W-L-T record from summary string:", teamRecord.summary);
        }
    }

    // Priority 2: Fallback to 'stats' array if summary parsing failed or summary was not present.
    if (teamRecord.stats && Array.isArray(teamRecord.stats)) {
        /**
         * Helper to safely extract a numeric stat value.
         * @param {string} name - The name of the stat (e.g., 'wins', 'losses', 'ties').
         * @returns {number} The stat value, or 0 if not found or not a valid number.
         */
        const getStatValue = (name) => {
            // Find stat by name (e.g. "wins") or common abbreviation (e.g. "W" for wins).
            const stat = teamRecord.stats.find(s => s && (s.name === name || s.abbreviation === name.toUpperCase().slice(0,1)));
            // Ensure value exists and convert to number, defaulting to 0.
            return stat && typeof stat.value === 'number' ? stat.value : (typeof stat.value === 'string' ? parseInt(stat.value,10) || 0 : 0) ;
        };
        wins = getStatValue('wins');
        losses = getStatValue('losses');
        ties = getStatValue('ties');
        
        // Only return if at least one stat was meaningfully extracted.
        if (wins > 0 || losses > 0 || ties > 0 || (teamRecord.stats.some(s => s.name === 'wins'))) { // Check if 'wins' stat exists even if 0
             return `<p>Washington Commanders: ${wins}V - ${losses}D - ${ties}E (Source: Stats Array)</p>`;
        } else {
             console.warn("processStandingsData: Found 'stats' array but could not extract meaningful W-L-T values.", teamRecord.stats);
        }
    }
    
    // If data could not be processed from any known structure.
    console.warn("processStandingsData: Could not determine standings from the available data structure.", data);
    return null; 
}

// --- Setup and Initial Fetch Calls ---

/**
 * Fetches and displays articles.
 */
async function fetchArticles() {
    await fetchDataAndDisplay(contentUrl, 'articles-list', 'articles-cache', processArticles, 'No hay artículos disponibles en este momento.');
}

/**
 * Fetches and displays podcasts.
 */
async function fetchPodcasts() {
    await fetchDataAndDisplay(contentUrl, 'podcast-list', 'podcasts-cache', processPodcasts, 'No hay podcasts disponibles en este momento.');
}

/**
 * Fetches and displays team events/schedule.
 */
async function fetchTeamEvents() {
    await fetchDataAndDisplay(eventsUrl, 'teams-data', 'commanders-events', processTeamEventsData, 'No hay partidos disponibles para los Commanders en este momento.');
}

/**
 * Fetches and displays team/league standings.
 */
async function fetchStandingsData() {
    await fetchDataAndDisplay(standingsUrl, 'temporada-data', 'commanders-standings', processStandingsData, 'No hay datos de clasificación disponibles en este momento.');
}

// Event listener for when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    // List of IDs for main data sections that need dynamic content.
    const mainDataSections = ['teams-data', 'temporada-data', 'articles-list', 'podcast-list'];
    
    // Initialize each section by ensuring it has loader, error message, and content-area divs.
    mainDataSections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            // Add a loader div if not present.
            if (!section.querySelector('.loader')) {
                const loaderDiv = document.createElement('div');
                loaderDiv.className = 'loader hidden'; // Start hidden.
                loaderDiv.textContent = 'Cargando...';
                section.prepend(loaderDiv); // Prepend to keep it at the top.
            }
            // Add an error message div if not present.
            if (!section.querySelector('.error-message')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message hidden'; // Start hidden.
                // Insert after the loader.
                section.insertBefore(errorDiv, section.querySelector('.loader').nextSibling); 
            }
            // Add a specific content area div if not present.
            // This helps separate content from loader/error messages.
            if (!section.querySelector('.data-content')) {
                const contentDiv = document.createElement('div');
                contentDiv.className = 'data-content';
                section.appendChild(contentDiv); // Append for content.
            }
        } else {
            console.warn(`DOMContentLoaded: Section with ID '${id}' not found. Cannot initialize.`);
        }
    });

    // Trigger initial data fetches.
    fetchTeamEvents();
    fetchStandingsData();
    fetchArticles();
    fetchPodcasts();

    // Particle Animation for Header
    const canvas = document.getElementById('header-particles');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particlesArray = [];
        const particleColors = ['#FFB612', '#FFFFFF', '#FFD700']; // Gold, White, Lighter Gold

        // Set canvas dimensions
        function resizeCanvas() {
            const header = document.querySelector('header');
            if (!header) return; // Guard against header not being found
            canvas.width = header.offsetWidth;
            canvas.height = header.offsetHeight;
        }

        // Call resizeCanvas initially and on window resize
        resizeCanvas(); // Initial call
        window.addEventListener('resize', resizeCanvas); // Adjust on resize

        const numberOfParticles = 50; // Keep it low for subtlety and performance

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height; 
                this.size = Math.random() * 2.5 + 0.5; 
                this.speedY = (Math.random() * 0.4 + 0.1) * -1; // Slow upward movement (0.1 to 0.5 pixels per frame)
                this.color = particleColors[Math.floor(Math.random() * particleColors.length)];
                this.opacity = Math.random() * 0.4 + 0.1; // Start with low opacity (0.1 to 0.5)
                this.initialOpacity = this.opacity; // Store initial opacity for reset
            }
            update() {
                this.y += this.speedY;
                this.opacity -= 0.002; // Fade out very slowly

                if (this.y < 0 || this.opacity <= 0) {
                    this.x = Math.random() * canvas.width;
                    this.y = canvas.height + this.size; 
                    this.opacity = this.initialOpacity; // Reset to its initial random opacity
                    this.size = Math.random() * 2.5 + 0.5;
                    this.speedY = (Math.random() * 0.4 + 0.1) * -1;
                    this.color = particleColors[Math.floor(Math.random() * particleColors.length)];
                }
            }
            draw() {
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticles() {
            particlesArray = [];
            if (canvas.width === 0 || canvas.height === 0) return; // Don't init if canvas has no dimensions
            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        }

        let animationFrameId = null;
        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
            ctx.globalAlpha = 1; // Reset globalAlpha after drawing all particles
            animationFrameId = requestAnimationFrame(animateParticles);
        }

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        function startAnimation() {
            if (animationFrameId) cancelAnimationFrame(animationFrameId); // Cancel previous animation frame
            resizeCanvas(); // Ensure canvas is sized correctly
            initParticles(); 
            if (particlesArray.length > 0) { // Only animate if particles were initialized
                animateParticles();
            }
        }

        if (!prefersReducedMotion.matches) {
            startAnimation(); // Start animation
            
            // Re-initialize particles on resize for new canvas dimensions
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (!prefersReducedMotion.matches) { // Check again in case preference changed
                       startAnimation();
                    } else {
                        if (animationFrameId) cancelAnimationFrame(animationFrameId);
                        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas if motion is now reduced
                    }
                }, 250); // Debounce resize event
            });
        } else {
            console.log("Particle animation disabled due to reduced motion preference.");
        }
    }
});
