import { describe, it, expect } from 'vitest';
import {
  validarMensaje,
  recortarHistorial,
  aContenidosGemini,
  parsearRespuestaGemini,
  escaparHtml,
  MAX_LARGO_MENSAJE,
} from '../src/utils.js';

describe('validarMensaje', () => {
  it('rechaza mensajes vacíos o solo con espacios', () => {
    expect(validarMensaje('   ').ok).toBe(false);
    expect(validarMensaje('').ok).toBe(false);
  });

  it('recorta espacios y acepta texto válido', () => {
    expect(validarMensaje('  hola Jason  ')).toEqual({ ok: true, texto: 'hola Jason' });
  });

  it('rechaza mensajes demasiado largos', () => {
    expect(validarMensaje('a'.repeat(MAX_LARGO_MENSAJE + 1)).ok).toBe(false);
  });
});

describe('aContenidosGemini', () => {
  it('convierte los roles al formato de Gemini', () => {
    const historial = [
      { rol: 'usuario', texto: 'Hola' },
      { rol: 'personaje', texto: '¿Qué tal?' },
    ];
    expect(aContenidosGemini(historial)).toEqual([
      { role: 'user', parts: [{ text: 'Hola' }] },
      { role: 'model', parts: [{ text: '¿Qué tal?' }] },
    ]);
  });

  it('descarta mensajes vacíos o mal formados', () => {
    const historial = [{ rol: 'usuario', texto: '  ' }, null, { rol: 'usuario', texto: 'ok' }];
    expect(aContenidosGemini(historial)).toHaveLength(1);
  });

  it('se queda solo con los últimos mensajes', () => {
    const largo = Array.from({ length: 30 }, (_, i) => ({ rol: 'usuario', texto: `m${i}` }));
    expect(recortarHistorial(largo, 5).map((m) => m.texto)).toEqual(['m25', 'm26', 'm27', 'm28', 'm29']);
  });
});

describe('parsearRespuestaGemini', () => {
  it('extrae el texto de la respuesta', () => {
    const json = { candidates: [{ content: { parts: [{ text: 'Todo tranqui ' }, { text: 'en Leonida.' }] } }] };
    expect(parsearRespuestaGemini(json)).toBe('Todo tranqui en Leonida.');
  });

  it('lanza un error si la respuesta viene vacía', () => {
    expect(() => parsearRespuestaGemini({ candidates: [] })).toThrow('no devolvió');
  });

  it('avisa cuando Gemini bloquea por seguridad', () => {
    expect(() => parsearRespuestaGemini({ candidates: [{ finishReason: 'SAFETY' }] })).toThrow('prefirió no responder');
  });
});

describe('escaparHtml', () => {
  it('evita que el texto se interprete como HTML', () => {
    expect(escaparHtml('<img onerror=alert(1)>')).toBe('&lt;img onerror=alert(1)&gt;');
  });
});
