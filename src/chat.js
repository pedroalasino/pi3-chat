// Lógica del chat: estado, historial en localStorage, llamada a la API y renderizado.

import { validarMensaje, formatearHora, escaparHtml } from './utils.js';

const CLAVE_STORAGE = (id) => `pi3-chat-historial-${id}`;

// ---------- Historial (localStorage) ----------

export function cargarHistorial(personajeId, storage = globalThis.localStorage) {
  try {
    const crudo = storage?.getItem(CLAVE_STORAGE(personajeId));
    const datos = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

export function guardarHistorial(personajeId, historial, storage = globalThis.localStorage) {
  try {
    storage?.setItem(CLAVE_STORAGE(personajeId), JSON.stringify(historial));
  } catch {
    // Si el navegador bloquea localStorage, el chat sigue funcionando en memoria.
  }
}

export function borrarHistorial(personajeId, storage = globalThis.localStorage) {
  try {
    storage?.removeItem(CLAVE_STORAGE(personajeId));
  } catch {
    /* sin storage disponible */
  }
}

// ---------- Llamada a la serverless function ----------

/** Manda todo el historial a /api/functions y devuelve el texto del personaje. */
export async function enviarAlPersonaje(personajeId, historial, fetcher = globalThis.fetch) {
  let respuesta;
  try {
    respuesta = await fetcher('/api/functions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaje: personajeId, historial }),
    });
  } catch {
    throw new Error('No hay conexión. Revisá tu internet y probá de nuevo.');
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error || 'Algo salió mal. Probá de nuevo.');
  }
  if (typeof datos.respuesta !== 'string' || !datos.respuesta.trim()) {
    throw new Error('La respuesta llegó vacía.');
  }
  return datos.respuesta.trim();
}

// ---------- Vista del chat ----------

function htmlMensaje(mensaje, personaje) {
  const esUsuario = mensaje.rol === 'usuario';
  const autor = esUsuario ? 'Vos' : personaje.nombre;
  const copiar = esUsuario
    ? ''
    : `<button class="mensaje__copiar" type="button" data-copiar aria-label="Copiar respuesta">Copiar</button>`;

  return `
    <li class="mensaje ${esUsuario ? 'mensaje--usuario' : 'mensaje--personaje'}">
      <div class="mensaje__burbuja">
        <p class="mensaje__texto">${escaparHtml(mensaje.texto)}</p>
        <div class="mensaje__pie">
          <span class="mensaje__autor">${escaparHtml(autor)} · ${escaparHtml(mensaje.hora ?? '')}</span>
          ${copiar}
        </div>
      </div>
    </li>`;
}

export function montarChat(contenedor, personaje) {
  let historial = cargarHistorial(personaje.id);
  let esperando = false;

  contenedor.innerHTML = `
    <section class="chat" style="--color-personaje: ${personaje.color}">
      <header class="chat__cabecera">
        <span class="avatar" aria-hidden="true">${personaje.iniciales}</span>
        <div class="chat__quien">
          <h1 class="chat__nombre">${personaje.nombre}</h1>
          <p class="chat__lugar">${personaje.juego} · ${personaje.lugar}</p>
        </div>
        <div class="chat__acciones">
          <span class="chat__guardado" data-guardado hidden>Historial guardado</span>
          <button class="boton boton--fantasma" type="button" data-borrar>Borrar historial</button>
        </div>
      </header>

      <ol class="chat__mensajes" data-mensajes aria-live="polite"></ol>

      <p class="chat__error" data-error role="alert" hidden></p>

      <form class="chat__form" data-form>
        <label class="sr-only" for="entrada">Mensaje para ${personaje.nombre}</label>
        <textarea id="entrada" class="chat__entrada" rows="1" maxlength="1000"
          placeholder="Escribile a ${personaje.nombre.split(' ')[0]}…" data-entrada></textarea>
        <button class="boton boton--enviar" type="submit" data-enviar>Enviar</button>
      </form>
      <p class="chat__ayuda">Enter para enviar · Shift + Enter para un salto de línea</p>
    </section>`;

  const lista = contenedor.querySelector('[data-mensajes]');
  const form = contenedor.querySelector('[data-form]');
  const entrada = contenedor.querySelector('[data-entrada]');
  const botonEnviar = contenedor.querySelector('[data-enviar]');
  const cajaError = contenedor.querySelector('[data-error]');
  const indicadorGuardado = contenedor.querySelector('[data-guardado]');

  function render() {
    const saludo = { rol: 'personaje', texto: personaje.saludo, hora: '' };
    const mensajes = historial.length ? historial : [saludo];
    let html = mensajes.map((m) => htmlMensaje(m, personaje)).join('');
    if (esperando) {
      html += `
        <li class="mensaje mensaje--personaje mensaje--escribiendo" aria-label="${personaje.nombre} está escribiendo">
          <div class="mensaje__burbuja">
            <span class="puntos" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="mensaje__autor">${personaje.nombre} está escribiendo…</span>
          </div>
        </li>`;
    }
    lista.innerHTML = html;
    indicadorGuardado.hidden = historial.length === 0;
    lista.scrollTop = lista.scrollHeight; // scroll automático al último mensaje
  }

  function mostrarError(texto) {
    cajaError.textContent = texto;
    cajaError.hidden = !texto;
  }

  async function enviar() {
    if (esperando) return;
    const validacion = validarMensaje(entrada.value);
    if (!validacion.ok) {
      mostrarError(validacion.error);
      return;
    }

    mostrarError('');
    historial.push({ rol: 'usuario', texto: validacion.texto, hora: formatearHora() });
    entrada.value = '';
    esperando = true;
    botonEnviar.disabled = true;
    guardarHistorial(personaje.id, historial);
    render();

    try {
      const texto = await enviarAlPersonaje(personaje.id, historial);
      historial.push({ rol: 'personaje', texto, hora: formatearHora() });
      guardarHistorial(personaje.id, historial);
    } catch (error) {
      mostrarError(error.message);
    } finally {
      esperando = false;
      botonEnviar.disabled = false;
      render();
      entrada.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    enviar();
  });

  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  });

  contenedor.querySelector('[data-borrar]').addEventListener('click', () => {
    historial = [];
    borrarHistorial(personaje.id);
    mostrarError('');
    render();
  });

  lista.addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-copiar]');
    if (!boton) return;
    const texto = boton.closest('.mensaje').querySelector('.mensaje__texto').textContent;
    try {
      await navigator.clipboard.writeText(texto);
      boton.textContent = 'Copiado';
    } catch {
      boton.textContent = 'No se pudo copiar';
    }
    setTimeout(() => (boton.textContent = 'Copiar'), 1500);
  });

  render();
  entrada.focus();
}
