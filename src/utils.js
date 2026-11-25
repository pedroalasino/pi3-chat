// Funciones puras de transformación y validación.
// Las usa el frontend y también la serverless function (api/functions.js).

export const MAX_LARGO_MENSAJE = 1000;
export const MAX_MENSAJES_HISTORIAL = 20;

/** Limpia el texto del usuario y avisa si no se puede enviar. */
export function validarMensaje(texto) {
  const limpio = String(texto ?? '').trim();
  if (!limpio) return { ok: false, error: 'Escribí algo antes de enviar.' };
  if (limpio.length > MAX_LARGO_MENSAJE) {
    return { ok: false, error: `El mensaje supera los ${MAX_LARGO_MENSAJE} caracteres.` };
  }
  return { ok: true, texto: limpio };
}

/** Se queda con los últimos N mensajes para no mandar contexto infinito. */
export function recortarHistorial(historial, max = MAX_MENSAJES_HISTORIAL) {
  if (!Array.isArray(historial)) return [];
  return historial.slice(-max);
}

/**
 * Convierte nuestro historial ({ rol: 'usuario' | 'personaje', texto })
 * al formato que espera Gemini ({ role: 'user' | 'model', parts: [{ text }] }).
 */
export function aContenidosGemini(historial) {
  return recortarHistorial(historial)
    .filter((m) => m && typeof m.texto === 'string' && m.texto.trim())
    .map((m) => ({
      role: m.rol === 'usuario' ? 'user' : 'model',
      parts: [{ text: m.texto.trim().slice(0, MAX_LARGO_MENSAJE) }],
    }));
}

/** Saca el texto de la respuesta de Gemini o lanza un error claro. */
export function parsearRespuestaGemini(json) {
  const candidato = json?.candidates?.[0];
  const texto = candidato?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim();

  if (texto) return texto;
  if (candidato?.finishReason === 'SAFETY') {
    throw new Error('El personaje prefirió no responder eso. Probá con otra pregunta.');
  }
  throw new Error('La IA no devolvió una respuesta.');
}

/** Hora corta para los mensajes, por ejemplo "14:05". */
export function formatearHora(fecha = new Date()) {
  const d = new Date(fecha);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Escapa HTML para mostrar texto del usuario o de la IA sin riesgo de inyección. */
export function escaparHtml(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
