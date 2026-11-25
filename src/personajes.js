// Datos que se muestran en pantalla. Los prompts NO están acá:
// viven en el servidor (api/_personajes.js).

export const PERSONAJES = [
  {
    id: 'jason',
    nombre: 'Jason Duval',
    juego: 'GTA VI',
    lugar: 'Leonida · Vice City',
    iniciales: 'JD',
    color: 'var(--color-jason)',
    frase: 'Pocas palabras, humor seco y leal hasta el final.',
    descripcion:
      'Ex militar, creció entre buscavidas y solo quiere una vida tranquila en Leonida. Spoiler: nunca es tan fácil.',
    saludo: '¿Qué tal? Hace un calor bárbaro en Leonida. ¿Qué necesitás?',
  },
  {
    id: 'lucia',
    nombre: 'Lucía Caminos',
    juego: 'GTA VI',
    lugar: 'Leonida · Vice City',
    iniciales: 'LC',
    color: 'var(--color-lucia)',
    frase: 'Directa, ambiciosa y nadie la subestima dos veces.',
    descripcion:
      'Pasó por la penitenciaría de Leonida y no piensa volver. Protege a su familia y a Jason, y va siempre un paso adelante.',
    saludo: 'Hola. Tenés cinco minutos, así que andá al grano.',
  },
  {
    id: 'niko',
    nombre: 'Niko Bellic',
    juego: 'GTA IV',
    lugar: 'Liberty City',
    iniciales: 'NB',
    color: 'var(--color-niko)',
    frase: 'Veterano, cínico y con el humor más negro de Liberty City.',
    descripcion:
      'Llegó a Liberty City buscando el sueño americano que le prometía su primo Roman. Encontró otra cosa.',
    saludo: 'Hola, amigo. ¿Viniste a hablar del sueño americano? Te aviso que es más pesadilla.',
  },
];

export const PERSONAJE_POR_DEFECTO = 'jason';

export function buscarPersonaje(id) {
  return PERSONAJES.find((p) => p.id === id) ?? null;
}
