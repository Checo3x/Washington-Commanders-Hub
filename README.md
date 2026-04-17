# Washington Commanders Hub

Washington Commanders Hub es una web fan-made para seguir al equipo con una sola vista: calendario, clasificación, artículos y podcasts.

## Qué hace

- Muestra los próximos partidos y resultados del equipo.
- Consulta la clasificación de la NFL.
- Carga artículos y podcasts desde un contenido local.
- Guarda en caché HTML renderizado para acelerar la navegación.
- Incluye una animación ligera en el header.

## Stack

- HTML, CSS y JavaScript
- Vite para desarrollo y build
- Serverless functions en `/api`
- ESPN como fuente de datos deportivos

## Estructura

- `index.html`: estructura principal de la web
- `styles.css`: estilos visuales
- `scripts.js`: lógica de frontend y renderizado
- `api/`: funciones serverless
- `data/content.json`: contenido de artículos y podcasts

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notas

El proyecto usa funciones serverless para consultar ESPN y un archivo local JSON para el contenido editorial.
