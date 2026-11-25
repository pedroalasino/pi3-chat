// Lógica principal: routing SPA con History API, vistas y modo claro/oscuro.

import { PERSONAJES, PERSONAJE_POR_DEFECTO, buscarPersonaje, avatarHtml } from './personajes.js';
import { montarChat, cargarHistorial } from './chat.js';

// ---------- Rutas ----------

/** Traduce una URL (path + query) a la vista que hay que mostrar. */
export function resolverRuta(url) {
  const { pathname, searchParams } = new URL(url, 'http://local');
  const ruta = pathname.replace(/\/+$/, '') || '/';

  switch (ruta) {
    case '/':
    case '/home':
      return { vista: 'home' };
    case '/personajes':
      return { vista: 'personajes' };
    case '/about':
      return { vista: 'about' };
    case '/chat': {
      const id = searchParams.get('personaje') || PERSONAJE_POR_DEFECTO;
      const personaje = buscarPersonaje(id);
      return personaje ? { vista: 'chat', personaje } : { vista: 'no-encontrado' };
    }
    default:
      return { vista: 'no-encontrado' };
  }
}

// ---------- Vistas ----------

function tarjetaPersonaje(p) {
  const tieneHistorial = cargarHistorial(p.id).length > 0;
  return `
    <article class="tarjeta" style="--color-personaje: ${p.color}">
      ${avatarHtml(p, 'avatar--grande')}
      <h2 class="tarjeta__nombre">${p.nombre}</h2>
      <p class="tarjeta__juego">${p.juego} · ${p.lugar}</p>
      <p class="tarjeta__desc">${p.descripcion}</p>
      ${tieneHistorial ? '<p class="tarjeta__historial">Tenés una charla guardada</p>' : ''}
      <a class="boton" href="/chat?personaje=${p.id}" data-link>
        ${tieneHistorial ? 'Seguir charlando' : `Hablar con ${p.nombre.split(' ')[0]}`}
      </a>
    </article>`;
}

const VISTAS = {
  home: () => {
    const jason = buscarPersonaje('jason');
    return `
      <section class="home">
        <p class="home__antetitulo">Chat con personajes · Grand Theft Auto</p>
        <h1 class="home__titulo">Charlá con <span>Jason Duval</span> sin salir de Leonida.</h1>
        <p class="home__bajada">${jason.descripcion} Preguntale lo que quieras: responde con su personalidad, gracias a Google Gemini.</p>
        <div class="home__acciones">
          <a class="boton" href="/chat?personaje=jason" data-link>Empezar a chatear</a>
          <a class="boton boton--fantasma" href="/personajes" data-link>Ver otros personajes</a>
        </div>
      </section>`;
  },

  personajes: () => `
    <section class="galeria">
      <h1 class="galeria__titulo">Elegí con quién hablar</h1>
      <p class="galeria__bajada">Cada personaje tiene su propia personalidad y su propio historial.</p>
      <div class="galeria__grilla">${PERSONAJES.map(tarjetaPersonaje).join('')}</div>
    </section>`,

  about: () => `
    <section class="about">
      <h1>Sobre el proyecto</h1>
      <p>Prueba de concepto de <strong>ComicSansCon</strong>: una SPA para chatear con personajes de ficción usando inteligencia artificial.</p>
      <h2>Los personajes</h2>
      <ul>
        ${PERSONAJES.map((p) => `<li><strong>${p.nombre}</strong> (${p.juego}): ${p.frase}</li>`).join('')}
      </ul>
      <h2>Cómo funciona</h2>
      <ol>
        <li>El navegador manda tu mensaje y el historial a <code>/api/functions</code>.</li>
        <li>Esa Vercel Function agrega la personalidad del personaje y llama a Google Gemini con la API key, que nunca llega al navegador.</li>
        <li>La respuesta vuelve al chat. El historial se guarda en tu navegador con localStorage.</li>
      </ol>
      <h2>Tecnologías</h2>
      <p>HTML, CSS y JavaScript sin frameworks, History API, Vite, Vercel Functions, Google Gemini y Vitest.</p>
      <p class="about__aviso">Proyecto educativo de fans, sin relación con Rockstar Games ni Take-Two Interactive.</p>
    </section>`,

  'no-encontrado': () => `
    <section class="about">
      <h1>Esta página no existe</h1>
      <p><a href="/home" data-link>Volver al inicio</a></p>
    </section>`,
};

// ---------- Router ----------

function marcarLinkActivo(vista) {
  document.querySelectorAll('.nav a').forEach((a) => {
    const activo = a.dataset.vista === vista;
    a.classList.toggle('activo', activo);
    if (activo) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

export function render(url = location.pathname + location.search) {
  const app = document.getElementById('app');
  const ruta = resolverRuta(url);

  if (ruta.vista === 'chat') {
    montarChat(app, ruta.personaje);
    document.title = `Chat con ${ruta.personaje.nombre}`;
  } else {
    app.innerHTML = VISTAS[ruta.vista]();
    document.title = 'Chat de personajes · GTA';
  }
  document.body.dataset.vista = ruta.vista;
  marcarLinkActivo(ruta.vista);
}

export function navegar(url) {
  if (url === location.pathname + location.search) return;
  history.pushState({}, '', url);
  render(url);
  window.scrollTo(0, 0);
}

// ---------- Modo claro / oscuro ----------

function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  const boton = document.querySelector('[data-tema]');
  if (boton) boton.textContent = tema === 'dark' ? 'Modo claro' : 'Modo oscuro';
  try {
    localStorage.setItem('pi3-tema', tema);
  } catch {
    /* sin storage */
  }
}

function temaInicial() {
  try {
    const guardado = localStorage.getItem('pi3-tema');
    if (guardado) return guardado;
  } catch {
    /* sin storage */
  }
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// ---------- Arranque ----------

function iniciar() {
  // Links internos: navegar sin recargar la página
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    navegar(link.getAttribute('href'));
  });

  // Botones atrás / adelante del navegador
  window.addEventListener('popstate', () => render());

  document.querySelector('[data-tema]')?.addEventListener('click', () => {
    aplicarTema(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  if (location.pathname === '/') history.replaceState({}, '', '/home');
  aplicarTema(temaInicial());
  render();
}

if (typeof document !== 'undefined' && document.getElementById('app')) {
  iniciar();
}
