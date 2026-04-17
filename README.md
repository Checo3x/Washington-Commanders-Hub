# Washington Commanders Hub

Un hub visual para seguir a los **Washington Commanders** con partidos, clasificaciones, artículos y podcasts en una sola interfaz.

## Demo

Despliegue recomendado en Vercel. Si lo publicas, añade aquí tu URL final.

## Qué incluye

- Calendario de partidos del equipo
- Clasificaciones de la NFL
- Artículos y podcasts desde un endpoint local
- Animación de partículas en el header
- Carga con estados de error y caché en `localStorage`

## Stack

- HTML5, CSS3 y JavaScript
- Vite
- API routes en Vercel
- ESPN API como fuente de datos

## Estructura del proyecto

- `index.html` — página principal
- `styles.css` — estilos y diseño visual
- `scripts.js` — lógica de fetch, caché y renderizado
- `api/` — funciones serverless para ESPN y contenido local
- `data/content.json` — artículos y podcasts del hub
- `images/` — recursos visuales

## Requisitos

Para las funciones que consultan ESPN, necesitas definir esta variable de entorno en Vercel o en local:

```bash
ESPN_API_KEY=tu_clave
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Despliegue

El proyecto está preparado para Vercel con funciones en `/api`.

## Mejoras pendientes

- Reescribir `README` con capturas y explicación de arquitectura
- Añadir tests de las funciones de procesamiento
- Separar mejor la lógica de presentación en módulos
- Mejorar accesibilidad en algunos componentes interactivos
