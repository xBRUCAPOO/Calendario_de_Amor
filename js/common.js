/* ==========================================================================
   FECHAS IMPORTANTES — js/common.js
   Capa de datos compartida por todas las páginas:
   - Lee/escribe días especiales contra el backend (Cloudflare Pages Functions
     + D1, ver /functions/api/days.js) y cachea todo en localStorage para que
     la app funcione offline (PWA).
   - Si el backend no responde (sin conexión, o todavía no lo desplegaste),
     la app sigue funcionando 100% con la copia local y reintenta sincronizar
     sola apenas vuelve la conexión.
   - Cálculo de fechas/cuenta regresiva, categorías, colores, diálogos con la
     estética de la app (reemplazan confirm()/alert() nativos del navegador,
     que no se pueden personalizar), y el modal para agregar/editar un día.

   Todas las rutas a otros archivos (css, js, íconos, api) son ABSOLUTAS
   (empiezan con "/") a propósito: este archivo se carga tanto desde
   /index.html como desde /pages/calendario.html y /pages/fechas.html, que
   viven en carpetas distintas.
   ========================================================================== */

const API_BASE = '/api';
const CACHE_KEY = 'fechasImportantes.cache.v3';
const PENDING_KEY = 'fechasImportantes.pending.v3';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const TOTAL_COLORES = 50;

// Categorías disponibles para clasificar un día especial (además del color)
const CATEGORIES = [
  { id: 'pareja', label: 'Pareja', icon: 'favorite' },
  { id: 'cumpleanos', label: 'Cumpleaños', icon: 'cake' },
  { id: 'aniversario', label: 'Aniversario', icon: 'celebration' },
  { id: 'feriado', label: 'Feriado', icon: 'flag' },
  { id: 'otro', label: 'Otro', icon: 'star' },
];

function getCategoryMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function makeId() {
  return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `day-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* --------------------------------------------------------------------------
   CACHÉ LOCAL (localStorage) — copia offline de todos los días especiales
   -------------------------------------------------------------------------- */

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeCache(list) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(list));
}

function readPendingQueue() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function writePendingQueue(queue) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
}

function queuePendingOp(op) {
  const queue = readPendingQueue();
  queue.push(op);
  writePendingQueue(queue);
}

// Datos de ejemplo la primera vez que se abre la app: los feriados nacionales
// confirmados (+ el feriado propio de Córdoba Capital), las fechas más
// conocidas "de pareja" y otras fechas especiales (ver buildOtrasFechasSeedDays
// más abajo). Se guardan como cualquier día cargado a mano: se pueden editar
// o borrar sin problema.
function seedDefaultDays() {
  const seed = [...buildHolidaySeedDays(), ...buildCoupleSeedDays(), ...buildOtrasFechasSeedDays()];
  writeCache(seed);
  return seed;
}

// Feriados nacionales de Argentina + el feriado propio de Córdoba Capital.
// Fuente: Ley 27.399 y Resolución 164/2025 (Jefatura de Gabinete), más el
// decreto anual de la Municipalidad de Córdoba para el 6 de julio.
// Los "inamovibles" son recurrentes (misma fecha todos los años). Los
// "trasladables" y los "puente turístico" se fijan por decreto cada año, así
// que van con año puntual 2026 y hay que cargar los del año que viene cuando
// se confirmen (no son siempre el mismo día/mes).
function buildHolidaySeedDays() {
  const recurrentes = [
    { day: 1, month: 1, name: 'Año Nuevo' },
    { day: 24, month: 3, name: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
    { day: 2, month: 4, name: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
    { day: 1, month: 5, name: 'Día del Trabajador' },
    { day: 25, month: 5, name: 'Día de la Revolución de Mayo' },
    { day: 6, month: 7, name: 'Fundación de la Ciudad de Córdoba', desc: 'Feriado propio de **Córdoba Capital**: la Municipalidad lo declara día no laborable para conmemorar el aniversario de la fundación de la ciudad, el 6 de julio de 1573.' },
    { day: 20, month: 6, name: 'Día de la Bandera (Paso a la Inmortalidad de Belgrano)' },
    { day: 9, month: 7, name: 'Día de la Independencia' },
    { day: 8, month: 12, name: 'Inmaculada Concepción de María' },
    { day: 25, month: 12, name: 'Navidad' },
  ];

  const puntuales2026 = [
    { day: 16, month: 2, name: 'Carnaval (día 1)' },
    { day: 17, month: 2, name: 'Carnaval (día 2)' },
    { day: 3, month: 4, name: 'Viernes Santo' },
    { day: 15, month: 6, name: 'Paso a la Inmortalidad del Gral. Güemes', desc: 'Feriado **trasladable**: la fecha de conmemoración es el 17 de junio, pero en 2026 se observa el 15.' },
    { day: 17, month: 8, name: 'Paso a la Inmortalidad del Gral. San Martín' },
    { day: 12, month: 10, name: 'Día del Respeto a la Diversidad Cultural' },
    { day: 23, month: 11, name: 'Día de la Soberanía Nacional', desc: 'Feriado **trasladable**: la fecha de conmemoración es el 20 de noviembre, pero en 2026 se observa el 23.' },
    { day: 23, month: 3, name: 'Día no laborable (puente turístico)' },
    { day: 10, month: 7, name: 'Día no laborable (puente turístico)' },
    { day: 7, month: 12, name: 'Día no laborable (puente turístico)' },
  ];

  const items = [];
  recurrentes.forEach((h, i) => items.push({
    id: makeId(), day: h.day, month: h.month, year: null, recurring: true,
    name: h.name, category: 'feriado', colorIndex: 11 + (i % 6), remindDaysBefore: null,
    description: h.desc || `**${h.name}**, feriado nacional inamovible: se celebra siempre en esta fecha, caiga el día de la semana que caiga.`,
  }));
  puntuales2026.forEach((h, i) => items.push({
    id: makeId(), day: h.day, month: h.month, year: 2026, recurring: false,
    name: h.name, category: 'feriado', colorIndex: 24 + (i % 6), remindDaysBefore: null,
    description: h.desc || `**${h.name}** confirmado para 2026. Al no ser una fecha fija, para 2027 hay que cargar el nuevo día apenas se confirme.`,
  }));
  return items;
}

// Fechas conocidas como "de pareja" en Argentina/internacionalmente.
// Nota: salvo San Valentín, ninguna es una fecha oficial ni tiene una única
// fuente "correcta" (varía según el sitio que la difunda); lo aclaramos en
// la propia descripción para no presentarlas como un dato 100% cerrado.
function buildCoupleSeedDays() {
  return [
    {
      id: makeId(), day: 14, month: 2, year: null, recurring: true,
      name: 'San Valentín', category: 'pareja', colorIndex: 17, remindDaysBefore: 3,
      description: 'El **Día de San Valentín** se celebra cada 14 de febrero y es la fecha más reconocida en el mundo para festejar el amor en pareja. No hace falta un gesto grande: una carta, una cena en casa o simplemente decirle a la otra persona por qué la elegís todos los días ya alcanza. Más info: [Wikipedia](https://es.wikipedia.org/wiki/D%C3%ADa_de_San_Valent%C3%ADn)',
    },
    {
      id: makeId(), day: 1, month: 8, year: null, recurring: true,
      name: 'Día de la Novia', category: 'pareja', colorIndex: 16, remindDaysBefore: 3,
      description: 'El **Día de la Novia** (o *National Girlfriend·s Day*) nació en Estados Unidos y se viralizó en redes sociales como una especie de segundo San Valentín. La fecha exacta varía bastante según el país y hasta según la fuente que la difunda: acá tomamos el **1 de agosto**, la más difundida internacionalmente, pero en Argentina vas a encontrar sitios que la mueven a marzo, abril u octubre.',
    },
    {
      id: makeId(), day: 20, month: 9, year: null, recurring: true,
      name: 'Día de los Novios', category: 'pareja', colorIndex: 40, remindDaysBefore: 3,
      description: 'En Argentina se popularizó el **Día de los Novios** cada 20 de septiembre, justo antes del inicio de la primavera. No es una fecha oficial ni tiene un origen documentado: la idea es aprovechar el clima primaveral como excusa para un gesto simple hacia la pareja, como el Día del Estudiante pero en versión romántica.',
    },
    {
      id: makeId(), day: 3, month: 10, year: null, recurring: true,
      name: 'Día del Novio', category: 'pareja', colorIndex: 45, remindDaysBefore: 3,
      description: 'El **Día del Novio** se difundió en Argentina como el equivalente al Día de la Novia, pensado para que sea ella quien lo agasaje a él. Tampoco es una fecha oficial ni hay demasiado consenso sobre el día exacto (algunos sitios lo ubican el 20 de septiembre); lo que importa es el gesto, no la fecha en sí.',
    },
  ];
}

// NUEVO: resto de fechas del año pedidas para completar el calendario
// (Reyes, Día de la Mujer, Semana de la Dulzura, Día del Amigo, Halloween,
// Nochebuena, Fin de año, etc.), investigadas para que la descripción de
// cada una sea precisa y no un genérico. No se repiten acá las que ya
// estaban cargadas en buildHolidaySeedDays/buildCoupleSeedDays (Año Nuevo,
// San Valentín, Día del Trabajador, Día de la Novia del 1° de agosto,
// Inmaculada Concepción y Navidad).
//
// Tres de estas fechas son "movibles" (cambian de día todos los años:
// Pascua, y las que se definen como "tal domingo de tal mes"). Siguiendo el
// mismo criterio que ya usa buildHolidaySeedDays con los feriados
// trasladables, las cargamos como fecha puntual del año en curso (2026,
// ya calculadas) en vez de sumar un motor de reglas nuevo a la app. Para
// 2027 va a hacer falta recalcularlas y cargarlas de nuevo a mano.
function buildOtrasFechasSeedDays() {
  const fijas = [
    { day: 6, month: 1, name: 'Día de Reyes', colorIndex: 2,
      description: 'El **Día de Reyes** (Epifanía) conmemora, según el Nuevo Testamento, la visita de los Reyes Magos —Melchor, Gaspar y Baltasar— al Niño Jesús, y cierra el ciclo de fiestas que arranca en Navidad. En muchos países de habla hispana es la fecha en que los chicos reciben regalos (dejando pasto y agua para los camellos la noche anterior). En Argentina no es feriado ni tan popular como el 25 de diciembre, pero sigue siendo una buena excusa para un mini regalo sorpresa.' },
    { day: 8, month: 3, name: 'Día Internacional de la Mujer', colorIndex: 35,
      description: 'La ONU estableció el **8 de marzo** como el **Día Internacional de la Mujer** en homenaje a la lucha histórica por la igualdad de derechos, recordando entre otros hechos a las trabajadoras textiles que murieron en incendios fabriles a comienzos del siglo XX (como el de la fábrica Triangle en Nueva York, en 1911). No es un feriado, pero es una fecha de fuerte visibilidad social en la que vale la pena tener un gesto de cariño.' },
    { day: 20, month: 7, name: 'Día del Amigo', colorIndex: 38,
      description: 'El **Día del Amigo** se celebra en Argentina cada 20 de julio por iniciativa del odontólogo **Enrique Febbraro**, quien en 1969, al ver por TV la llegada del hombre a la Luna, la interpretó como un gesto de amistad de toda la humanidad y empezó a difundir la idea por carta a otros países. Hoy también se festeja en Uruguay, Brasil, Chile y España. No es exclusivo de amigos: en pareja también es una buena excusa para algo divertido.' },
    { day: 21, month: 9, name: 'Día de la Primavera y del Estudiante', colorIndex: 20,
      description: 'El **21 de septiembre** mezcla dos festejos sin relación real entre sí: el **Día del Estudiante**, instaurado en 1902 en homenaje a Domingo F. Sarmiento (sus restos habían llegado a Buenos Aires ese día en 1888), y el **Día de la Primavera**, que se popularizó como celebración masiva recién a mediados del siglo XX. La coincidencia de fechas es casualidad, pero terminó siendo la excusa perfecta para un picnic, una salida al aire libre o un gesto simple hacia la otra persona.' },
    { day: 31, month: 10, name: 'Halloween', colorIndex: 48,
      description: '**Halloween** viene del **Samhain**, un festejo celta de fin de cosecha en el que se creía que el mundo de los vivos y el de los muertos se acercaban. Inmigrantes irlandeses lo llevaron a Estados Unidos en el siglo XIX, donde se transformó en la fiesta de disfraces y calabazas actual, y desde ahí se difundió al resto del mundo, incluida Argentina. No es una fecha tradicional del país, pero da pie a un detalle temático.' },
    { day: 24, month: 12, name: 'Nochebuena', colorIndex: 13,
      description: 'La **Nochebuena** es la víspera de Navidad: la noche del 24 de diciembre en la que, según la tradición cristiana, nació Jesús. En Argentina es la cena familiar más importante del año, con brindis a las 00:00 y fuegos artificiales, aunque a diferencia del 25 no es en sí un feriado nacional (el feriado es el día de Navidad, que ya tenés cargado).' },
    { day: 31, month: 12, name: 'Fin de año', colorIndex: 33,
      description: 'El **31 de diciembre** cierra el año con la cena de Fin de Año y el brindis de medianoche ya entrando al 1° de enero. No es un feriado nacional, pero la actividad laboral y comercial se reduce igual. Es un buen momento para una carta que repase lo vivido en el año junto a la otra persona.' },
  ];

  // Semana de la Dulzura: única fecha "de varios días" del calendario, con
  // endDay marcando el último día del rango (siempre 1 al 7 de julio, no
  // se mueve de año a año).
  const rango = {
    id: makeId(), day: 1, month: 7, endDay: 7, year: null, recurring: true,
    name: 'Semana de la Dulzura', category: 'otro', colorIndex: 30, remindDaysBefore: 2,
    description: 'La **Semana de la Dulzura** se festeja del **1 al 7 de julio** con el lema "una golosina por un beso". Nació en 1989 como una campaña comercial de **Arcor** junto a la Asociación de Distribuidores de Golosinas (ADGyA) para reactivar las ventas en pleno invierno, pero se instaló como costumbre real: regalar un alfajor, un bombón o un chocolate a quien uno quiere. Es una tradición exclusivamente argentina.',
  };

  // Fechas "movibles" del año en curso (ver comentario de la función):
  // Pascua 2026 cae el 5 de abril (calculada), y por pura coincidencia de
  // calendario el primer domingo de abril de 2026 también es el 5.
  const movibles2026 = [
    { day: 5, month: 4, name: 'Día de la Novia', category: 'pareja', colorIndex: 6,
      description: 'A diferencia del "Día de la Novia" del 1° de agosto (importado de EE.UU. por redes sociales, y que ya tenés cargado en agosto), en Argentina existe una tradición más antigua que ubica este festejo el **primer domingo de abril**. En 2026 cae el **5 de abril**. No tiene un origen histórico documentado, pero se instaló como jornada para agasajar a la pareja con flores, una carta o algo hecho a mano. Al ser un domingo fijo (no un día fijo), la fecha cambia cada año: para 2027 hay que recalcularla y cargarla de nuevo.' },
    { day: 5, month: 4, name: 'Domingo de Pascua', category: 'otro', colorIndex: 9,
      description: 'El **Domingo de Pascua** cierra la Semana Santa y conmemora, según la tradición cristiana, la resurrección de Jesús. Al depender del calendario lunar (se calcula como el primer domingo después de la primera luna llena de la primavera boreal), la fecha cambia todos los años; en 2026 cae el **5 de abril**, coincidiendo con Viernes Santo (2 días antes, ya cargado como feriado). Es la excusa clásica para el huevo de chocolate. Para 2027 hay que recalcular la fecha.' },
    { day: 18, month: 10, name: 'Día de la Madre', category: 'otro', colorIndex: 44,
      description: 'En Argentina el **Día de la Madre** se celebra el **tercer domingo de octubre** (en 2026, el **18 de octubre**), a diferencia de la mayoría de los países de la región, que lo festejan en mayo. El origen se remonta a 1931, cuando el Papa Pío XI dedicó el 11 de octubre a la "Divina Maternidad de María"; el gobierno argentino de entonces adoptó el domingo más cercano a esa fecha y con el tiempo quedó fijado en el tercer domingo del mes. Al cambiar todos los años, para 2027 hay que recalcular la fecha.' },
  ];

  const items = fijas.map((f) => ({
    id: makeId(), day: f.day, month: f.month, year: null, recurring: true,
    name: f.name, category: 'otro', colorIndex: f.colorIndex, remindDaysBefore: 2,
    description: f.description,
  }));
  items.push(rango);
  movibles2026.forEach((m) => items.push({
    id: makeId(), day: m.day, month: m.month, year: 2026, recurring: false,
    name: m.name, category: m.category, colorIndex: m.colorIndex, remindDaysBefore: 3,
    description: m.description,
  }));
  return items;
}

// Sube TODOS los días predefinidos (feriados + fechas de pareja + otras
// fechas especiales) al backend (D1), uno por uno. Pensada para correrse una
// sola vez a mano cuando ya tenés el backend conectado y querés los mismos
// días de ejemplo que aparecen en modo offline. Se puede correr desde la
// consola del navegador:
// seedBackendDefaults().then(r => console.log('cargados:', r.length));
async function seedBackendDefaults() {
  const defaults = [...buildHolidaySeedDays(), ...buildCoupleSeedDays(), ...buildOtrasFechasSeedDays()];
  const created = [];
  for (const day of defaults) {
    created.push(await addSpecialDay(day));
  }
  return created;
}

// NUEVO: agrega SOLO las fechas nuevas de buildOtrasFechasSeedDays (Reyes,
// Día de la Mujer, Semana de la Dulzura, Día del Amigo, etc.) sin volver a
// cargar los feriados ni las fechas de pareja que ya tenías. Pensada para
// una app que YA está en uso (con datos en localStorage y/o D1): seedBackendDefaults()
// duplicaría todo lo que ya existe, esta función no. Se corre una sola vez
// desde la consola del navegador:
// seedOtrasFechas().then(r => console.log('cargadas:', r.length));
async function seedOtrasFechas() {
  const nuevas = buildOtrasFechasSeedDays();
  const created = [];
  for (const day of nuevas) {
    created.push(await addSpecialDay(day));
  }
  return created;
}

/* --------------------------------------------------------------------------
   API — llamadas al backend (Cloudflare Pages Functions + D1)
   Si el fetch falla (sin conexión, backend caído o todavía no desplegado),
   cada función devuelve null y quien la llama cae al modo offline.
   -------------------------------------------------------------------------- */

async function apiRequest(path, options) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) return null;
    if (res.status === 204) return true;
    return await res.json();
  } catch (e) {
    return null; // sin conexión / backend no disponible -> modo offline
  }
}

/* --------------------------------------------------------------------------
   API PÚBLICA usada por las páginas (todas async)
   -------------------------------------------------------------------------- */

async function getSpecialDays() {
  const remote = await apiRequest('/days');
  if (remote) {
    writeCache(remote);
    return remote;
  }
  const cached = readCache();
  if (cached) return cached;
  return seedDefaultDays();
}

async function addSpecialDay(entry) {
  if (!entry.id) entry.id = makeId();
  const created = await apiRequest('/days', { method: 'POST', body: JSON.stringify(entry) });
  const list = readCache() || [];
  if (created) {
    list.push(created);
    writeCache(list);
    return created;
  }
  list.push(entry);
  writeCache(list);
  queuePendingOp({ type: 'create', payload: entry });
  return entry;
}

async function updateSpecialDay(id, changes) {
  const updated = await apiRequest(`/days/${id}`, { method: 'PUT', body: JSON.stringify(changes) });
  const list = readCache() || [];
  const idx = list.findIndex((d) => d.id === id);
  const merged = { ...(idx >= 0 ? list[idx] : {}), ...changes, id };
  if (idx >= 0) list[idx] = updated || merged; else list.push(updated || merged);
  writeCache(list);
  if (!updated) queuePendingOp({ type: 'update', id, payload: changes });
  return updated || merged;
}

async function deleteSpecialDay(id) {
  const ok = await apiRequest(`/days/${id}`, { method: 'DELETE' });
  const list = (readCache() || []).filter((d) => d.id !== id);
  writeCache(list);
  if (!ok) queuePendingOp({ type: 'delete', id });
  return true;
}

async function flushPendingQueue() {
  let queue = readPendingQueue();
  if (queue.length === 0) return;
  while (queue.length > 0) {
    const op = queue[0];
    let ok = false;
    if (op.type === 'create') ok = !!(await apiRequest('/days', { method: 'POST', body: JSON.stringify(op.payload) }));
    if (op.type === 'update') ok = !!(await apiRequest(`/days/${op.id}`, { method: 'PUT', body: JSON.stringify(op.payload) }));
    if (op.type === 'delete') ok = !!(await apiRequest(`/days/${op.id}`, { method: 'DELETE' }));
    if (!ok) break;
    queue.shift();
    writePendingQueue(queue);
  }
}
window.addEventListener('online', flushPendingQueue);
document.addEventListener('DOMContentLoaded', flushPendingQueue);

/* --------------------------------------------------------------------------
   CÁLCULO DE FECHAS
   -------------------------------------------------------------------------- */

function todayAtMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getNextOccurrence(item) {
  const today = todayAtMidnight();
  if (!item.recurring && item.year) {
    return new Date(item.year, item.month - 1, item.day);
  }
  let candidate = new Date(today.getFullYear(), item.month - 1, item.day);
  // NUEVO: si el día abarca un rango de varias fechas (ej. "Semana de la
  // Dulzura", con endDay) y hoy cae dentro de ese rango, lo consideramos
  // vigente y NO saltamos al año que viene, aunque el día de inicio ya
  // haya pasado.
  if (item.endDay != null) {
    const endMonth = item.endMonth || item.month;
    const endCandidate = new Date(today.getFullYear(), endMonth - 1, item.endDay);
    if (candidate <= today && today <= endCandidate) return candidate;
  }
  if (candidate < today) {
    candidate = new Date(today.getFullYear() + 1, item.month - 1, item.day);
  }
  return candidate;
}

function getCountdownInfo(item) {
  const today = todayAtMidnight();
  const target = getNextOccurrence(item);
  const diffDays = Math.round((target - today) / 86400000);

  // NUEVO: si es un día de varios días (endDay) y hoy cae dentro del rango,
  // mostramos "está en curso" en vez de una cuenta regresiva o "pasó hace...".
  if (item.endDay != null) {
    const endMonth = item.endMonth || item.month;
    const endDate = new Date(target.getFullYear(), endMonth - 1, item.endDay);
    if (target <= today && today <= endDate) {
      return { label: '¡Está en curso!', diffDays: 0, target, isPast: false };
    }
  }

  if (diffDays === 0) return { label: '¡Es hoy!', diffDays, target, isPast: false };
  if (diffDays > 0) return { label: `Faltan: ${diffDays} día${diffDays === 1 ? '' : 's'}`, diffDays, target, isPast: false };
  return { label: `Pasó hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}`, diffDays, target, isPast: true };
}

function formatDayMonth(day, month) {
  return `${day} de ${MESES[month - 1]}`;
}

// NUEVO: etiqueta de fecha para tarjetas y detalle. Para un día normal es
// igual a formatDayMonth; para un día de varios días (endDay, ej. "Semana
// de la Dulzura") arma "1 al 7 de julio" en vez de mostrar solo el inicio.
function formatDayRangeLabel(item) {
  if (item.endDay == null) return formatDayMonth(item.day, item.month);
  const endMonth = item.endMonth || item.month;
  if (endMonth === item.month) return `${item.day} al ${item.endDay} de ${MESES[item.month - 1]}`;
  return `${formatDayMonth(item.day, item.month)} al ${formatDayMonth(item.endDay, endMonth)}`;
}

// Color de acento a usar para un día especial: los feriados siempre se
// muestran en gris claro (sin color propio), el resto usa su colorIndex.
function getAccentColorVar(item) {
  return item.category === 'feriado' ? 'var(--gray-300)' : `var(--special-color-${item.colorIndex})`;
}

function findDaysOn(list, day, month, year) {
  return list.filter((item) => {
    if (item.day !== day || item.month !== month) return false;
    if (!item.recurring && item.year && item.year !== year) return false;
    return true;
  });
}

/* --------------------------------------------------------------------------
   TEXTO ENRIQUECIDO EN LAS DESCRIPCIONES
   **palabra** la resalta con el color del día, [texto](https://...) arma un
   link. Todo se escapa antes, así que es seguro aunque el texto tenga
   símbolos raros.
   -------------------------------------------------------------------------- */

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function parseDescription(raw) {
  if (!raw) return '';
  let safe = escapeHTML(raw);
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<span class="hl">$1</span>');
  safe = safe.replace(/\n/g, '<br>');
  return safe;
}

/* --------------------------------------------------------------------------
   COMPARTIR (Web Share API, con fallback a copiar el texto)
   -------------------------------------------------------------------------- */

async function shareSpecialDay(item) {
  const countdown = getCountdownInfo(item);
  const text = `${item.name} — ${formatDayRangeLabel(item)} (${countdown.label})`;
  if (navigator.share) {
    try {
      await navigator.share({ title: item.name, text });
    } catch (e) { /* el usuario canceló el share, no hacemos nada */ }
    return;
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    showToast('Copiado al portapapeles');
  }
}

/* --------------------------------------------------------------------------
   SERVICE WORKER (PWA offline) — DESACTIVADO TEMPORALMENTE
   Estaba rompiendo la navegación entre páginas por un bug de Chrome con
   Service Workers + las redirecciones automáticas que hace Cloudflare Pages
   en URLs *.html. Se puede reactivar más adelante con más tiempo para
   probarlo bien; mientras tanto, sin esta línea la app funciona igual,
   solo que sin caché offline ni "agregar a pantalla de inicio" como PWA.
   -------------------------------------------------------------------------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}

/* --------------------------------------------------------------------------
   DIÁLOGOS PROPIOS — reemplazan a confirm()/alert() nativos del navegador,
   que no se pueden re-vestir con la estética de la app.
   -------------------------------------------------------------------------- */

function showConfirmDialog({ message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' }) {
  return new Promise((resolve) => {
    const mount = document.createElement('div');
    mount.innerHTML = `
      <div class="confirm-overlay">
        <div class="confirm-box">
          <p>${escapeHTML(message)}</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" data-choice="cancel">${escapeHTML(cancelLabel)}</button>
            <button type="button" class="btn btn-primary" data-choice="confirm">${escapeHTML(confirmLabel)}</button>
          </div>
        </div>
      </div>`;
    const overlay = mount.firstElementChild;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      const choice = e.target.closest('[data-choice]');
      if (choice) { overlay.remove(); resolve(choice.dataset.choice === 'confirm'); }
    });
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

/* --------------------------------------------------------------------------
   MENÚ FLOTANTE DE DETALLE — al tocar una fecha en la lista, muestra toda
   su información (nombre, fecha completa, cuenta regresiva, categoría y
   descripción) con accesos directos a compartir/editar.
   -------------------------------------------------------------------------- */

function buildDayDetailHTML(item) {
  const cat = getCategoryMeta(item.category);
  const countdown = getCountdownInfo(item);
  const fullDate = (!item.recurring && item.year)
    ? `${formatDayRangeLabel(item)} de ${item.year}`
    : `${formatDayRangeLabel(item)} (todos los años)`;

  return `
    <div class="modal-overlay" id="dayDetailOverlay">
      <div class="modal-sheet" style="--card-accent: ${getAccentColorVar(item)};">
        <div class="detail-header">
          <span class="material-symbols-outlined detail-icon">${cat.icon}</span>
          <div>
            <h2>${escapeHTML(item.name)}</h2>
            <p class="detail-sub">${fullDate} · ${cat.label}</p>
          </div>
        </div>
        <p class="detail-countdown">${countdown.label}</p>
        ${item.description ? `<p class="detail-description">${parseDescription(item.description)}</p>` : ''}
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="detailShareBtn">
            <span class="material-symbols-outlined">share</span> Compartir
          </button>
          <button type="button" class="btn btn-secondary" id="detailEditBtn">
            <span class="material-symbols-outlined">edit</span> Editar
          </button>
        </div>
        <button type="button" class="btn btn-primary btn-block" id="detailCloseBtn">
          <span class="material-symbols-outlined">close</span> Cerrar
        </button>
      </div>
    </div>`;
}

function showDayDetailModal(item, callbacks) {
  const opts = callbacks || {};
  const mount = document.createElement('div');
  mount.innerHTML = buildDayDetailHTML(item);
  const overlay = mount.firstElementChild;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  function close() { overlay.remove(); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#detailCloseBtn').addEventListener('click', close);
  overlay.querySelector('#detailShareBtn').addEventListener('click', () => shareSpecialDay(item));
  overlay.querySelector('#detailEditBtn').addEventListener('click', () => {
    close();
    openDayModal(item, opts.onSaved, opts.onDeleted);
  });
}

/* --------------------------------------------------------------------------
   NUEVO: VISOR DE "HISTORIAS" — cuando un día del calendario tiene VARIOS
   días especiales cargados, en vez de ir directo a fechas.html se abre este
   visor tipo TikTok/Instagram: se ve un día a la vez, con un círculo
   indicador arriba por cada día de esa fecha, y se pasa de uno a otro
   deslizando el dedo hacia los costados (o tocando un círculo puntual).
   -------------------------------------------------------------------------- */

// Arma el contenido de un solo "día" dentro del visor (mismo detalle que
// showDayDetailModal, pero sin su propio overlay: acá todos los días
// comparten un único overlay/hoja y se deslizan adentro).
function buildStorySlideHTML(item, index) {
  const cat = getCategoryMeta(item.category);
  const countdown = getCountdownInfo(item);
  const fullDate = (!item.recurring && item.year)
    ? `${formatDayRangeLabel(item)} de ${item.year}`
    : `${formatDayRangeLabel(item)} (todos los años)`;

  return `
    <div class="story-slide" data-index="${index}">
      <div class="detail-header">
        <span class="material-symbols-outlined detail-icon">${cat.icon}</span>
        <div>
          <h2>${escapeHTML(item.name)}</h2>
          <p class="detail-sub">${fullDate} · ${cat.label}</p>
        </div>
      </div>
      <p class="detail-countdown">${countdown.label}</p>
      ${item.description ? `<p class="detail-description">${parseDescription(item.description)}</p>` : ''}
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-action="share" data-index="${index}">
          <span class="material-symbols-outlined">share</span> Compartir
        </button>
        <button type="button" class="btn btn-secondary" data-action="edit" data-index="${index}">
          <span class="material-symbols-outlined">edit</span> Editar
        </button>
      </div>
    </div>`;
}

// Arma el overlay completo: la fila de círculos de arriba + la "cinta" con
// todos los días en fila (uno por especial) + el botón de cerrar de abajo.
function buildDayGroupHTML(items) {
  const dots = items.map((_, i) => `<span class="story-dot ${i === 0 ? 'is-active' : ''}"></span>`).join('');
  const slides = items.map((item, i) => buildStorySlideHTML(item, i)).join('');
  return `
    <div class="modal-overlay" id="dayGroupOverlay">
      <div class="modal-sheet story-sheet" id="dayGroupSheet" style="--card-accent: ${getAccentColorVar(items[0])};">
        <div class="story-dots" id="storyDots">${dots}</div>
        <div class="story-track" id="storyTrack">${slides}</div>
        <button type="button" class="btn btn-primary btn-block" id="groupCloseBtn">
          <span class="material-symbols-outlined">close</span> Cerrar
        </button>
      </div>
    </div>`;
}

// items: lista de días especiales de una misma fecha del calendario.
// initialIndex: con cuál arranca abierto el visor (por defecto el primero).
function showDayGroupModal(items, initialIndex, callbacks) {
  const opts = callbacks || {};
  const mount = document.createElement('div');
  mount.innerHTML = buildDayGroupHTML(items);
  const overlay = mount.firstElementChild;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  const sheet = overlay.querySelector('#dayGroupSheet');
  const track = overlay.querySelector('#storyTrack');
  const dotsEl = overlay.querySelector('#storyDots');
  let currentIndex = Math.min(Math.max(initialIndex || 0, 0), items.length - 1);
  let dragging = false;
  let startX = 0;
  let baseOffsetPx = 0;
  let trackWidthPx = 0;

  // Marca el círculo del día actual (más grande y con su color)
  function updateDots() {
    dotsEl.querySelectorAll('.story-dot').forEach((dot, i) => dot.classList.toggle('is-active', i === currentIndex));
  }

  // El color del borde de la hoja y del círculo activo acompaña al día que
  // se está viendo (cada día especial puede tener su propio color)
  function updateAccent() {
    sheet.style.setProperty('--card-accent', getAccentColorVar(items[currentIndex]));
  }

  // Mueve la "cinta" de días hasta dejar visible el índice pedido
  function goTo(index, animate) {
    currentIndex = Math.max(0, Math.min(items.length - 1, index));
    trackWidthPx = track.getBoundingClientRect().width;
    track.style.transition = animate === false ? 'none' : `transform var(--dur-base) var(--ease-standard)`;
    track.style.transform = `translateX(${-currentIndex * trackWidthPx}px)`;
    updateDots();
    updateAccent();
  }

  // Deslizamiento horizontal con el dedo (estilo historias de TikTok/
  // Instagram): mientras se arrastra, la cinta sigue al dedo sin animación;
  // al soltar, si se arrastró más de ~18% del ancho, pasa al día siguiente
  // o anterior; si no, vuelve a acomodarse en el día en el que estaba.
  track.addEventListener('touchstart', (e) => {
    dragging = true;
    startX = e.touches[0].clientX;
    trackWidthPx = track.getBoundingClientRect().width;
    baseOffsetPx = -currentIndex * trackWidthPx;
    track.style.transition = 'none';
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX;
    track.style.transform = `translateX(${baseOffsetPx + dx}px)`;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    const threshold = trackWidthPx * 0.18;
    if (dx <= -threshold && currentIndex < items.length - 1) goTo(currentIndex + 1);
    else if (dx >= threshold && currentIndex > 0) goTo(currentIndex - 1);
    else goTo(currentIndex);
  });

  // Tocar un círculo puntual también salta directo a ese día
  dotsEl.querySelectorAll('.story-dot').forEach((dot, i) => {
    dot.addEventListener('click', () => goTo(i));
  });

  function close() { overlay.remove(); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#groupCloseBtn').addEventListener('click', close);

  // Compartir/editar actúan sobre el día que está visible en ese momento
  overlay.querySelectorAll('[data-action="share"]').forEach((btn) => {
    btn.addEventListener('click', () => shareSpecialDay(items[Number(btn.dataset.index)]));
  });
  overlay.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      close();
      openDayModal(items[Number(btn.dataset.index)], opts.onSaved, opts.onDeleted);
    });
  });

  goTo(currentIndex, false);
}

/* --------------------------------------------------------------------------
   MODAL COMPARTIDO — Agregar / Editar día especial
   -------------------------------------------------------------------------- */

function buildColorSwatchesHTML(selectedIndex) {
  let html = '';
  for (let i = 1; i <= TOTAL_COLORES; i++) {
    const checked = i === (selectedIndex || 1) ? 'checked' : '';
    html += `
      <label>
        <input type="radio" name="colorIndex" value="${i}" ${checked}>
        <span class="color-swatch" style="background: var(--special-color-${i});"></span>
      </label>`;
  }
  return html;
}

function buildCategoryOptionsHTML(selectedId) {
  return CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === (selectedId || 'otro') ? 'selected' : ''}>${c.label}</option>`).join('');
}

