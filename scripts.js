const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
const eventsUrl = `${baseUrl}/api/espn-events`;
const standingsUrl = `${baseUrl}/api/espn-standings`;
const contentUrl = `${baseUrl}/api/content`;

async function fetchTeamEvents() {
    const teamsDataDiv = document.getElementById('teams-data');
    const loader = teamsDataDiv.querySelector('.loader');
    const errorMessage = teamsDataDiv.querySelector('.error-message');

    try {
        const cachedData = localStorage.getItem('commanders-events');
        if (cachedData) {
            teamsDataDiv.innerHTML = cachedData;
            loader.classList.add('hidden');
            return;
        }

        const response = await fetch(eventsUrl);
        if (!response.ok) throw new Error('Error en la solicitud a la API');
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('La respuesta no es un JSON válido');
        }

        const result = await response.json();

        if (result.events && result.events.length > 0) {
            const events = result.events.map(event => {
                const date = new Date(event.date);
                const spainDate = date.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
                const teams = event.competitions[0].competitors;
                const logos = teams.map(team => `<img src="${team.team.logo}" alt="${team.team.displayName} logo">`).join(' vs ');
                const score = event.competitions[0].status.type.completed ? 
                    teams.map(team => team.score).join(' - ') : 'Pendiente';
                return `<p>${logos} Fecha: ${spainDate} Resultado: ${score}</p>`;
            });
            teamsDataDiv.innerHTML = events.join('');
            localStorage.setItem('commanders-events', teamsDataDiv.innerHTML);
        } else {
            teamsDataDiv.innerHTML = '<p>No hay partidos disponibles para los Commanders.</p>';
        }
    } catch (error) {
        console.error('Error en fetchTeamEvents:', error);
        errorMessage.classList.remove('hidden');
    } finally {
        loader.classList.add('hidden');
    }
}

async function fetchStandingsData() {
    const temporadaDataDiv = document.getElementById('temporada-data');
    const loader = temporadaDataDiv.querySelector('.loader');
    const errorMessage = temporadaDataDiv.querySelector('.error-message');

    try {
        const cachedData = localStorage.getItem('commanders-standings');
        if (cachedData) {
            temporadaDataDiv.innerHTML = cachedData;
            loader.classList.add('hidden');
            return;
        }

        const response = await fetch(standingsUrl);
        if (!response.ok) throw new Error('Error en la solicitud a la API');

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('La respuesta no es un JSON válido');
        }

        const result = await response.json();

        if (result.record && result.record.items && result.record.items.length > 0) {
            const overallRecord = result.record.items.find(item => item.name === 'overall');
            if (overallRecord && overallRecord.stats) {
                const wins = overallRecord.stats.find(stat => stat.name === 'wins')?.value || 0;
                const losses = overallRecord.stats.find(stat => stat.name === 'losses')?.value || 0;
                const ties = overallRecord.stats.find(stat => stat.name === 'ties')?.value || 0;
                temporadaDataDiv.innerHTML = `<p>Washington Commanders: ${wins}V - ${losses}D - ${ties}E</p>`;
                localStorage.setItem('commanders-standings', temporadaDataDiv.innerHTML);
            } else {
                temporadaDataDiv.innerHTML = '<p>No hay datos de clasificación disponibles.</p>';
            }
        } else {
            temporadaDataDiv.innerHTML = '<p>No hay datos de clasificación disponibles.</p>';
        }
    } catch (error) {
        console.error('Error en fetchStandingsData:', error);
        errorMessage.classList.remove('hidden');
    } finally {
        loader.classList.add('hidden');
    }
}

async function fetchArticles() {
    const articlesList = document.getElementById('articles-list');
    const loader = articlesList.querySelector('.loader');
    const errorMessage = articlesList.querySelector('.error-message');

    try {
        const response = await fetch(contentUrl);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error al cargar content.json:', response.status, response.statusText, errorText);
            throw new Error(`Error al cargar los artículos: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('Respuesta no JSON recibida:', responseText);
            throw new Error('La respuesta no es un JSON válido');
        }

        const { articles } = await response.json();

        articlesList.innerHTML = articles.map(article => `
            <article>
                <h3>${article.title}</h3>
                <p>${article.summary} <a href="${article.link}" rel="noopener">Leer más</a></p>
            </article>
        `).join('');
    } catch (error) {
        console.error('Error en fetchArticles:', error);
        errorMessage.classList.remove('hidden');
    } finally {
        loader.classList.add('hidden');
    }
}

async function fetchPodcasts() {
    const podcastList = document.getElementById('podcast-list');
    const loader = podcastList.querySelector('.loader');
    const errorMessage = podcastList.querySelector('.error-message');

    try {
        const response = await fetch(contentUrl);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error al cargar content.json:', response.status, response.statusText, errorText);
            throw new Error(`Error al cargar los podcasts: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('Respuesta no JSON recibida:', responseText);
            throw new Error('La respuesta no es un JSON válido');
        }

        const { podcasts } = await response.json();

        podcastList.innerHTML = podcasts.map(podcast => `
            <div class="podcast-item">
                <h3>${podcast.title}</h3>
                <audio controls aria-label="Reproducir ${podcast.title}">
                    <source src="${podcast.src}" type="audio/mpeg">
                    Tu navegador no soporta audio HTML5.
                </audio>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error en fetchPodcasts:', error);
        errorMessage.classList.remove('hidden');
    } finally {
        loader.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchTeamEvents();
    fetchStandingsData();
    fetchArticles();
    fetchPodcasts();
});
