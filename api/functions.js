// Vercel Serverless Function: proxy seguro entre el frontend y Google Gemini.
// La API key solo existe acá (variable de entorno), nunca en el navegador.

import { PERSONAJES } from './_personajes.js';
import { aContenidosGemini, parsearRespuestaGemini } from '../src/utils.js';

const MODELO_POR_DEFECTO = 'gemini-3.5-flash-lite';
const URL_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido. Usá POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en el servidor.' });
  }

  const { personaje, historial } = req.body ?? {};
  const datosPersonaje = PERSONAJES[personaje];
  if (!datosPersonaje) {
    return res.status(400).json({ error: 'Personaje inválido.' });
  }

  const contenidos = aContenidosGemini(historial);
  if (contenidos.length === 0 || contenidos.at(-1).role !== 'user') {
    return res.status(400).json({ error: 'El historial tiene que terminar con un mensaje del usuario.' });
  }

  const modelo = process.env.GEMINI_MODEL || MODELO_POR_DEFECTO;

  try {
    const respuesta = await fetch(`${URL_GEMINI}/${modelo}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: datosPersonaje.prompt }] },
        contents: contenidos,
        generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
      }),
    });

    if (respuesta.status === 429) {
      return res.status(429).json({ error: 'Demasiados mensajes seguidos. Esperá unos segundos y probá de nuevo.' });
    }
    if (!respuesta.ok) {
      return res.status(502).json({ error: 'La IA no está respondiendo. Probá de nuevo en un rato.' });
    }

    const json = await respuesta.json();
    const texto = parsearRespuestaGemini(json);
    return res.status(200).json({ respuesta: texto });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Error al conectar con la IA.' });
  }
}
