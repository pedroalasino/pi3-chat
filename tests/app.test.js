import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolverRuta } from '../src/app.js';
import { enviarAlPersonaje, cargarHistorial, guardarHistorial, borrarHistorial } from '../src/chat.js';
import handler from '../api/functions.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('resolverRuta (routing SPA)', () => {
  it('reconoce las vistas principales', () => {
    expect(resolverRuta('/home').vista).toBe('home');
    expect(resolverRuta('/').vista).toBe('home');
    expect(resolverRuta('/about').vista).toBe('about');
    expect(resolverRuta('/personajes').vista).toBe('personajes');
  });

  it('elige el personaje del chat según la URL', () => {
    const ruta = resolverRuta('/chat?personaje=niko');
    expect(ruta.vista).toBe('chat');
    expect(ruta.personaje.nombre).toBe('Niko Bellic');
  });

  it('usa a Jason por defecto y marca rutas desconocidas', () => {
    expect(resolverRuta('/chat').personaje.id).toBe('jason');
    expect(resolverRuta('/chat?personaje=trevor').vista).toBe('no-encontrado');
    expect(resolverRuta('/cualquiera').vista).toBe('no-encontrado');
  });
});

describe('enviarAlPersonaje (fetch mockeado, sin red)', () => {
  it('manda el historial a la función y devuelve la respuesta', async () => {
    const fetchFalso = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ respuesta: '  Hace calor en Vice City.  ' }),
    });
    const historial = [{ rol: 'usuario', texto: 'Hola' }];

    const texto = await enviarAlPersonaje('jason', historial, fetchFalso);

    expect(texto).toBe('Hace calor en Vice City.');
    expect(fetchFalso).toHaveBeenCalledWith('/api/functions', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body)).toEqual({ personaje: 'jason', historial });
  });

  it('muestra el error que devuelve el servidor', async () => {
    const fetchFalso = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Demasiados mensajes seguidos.' }),
    });
    await expect(enviarAlPersonaje('jason', [], fetchFalso)).rejects.toThrow('Demasiados mensajes seguidos.');
  });

  it('avisa si no hay conexión', async () => {
    const fetchFalso = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(enviarAlPersonaje('jason', [], fetchFalso)).rejects.toThrow('No hay conexión');
  });
});

describe('historial en localStorage', () => {
  it('guarda, carga y borra el historial por personaje', () => {
    guardarHistorial('lucia', [{ rol: 'usuario', texto: 'Hola' }]);
    expect(cargarHistorial('lucia')).toHaveLength(1);
    expect(cargarHistorial('jason')).toEqual([]);
    borrarHistorial('lucia');
    expect(cargarHistorial('lucia')).toEqual([]);
  });
});

// ---------- Serverless function ----------

function respuestaFalsa() {
  const res = { statusCode: 200, body: null, headers: {} };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (data) => ((res.body = data), res);
  res.setHeader = (k, v) => (res.headers[k] = v);
  return res;
}

describe('api/functions (proxy a Gemini)', () => {
  it('solo acepta POST', async () => {
    const res = respuestaFalsa();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(405);
  });

  it('rechaza personajes que no existen', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'clave-de-prueba');
    const res = respuestaFalsa();
    await handler({ method: 'POST', body: { personaje: 'trevor', historial: [] } }, res);
    expect(res.statusCode).toBe(400);
  });

  it('llama a Gemini con el system prompt y devuelve el texto', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'clave-de-prueba');
    const fetchFalso = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'Tranqui, amigo.' }] } }] }),
    });
    vi.stubGlobal('fetch', fetchFalso);

    const res = respuestaFalsa();
    await handler({ method: 'POST', body: { personaje: 'niko', historial: [{ rol: 'usuario', texto: 'Hola Niko' }] } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ respuesta: 'Tranqui, amigo.' });

    const [url, opciones] = fetchFalso.mock.calls[0];
    const cuerpo = JSON.parse(opciones.body);
    expect(url).toContain(':generateContent');
    expect(opciones.headers['x-goog-api-key']).toBe('clave-de-prueba');
    expect(cuerpo.systemInstruction.parts[0].text).toContain('Niko Bellic');
    expect(cuerpo.contents).toEqual([{ role: 'user', parts: [{ text: 'Hola Niko' }] }]);
  });

  it('traduce el límite de Gemini (429) a un mensaje claro', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'clave-de-prueba');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    const res = respuestaFalsa();
    await handler({ method: 'POST', body: { personaje: 'jason', historial: [{ rol: 'usuario', texto: 'Hola' }] } }, res);
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toContain('Esperá');
  });
});