function toDateInputValue(item) {
  if (!item) return '';
  const y = item.year || new Date().getFullYear();
  const mm = String(item.month).padStart(2, '0');
  const dd = String(item.day).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function buildDayModalHTML(item) {
  const isEdit = !!item;
  const initialAccent = isEdit ? getAccentColorVar(item) : 'var(--special-color-1)';
  return `
    <div class="modal-overlay" id="dayModalOverlay">
      <div class="modal-sheet" id="dayModalSheet" style="--card-accent: ${initialAccent};">
        <h2>${isEdit ? 'Editar día especial' : 'Agregar día especial'}</h2>
        <form id="dayForm">
          <div class="switch-row">
            <div class="switch-text">
              <strong>El año también importa</strong>
              <span>Activado: es una fecha puntual (ej: 11 de septiembre de 2026). Apagado: se repite todos los años.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="yearMattersSwitch" ${isEdit && !item.recurring ? 'checked' : ''}>
              <span class="track"><span class="thumb"></span></span>
            </label>
          </div>

          <div class="field">
            <label for="dayDate">Fecha</label>
            <input type="date" id="dayDate" value="${toDateInputValue(item)}" required>
            <p class="field-hint" id="dayDateHint"></p>
          </div>

          <div class="field">
            <label for="dayName">Nombre</label>
            <input type="text" id="dayName" placeholder="Ej: Día de la Novia" required maxlength="60" value="${isEdit ? escapeHTML(item.name) : ''}">
          </div>

          <div class="field">
            <label for="dayCategory">Categoría</label>
            <div class="select-wrap">
              <select id="dayCategory">${buildCategoryOptionsHTML(isEdit ? item.category : 'otro')}</select>
              <span class="material-symbols-outlined select-chevron">expand_more</span>
            </div>
          </div>

          <div class="field">
            <label for="dayReminder">Avisarme (días antes)</label>
            <input type="number" inputmode="numeric" id="dayReminder" min="0" max="60" placeholder="Vacío = sin recordatorio" value="${isEdit && item.remindDaysBefore != null ? item.remindDaysBefore : ''}">
            <p class="field-hint">Requiere permitir notificaciones (botón de campanita arriba).</p>
          </div>

          <div class="field">
            <label for="dayDescription">Descripción</label>
            <textarea id="dayDescription" placeholder="Usá **palabra** para resaltarla con el color del día...">${isEdit ? escapeHTML(item.description || '') : ''}</textarea>
          </div>

          <div class="field" id="colorField">
            <label>Color</label>
            <div class="color-picker no-scrollbar">${buildColorSwatchesHTML(isEdit ? item.colorIndex : 1)}</div>
          </div>
          <p class="field-hint" id="feriadoColorHint">Los feriados siempre se muestran en gris claro, sin color propio.</p>

          <div class="modal-actions">
            ${isEdit ? `
              <button type="button" class="btn btn-secondary" id="deleteDayBtn">
                <span class="material-symbols-outlined">delete</span> Borrar
              </button>
            ` : `
              <button type="button" class="btn btn-secondary" id="cancelDayBtn">
                <span class="material-symbols-outlined">close</span> Cancelar
              </button>
            `}
            <button type="submit" class="btn btn-primary" id="submitDayBtn">
              <span class="material-symbols-outlined">check</span> Guardar
            </button>
          </div>
        </form>
      </div>
    </div>`;
}

function openDayModal(item, onSaved, onDeleted) {
  const mount = document.createElement('div');
  mount.innerHTML = buildDayModalHTML(item);
  const overlay = mount.firstElementChild;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('#dayForm');
  const modalSheet = overlay.querySelector('#dayModalSheet');
  const yearMattersSwitch = overlay.querySelector('#yearMattersSwitch');
  const dayDateHint = overlay.querySelector('#dayDateHint');
  const initialSnapshot = new FormData(form);

  function updateHint() {
    dayDateHint.textContent = yearMattersSwitch.checked
      ? 'Se va a guardar como una fecha puntual (con año).'
      : 'El año no se va a usar: se repite todos los años.';
  }
  yearMattersSwitch.addEventListener('change', updateHint);
  updateHint();

  // Los feriados no eligen color: siempre se muestran en gris claro, así que
  // ocultamos el selector de color y mostramos una aclaración en su lugar.
  const categorySelect = overlay.querySelector('#dayCategory');
  const colorField = overlay.querySelector('#colorField');
  const feriadoColorHint = overlay.querySelector('#feriadoColorHint');
  function updateColorFieldVisibility() {
    const isFeriado = categorySelect.value === 'feriado';
    colorField.style.display = isFeriado ? 'none' : '';
    feriadoColorHint.style.display = isFeriado ? '' : 'none';
    if (isFeriado) {
      modalSheet.style.setProperty('--card-accent', 'var(--gray-300)');
    } else {
      const checkedRadio = form.querySelector('input[name="colorIndex"]:checked');
      if (checkedRadio) modalSheet.style.setProperty('--card-accent', `var(--special-color-${checkedRadio.value})`);
    }
  }
  categorySelect.addEventListener('change', updateColorFieldVisibility);
  updateColorFieldVisibility();

  // El contorno del modal (--card-accent) sigue en vivo al color que se
  // va eligiendo, para que se note de un vistazo cómo va a quedar el día.
  form.querySelectorAll('input[name="colorIndex"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      modalSheet.style.setProperty('--card-accent', `var(--special-color-${radio.value})`);
    });
  });

  function isDirty() {
    const current = new FormData(form);
    for (const [key, value] of current.entries()) {
      if (initialSnapshot.get(key) !== value) return true;
    }
    return false;
  }

  function removeOverlay() {
    overlay.remove();
  }

  async function requestClose() {
    if (!isDirty()) { removeOverlay(); return; }
    const discard = await showConfirmDialog({
      message: 'Tenés cambios sin guardar. ¿Querés descartarlos?',
      confirmLabel: 'Descartar',
      cancelLabel: 'Seguir editando',
    });
    if (discard) removeOverlay();
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) requestClose(); });
  const cancelBtn = overlay.querySelector('#cancelDayBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', requestClose);

  const deleteBtn = overlay.querySelector('#deleteDayBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const ok = await showConfirmDialog({
        message: `¿Borrar "${item.name}"? Esta acción no se puede deshacer.`,
        confirmLabel: 'Borrar',
      });
      if (!ok) return;
      await deleteSpecialDay(item.id);
      removeOverlay();
      if (typeof onDeleted === 'function') onDeleted(item.id);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dateValue = overlay.querySelector('#dayDate').value; // "YYYY-MM-DD"
    if (!dateValue) return;
    const [y, m, d] = dateValue.split('-').map(Number);
    const colorIndex = Number(form.querySelector('input[name="colorIndex"]:checked').value);
    const reminderRaw = overlay.querySelector('#dayReminder').value;

    const payload = {
      day: d,
      month: m,
      year: yearMattersSwitch.checked ? y : null,
      recurring: !yearMattersSwitch.checked,
      name: overlay.querySelector('#dayName').value.trim(),
      category: overlay.querySelector('#dayCategory').value,
      description: overlay.querySelector('#dayDescription').value.trim(),
      colorIndex,
      remindDaysBefore: reminderRaw === '' ? null : Number(reminderRaw),
    };

    let saved;
    if (item) {
      saved = await updateSpecialDay(item.id, payload);
    } else {
      payload.id = makeId();
      saved = await addSpecialDay(payload);
    }
    removeOverlay();
    if (typeof onSaved === 'function') onSaved(saved);
  });

  requestAnimationFrame(() => overlay.classList.add('is-open'));

  return { close: requestClose };
}