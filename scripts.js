(() => {
  'use strict';

  const ENDPOINTS = {
    events: '/api/espn-events',
    standings: '/api/espn-standings',
    content: '/api/content',
  };

  const CACHE_KEYS = {
    articles: 'articles-cache',
    podcasts: 'podcasts-cache',
    events: 'commanders-events',
    standings: 'commanders-standings',
  };

  const TEAM_ID = '28';
  const TEAM_NAME = 'Washington Commanders';

  class FetchDataError extends Error {
    constructor(message, type, status) {
      super(message);
      this.name = 'FetchDataError';
      this.type = type;
      this.status = status;
    }
  }

  const state = {
    animationFrameId: null,
    particles: [],
    resizeTimer: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function getSectionParts(section) {
    return {
      loader: section?.querySelector('.loader') || null,
      error: section?.querySelector('.error-message') || null,
      content: section?.querySelector('.data-content') || section || null,
    };
  }

  function ensureSectionShell(sectionId) {
    const section = $(sectionId);
    if (!section) {
      console.warn(`DOMContentLoaded: Section with ID '${sectionId}' not found. Cannot initialize.`);
      return;
    }

    if (!section.querySelector('.loader')) {
      const loader = document.createElement('div');
      loader.className = 'loader hidden';
      loader.textContent = 'Cargando...';
      section.prepend(loader);
    }

    if (!section.querySelector('.error-message')) {
      const error = document.createElement('p');
      error.className = 'error-message hidden';
      error.textContent = 'Error al cargar los datos. Inténtalo de nuevo más tarde.';
      const loader = section.querySelector('.loader');
      if (loader && loader.nextSibling) {
        section.insertBefore(error, loader.nextSibling);
      } else {
        section.appendChild(error);
      }
    }

    if (!section.querySelector('.data-content')) {
      const content = document.createElement('div');
      content.className = 'data-content';
      section.appendChild(content);
    }
  }

  function setLoaderVisible(sectionId, visible) {
    const section = $(sectionId);
    if (!section) return;
    const { loader } = getSectionParts(section);
    if (!loader) return;
    loader.classList.toggle('hidden', !visible);
  }

  function setErrorVisible(sectionId, message) {
    const section = $(sectionId);
    if (!section) return;
    const { error, content } = getSectionParts(section);
    if (error) {
      error.textContent = message;
      error.classList.remove('hidden');
    } else if (content) {
      content.innerHTML = `<p>${escapeHtml(message)}</p>`;
    }
  }

  function hideError(sectionId) {
    const section = $(sectionId);
    if (!section) return;
    const { error } = getSectionParts(section);
    if (error) error.classList.add('hidden');
  }

  function getContentArea(sectionId) {
    const section = $(sectionId);
    if (!section) return null;
    const area = section.querySelector('.data-content');
    return area || section;
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No se pudieron recuperar los detalles del error.');
      throw new FetchDataError(
        `Failed to load data: Server responded with ${response.status} (${response.statusText}).`,
        'HttpError',
        response.status,
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new FetchDataError('The server provided data in an unexpected format (expected JSON).', 'JsonParseError');
    }

    try {
      return await response.json();
    } catch (error) {
      throw new FetchDataError('There was an issue understanding the data from the server (JSON parsing failed).', 'JsonParseError');
    }
  }

  async function fetchDataAndDisplay({
    url,
    sectionId,
    cacheKey,
    processData,
    emptyMessage = 'No data available.',
  }) {
    const section = $(sectionId);
    const contentArea = getContentArea(sectionId);

    if (!section || !contentArea) {
      console.error(`[${sectionId}] Element with ID '${sectionId}' not found. Cannot display data.`);
      return;
    }

    try {
      setLoaderVisible(sectionId, true);
      hideError(sectionId);
      contentArea.innerHTML = '';

      const cachedHtml = localStorage.getItem(cacheKey);
      if (cachedHtml) {
        contentArea.innerHTML = cachedHtml;
        return;
      }

      const data = await fetchJson(url);
      const html = processData(data);

      if (html && html.trim()) {
        contentArea.innerHTML = html;
        localStorage.setItem(cacheKey, html);
      } else {
        contentArea.innerHTML = `<p>${escapeHtml(emptyMessage)}</p>`;
      }
    } catch (error) {
      const message = error instanceof FetchDataError
        ? error.message
        : 'An unexpected error occurred. Please try again.';

      console.error(`[${sectionId}]`, error);
      setErrorVisible(sectionId, message);
    } finally {
      setLoaderVisible(sectionId, false);
    }
  }

  function processArticles(data) {
    const articles = data?.articles;
    if (!Array.isArray(articles) || !articles.length) {
      console.warn('processArticles: No articles data found or data is not in the expected format.');
      return null;
    }

    return articles.map(article => {
      const title = escapeHtml(article.title || 'Untitled Article');
      const summary = escapeHtml(article.summary || 'No summary available.');
      const link = article.link || '#';

      return `
        <article>
          <h3>${title}</h3>
          <p>${summary} <a href="${escapeHtml(link)}" rel="noopener" target="_blank">Leer más</a></p>
        </article>
      `;
    }).join('');
  }

  function processPodcasts(data) {
    const podcasts = data?.podcasts;
    if (!Array.isArray(podcasts) || !podcasts.length) {
      console.warn('processPodcasts: No podcasts data found or data is not in the expected format.');
      return null;
    }

    return podcasts.map(podcast => {
      const title = escapeHtml(podcast.title || 'Untitled Podcast');
      const src = podcast.src || '';
      if (!src) {
        console.warn(`processPodcasts: Podcast "${title}" is missing src and will be skipped.`);
        return '';
      }

      return `
        <div class="podcast-item">
          <h3>${title}</h3>
          <audio controls aria-label="Reproducir ${title}">
            <source src="${escapeHtml(src)}" type="audio/mpeg">
            Tu navegador no soporta audio HTML5.
          </audio>
        </div>
      `;
    }).join('');
  }

  function formatEventDate(dateStr) {
    if (!dateStr) return 'Date N/A';

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return 'Date N/A';
    }

    return date.toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatTeamInfo(teamData) {
    const team = teamData?.team || {};
    const name = escapeHtml(team.displayName || team.name || 'Unknown Team');
    const abbreviation = escapeHtml(team.abbreviation || 'N/A');
    const logo = team.logo || '';

    return `${abbreviation} ${logo ? `<img src="${escapeHtml(logo)}" alt="${name} logo" style="height: 20px; vertical-align: middle;">` : ''}`;
  }

  function processTeamEventsData(data) {
    const events = data?.events;
    if (!Array.isArray(events) || !events.length) {
      console.warn('processTeamEventsData: No events data found or data is not in the expected format.');
      return null;
    }

    const processed = events.map((event, index) => {
      if (!event || typeof event !== 'object') {
        console.warn(`processTeamEventsData: Event at index ${index} is not a valid object. Skipping.`);
        return '';
      }

      const eventDateStr = formatEventDate(event.date);
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors;

      if (!competition || !Array.isArray(competitors) || competitors.length < 2) {
        console.warn(`processTeamEventsData: Event at index ${index} ('${event.name || 'Unnamed Event'}') is missing competition or competitor data. Displaying minimal info.`);
        return `<p>Evento: ${escapeHtml(event.name || 'Unnamed Event')} - Fecha: ${escapeHtml(eventDateStr)} - Datos de competición incompletos</p>`;
      }

      const homeTeamData = competitors.find(team => team?.homeAway === 'home');
      const awayTeamData = competitors.find(team => team?.homeAway === 'away');

      if (!homeTeamData || !awayTeamData || !homeTeamData.team || !awayTeamData.team) {
        console.warn(`processTeamEventsData: Event at index ${index} ('${event.name || 'Unnamed Event'}') has incomplete team data. Displaying minimal info.`);
        return `<p>Evento: ${escapeHtml(event.name || 'Unnamed Event')} - Fecha: ${escapeHtml(eventDateStr)} - Datos de equipo incompletos</p>`;
      }

      let score = 'Pendiente';
      if (competition.status?.type?.completed) {
        const homeScore = homeTeamData.score || '0';
        const awayScore = awayTeamData.score || '0';
        score = `${homeScore} - ${awayScore}`;
      } else if (competition.status?.type?.description) {
        score = competition.status.type.description;
      }

      return `<p>${formatTeamInfo(awayTeamData)} @ ${formatTeamInfo(homeTeamData)} | Fecha: ${escapeHtml(eventDateStr)} | Estado: ${escapeHtml(score)}</p>`;
    }).filter(Boolean).join('');

    if (!processed || !processed.trim()) {
      console.warn('processTeamEventsData: No events could be processed successfully into displayable HTML.');
      return null;
    }

    return processed;
  }

  function extractTeamRecord(data) {
    let teamRecord = null;

    if (Array.isArray(data?.children)) {
      for (const child of data.children) {
        if (Array.isArray(child?.standings?.entries)) {
          teamRecord = child.standings.entries.find(entry => entry?.team?.id === TEAM_ID);
          if (teamRecord) break;
        }
      }
    }

    if (!teamRecord && Array.isArray(data?.record?.items) && data.record.items.length > 0) {
      teamRecord = data.record.items.find(item => item?.type === 'total' || item?.description === 'Overall');
    }

    if (!teamRecord && Array.isArray(data?.records) && data.records.length > 0) {
      teamRecord = data.records.find(record => record?.type === 'total' || record?.name === 'Overall');
    }

    return teamRecord;
  }

  function processStandingsData(data) {
    if (!data || typeof data !== 'object') {
      console.warn('processStandingsData: No standings data found or data is not a valid object.');
      return null;
    }

    const teamRecord = extractTeamRecord(data);
    if (!teamRecord) {
      console.warn('processStandingsData: Target team record or overall record item not found in expected locations within the API response.');
      return null;
    }

    let wins = 0;
    let losses = 0;
    let ties = 0;

    if (typeof teamRecord.summary === 'string') {
      const summaryMatch = teamRecord.summary.match(/^(\d+)-(\d+)(?:-(\d+))?$/);
      if (summaryMatch) {
        wins = parseInt(summaryMatch[1], 10) || 0;
        losses = parseInt(summaryMatch[2], 10) || 0;
        ties = parseInt(summaryMatch[3], 10) || 0;
        return `<p>${TEAM_NAME}: ${wins}V - ${losses}D - ${ties}E (Source: Summary String)</p>`;
      }
      console.warn('processStandingsData: Could not parse W-L-T record from summary string:', teamRecord.summary);
    }

    if (Array.isArray(teamRecord.stats)) {
      const getStatValue = (name) => {
        const stat = teamRecord.stats.find(item => item && (item.name === name || item.abbreviation === name.toUpperCase().slice(0, 1)));
        if (!stat) return 0;
        if (typeof stat.value === 'number') return stat.value;
        if (typeof stat.value === 'string') return parseInt(stat.value, 10) || 0;
        return 0;
      };

      wins = getStatValue('wins');
      losses = getStatValue('losses');
      ties = getStatValue('ties');

      if (wins > 0 || losses > 0 || ties > 0 || teamRecord.stats.some(s => s?.name === 'wins')) {
        return `<p>${TEAM_NAME}: ${wins}V - ${losses}D - ${ties}E (Source: Stats Array)</p>`;
      }

      console.warn("processStandingsData: Found 'stats' array but could not extract meaningful W-L-T values.", teamRecord.stats);
    }

    console.warn('processStandingsData: Could not determine standings from the available data structure.', data);
    return null;
  }

  async function fetchArticles() {
    await fetchDataAndDisplay({
      url: ENDPOINTS.content,
      sectionId: 'articles-list',
      cacheKey: CACHE_KEYS.articles,
      processData: processArticles,
      emptyMessage: 'No hay artículos disponibles en este momento.',
    });
  }

  async function fetchPodcasts() {
    await fetchDataAndDisplay({
      url: ENDPOINTS.content,
      sectionId: 'podcast-list',
      cacheKey: CACHE_KEYS.podcasts,
      processData: processPodcasts,
      emptyMessage: 'No hay podcasts disponibles en este momento.',
    });
  }

  async function fetchTeamEvents() {
    await fetchDataAndDisplay({
      url: ENDPOINTS.events,
      sectionId: 'teams-data',
      cacheKey: CACHE_KEYS.events,
      processData: processTeamEventsData,
      emptyMessage: 'No hay partidos disponibles para los Commanders en este momento.',
    });
  }

  async function fetchStandingsData() {
    await fetchDataAndDisplay({
      url: ENDPOINTS.standings,
      sectionId: 'temporada-data',
      cacheKey: CACHE_KEYS.standings,
      processData: processStandingsData,
      emptyMessage: 'No hay datos de clasificación disponibles en este momento.',
    });
  }

  function resizeCanvas(canvas, header) {
    if (!canvas || !header) return;
    canvas.width = header.offsetWidth;
    canvas.height = header.offsetHeight;
  }

  function setupParticles() {
    const canvas = $('header-particles');
    const header = document.querySelector('header');
    if (!canvas || !header) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particleColors = ['#FFB612', '#FFFFFF', '#FFD700'];
    const numberOfParticles = 50;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * canvas.width;
        this.y = initial ? Math.random() * canvas.height : canvas.height + this.size;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedY = -(Math.random() * 0.4 + 0.1);
        this.color = particleColors[Math.floor(Math.random() * particleColors.length)];
        this.opacity = Math.random() * 0.4 + 0.1;
        this.initialOpacity = this.opacity;
      }

      update() {
        this.y += this.speedY;
        this.opacity -= 0.002;

        if (this.y < 0 || this.opacity <= 0) {
          this.reset(false);
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
      state.particles = [];
      if (canvas.width === 0 || canvas.height === 0) return;

      for (let i = 0; i < numberOfParticles; i += 1) {
        state.particles.push(new Particle());
      }
    }

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      state.particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      ctx.globalAlpha = 1;
      state.animationFrameId = requestAnimationFrame(animateParticles);
    }

    function startAnimation() {
      if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
      resizeCanvas(canvas, header);
      initParticles();
      if (state.particles.length > 0) animateParticles();
    }

    const handleResize = () => {
      clearTimeout(state.resizeTimer);
      state.resizeTimer = setTimeout(() => {
        resizeCanvas(canvas, header);
        if (!prefersReducedMotion.matches) {
          startAnimation();
        } else {
          if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 250);
    };

    resizeCanvas(canvas, header);
    window.addEventListener('resize', handleResize);

    if (!prefersReducedMotion.matches) {
      startAnimation();
    } else {
      console.log('Particle animation disabled due to reduced motion preference.');
    }
  }

  function init() {
    ['teams-data', 'temporada-data', 'articles-list', 'podcast-list'].forEach(ensureSectionShell);
    fetchTeamEvents();
    fetchStandingsData();
    fetchArticles();
    fetchPodcasts();
    setupParticles();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
