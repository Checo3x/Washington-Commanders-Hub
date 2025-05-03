import content from '../../data/content.json'; // Asegúrate de que la ruta sea correcta

export default async function handler(req, res) {
  try {
    res.status(200).json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
}
