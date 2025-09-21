// --- DOM References ---
const pantallas = document.querySelectorAll('.pantalla');
const cargarBtn = document.getElementById('cargar-cuestionario-btn');
const cargarEjemploBtn = document.getElementById('cargar-ejemplo-btn');
const fileInput = document.getElementById('csv-file-input');
const codigoPartidaEl = document.getElementById('codigo-partida');
const urlSitioEl = document.getElementById('url-sitio');
const qrCodeEl = document.getElementById('qrcode');
const contadorJugadoresEl = document.getElementById('contador-jugadores');
const listaJugadoresEl = document.getElementById('lista-jugadores');
const iniciarJuegoBtn = document.getElementById('iniciar-juego-btn');
const pausaBtn = document.getElementById('pausa-btn');
const saltarTiempoBtn = document.getElementById('saltar-tiempo-btn');
const pausaOverlay = document.getElementById('pausa-overlay');
const siguientePreguntaBtn = document.getElementById('siguiente-pregunta-btn');
const reiniciarBtn = document.getElementById('reiniciar-btn');
const descargarResultadosBtn = document.getElementById('descargar-resultados-btn');
const controlesPostPregunta = document.getElementById('controles-post-pregunta');
const mostrarCorrectaBtn = document.getElementById('mostrar-correcta-btn');
const irAPuntuacionesBtn = document.getElementById('ir-a-puntuaciones-btn');
const temporizadorCirculo = document.getElementById('temporizador-circulo');
const estadoJugadoresPanel = document.getElementById('estado-jugadores-panel');
const jugadoresVotadoLista = document.getElementById('jugadores-votado');
const jugadoresPendientesLista = document.getElementById('jugadores-pendientes');
const contadorVotado = document.getElementById('contador-votado');
const contadorPendientes = document.getElementById('contador-pendientes');
const añadirJugadorBtn = document.getElementById('añadir-jugador-btn');
const reiniciarPartidaBtn = document.getElementById('reiniciar-partida-btn');
const podioEl = document.getElementById('podio');
const modalAñadirJugador = document.getElementById('modal-añadir-jugador');
const cerrarModalBtn = document.getElementById('cerrar-modal-btn');
const modalUrlSitioEl = document.getElementById('modal-url-sitio');
const modalCodigoPartidaEl = document.getElementById('modal-codigo-partida');
const modalQrCodeEl = document.getElementById('modal-qrcode');
const langSelectorEl = document.getElementById('lang-selector'); // Referencia añadida
const FULL_DASH_ARRAY = 283;
// --- Referencias de audio ---
const controlVolumenEl = document.getElementById('control-volumen');
const volumenSlider = document.getElementById('volumen-slider');
const toggleVolumenBtn = document.getElementById('toggle-volumen-btn');
const iconoVolumenActivo = document.getElementById('icono-volumen-activo');
const iconoVolumenMute = document.getElementById('icono-volumen-mute');

const VOLUME_STORAGE_KEY = 'qplay_volumen';
const MUTE_STORAGE_KEY = 'qplay_muted';

// --- State ---
let peer;
let cuestionario = [];
let jugadores = {};
let conexiones = {};
let respuestasRonda = {};
let estadoJuego = 'carga';
let preguntaActualIndex = -1;
let temporizadorInterval;
let tiempoRestante;
let tiempoPregunta;
let isPaused = false;
let gameId = '';
// --- Estado del audio ---
let audioContext;
let audioElement;
let cancionActual = null;
let tipoMusicaActual = null; // 'principal', 'juego', 'ganador'
let ultimoVolumenActivo = 0.4;

// --- Constantes de configuración de música (Simplificadas) ---
const CANTIDAD_MUSICA_PRINCIPAL = 8;
const CANTIDAD_MUSICA_GANADOR = 2;


// --- LocalStorage Logic ---
function guardarEstadoJuego() {
    if (!gameId) return; // No guardar si no hay partida
    const jugadoresParaGuardar = {};
    for (const nombre in jugadores) {
        jugadoresParaGuardar[nombre] = {
            nombre: jugadores[nombre].nombre,
            puntaje: jugadores[nombre].puntaje,
            conectado: false,
            haVotado: jugadores[nombre].haVotado,
            correctas: jugadores[nombre].correctas,
            respuestasDetalladas: jugadores[nombre].respuestasDetalladas, // MODIFICADO
        };
    }
    const estado = {
        gameId,
        cuestionario,
        jugadores: jugadoresParaGuardar,
        estadoJuego,
        preguntaActualIndex,
    };
    localStorage.setItem('qplay_estado_partida', JSON.stringify(estado));
}

function cargarEstadoJuego() {
    const estadoGuardado = localStorage.getItem('qplay_estado_partida');
    if (estadoGuardado) {
        try {
            const estado = JSON.parse(estadoGuardado);
            gameId = estado.gameId; // Recuperar el ID de la partida guardada
            cuestionario = estado.cuestionario;
            jugadores = estado.jugadores;
            estadoJuego = estado.estadoJuego;
            preguntaActualIndex = estado.preguntaActualIndex;
            return true;
        } catch (error) {
            console.error("Error al cargar el estado del juego:", error);
            limpiarEstadoJuego();
            return false;
        }
    }
    return false;
}

function limpiarEstadoJuego() {
    localStorage.removeItem('qplay_estado_partida');
}

// --- Music Logic ---
function inicializarAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioElement = new Audio();
        audioElement.crossOrigin = "anonymous";

        const volumenGuardado = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY));
        const volumenInicial = isNaN(volumenGuardado) ? 0.4 : volumenGuardado;
        const volumenInicialClamped = Math.min(Math.max(volumenInicial, 0), 1);
        const muteGuardado = localStorage.getItem(MUTE_STORAGE_KEY) === 'true';

        audioElement.volume = volumenInicialClamped;
        audioElement.muted = muteGuardado || volumenInicialClamped === 0;

        if (volumenSlider) {
            volumenSlider.value = volumenInicialClamped;
        }

        if (volumenInicialClamped > 0) {
            ultimoVolumenActivo = volumenInicialClamped;
        }

        audioElement.addEventListener('ended', () => {
             if (tipoMusicaActual === 'principal' || tipoMusicaActual === 'juego') {
                reproducirMusicaAleatoria(tipoMusicaActual);
            }
        });

        actualizarIconoVolumen();
    }
}

function obtenerPistaAleatoria(tipo) {
    let cantidad, prefijo, padLength;
    switch (tipo) {
        case 'principal':
        case 'juego':
            cantidad = CANTIDAD_MUSICA_PRINCIPAL;
            prefijo = '';
            padLength = 2;
            break;
        case 'ganador':
            cantidad = CANTIDAD_MUSICA_GANADOR;
            prefijo = 'ganador';
            padLength = 2;
            break;
        default:
            return null;
    }
    const numero = Math.floor(Math.random() * cantidad) + 1;
    const nombreArchivo = `${prefijo}${String(numero).padStart(padLength, '0')}.mp3`;
    return `musica/${nombreArchivo}`;
}

function reproducirMusica(pista) {
    if (!audioElement || !pista || cancionActual === pista) return;
    
    cancionActual = pista;
    audioElement.src = pista;
    audioElement.play().catch(error => {
        console.warn("La reproducción automática fue bloqueada.", error);
    });
}

function detenerMusica() {
    if (audioElement && !audioElement.paused) {
        audioElement.pause();
    }
    cancionActual = null;
    tipoMusicaActual = null;
}

function pausarMusica() {
    if (audioElement && !audioElement.paused) {
        audioElement.pause();
    }
}

function reanudarMusica() {
    if (audioElement && audioElement.src && audioElement.paused) {
        audioElement.play().catch(error => {
            console.warn("La reanudación fue bloqueada.", error);
        });
    }
}

function actualizarIconoVolumen() {
    if (!toggleVolumenBtn) return;
    const silenciado = !audioElement || audioElement.muted || audioElement.volume === 0;
    toggleVolumenBtn.setAttribute('aria-pressed', silenciado ? 'true' : 'false');
    toggleVolumenBtn.classList.toggle('opacity-60', silenciado);

    if (iconoVolumenActivo) {
        iconoVolumenActivo.classList.toggle('hidden', silenciado);
    }
    if (iconoVolumenMute) {
        iconoVolumenMute.classList.toggle('hidden', !silenciado);
    }
}

function reproducirMusicaAleatoria(tipo) {
    const nuevaPista = obtenerPistaAleatoria(tipo);
    if (nuevaPista) {
        tipoMusicaActual = tipo;
        reproducirMusica(nuevaPista);
    }
}

function gestionarMusicaPorEstado() {
    if (!audioContext) return;

    const musicaDeberiaSonar = (estadoJuego !== 'carga');
    if (controlVolumenEl) {
        controlVolumenEl.style.display = musicaDeberiaSonar ? 'flex' : 'none';
    }
    actualizarIconoVolumen();

    switch (estadoJuego) {
        case 'lobby':
            if (tipoMusicaActual !== 'principal') {
                detenerMusica();
                reproducirMusicaAleatoria('principal');
            }
            break;
        case 'jugando':
            if (tipoMusicaActual === 'principal' || tipoMusicaActual === null) {
                detenerMusica();
                reproducirMusicaAleatoria('juego');
            } else {
                reanudarMusica();
            }
            break;
        case 'mostrando_correcta':
        case 'leaderboard':
            pausarMusica();
            break;
        case 'final':
            if (tipoMusicaActual !== 'ganador') {
                detenerMusica();
                reproducirMusicaAleatoria('ganador');
            }
            break;
        default:
            detenerMusica();
            break;
    }
}


// --- UI Functions ---

/**
 * Renderiza texto con Markdown y KaTeX en un elemento HTML.
 * @param {HTMLElement} elemento El elemento de destino.
 * @param {string} texto El contenido de texto con posible Markdown y LaTeX.
 */
function renderizarContenidoMixto(elemento, texto) {
    if (!elemento) return;
    const html = marked.parse(texto || '', { breaks: true, gfm: true });
    elemento.innerHTML = html;
    
    if (window.renderMathInElement) {
        renderMathInElement(elemento, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '\\[', right: '\\]', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false}
            ],
            throwOnError: false,
            ignoredTags: ["code", "pre", "script", "style", "textarea"]
        });
    }
}

function mostrarPantalla(id) {
    pantallas.forEach(p => p.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');

    if (langSelectorEl) {
        langSelectorEl.style.display = (id === 'pantalla-carga') ? 'flex' : 'none';
    }

    const esPartidaActiva = ['pantalla-lobby', 'pantalla-pregunta', 'pantalla-leaderboard', 'pantalla-final'].includes(id);
    if(reiniciarPartidaBtn) reiniciarPartidaBtn.style.display = esPartidaActiva ? 'flex' : 'none';
    
    if(añadirJugadorBtn) añadirJugadorBtn.style.display = ['pantalla-leaderboard', 'pantalla-pregunta'].includes(id) ? 'flex' : 'none';
    
    if (id === 'pantalla-pregunta' && ['jugando', 'mostrando_correcta'].includes(estadoJuego)) {
        estadoJugadoresPanel.style.display = 'block';
    } else {
        estadoJugadoresPanel.style.display = 'none';
    }

    gestionarMusicaPorEstado();
}


function actualizarListaJugadores() {
    if (!listaJugadoresEl) return;
    listaJugadoresEl.innerHTML = '';
    const jugadoresActivos = Object.values(jugadores).filter(j => j.conectado);
    contadorJugadoresEl.textContent = jugadoresActivos.length;
    jugadoresActivos.forEach(jugador => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between glass-card p-2 rounded-lg text-white';
        li.innerHTML = `
            <div class="flex items-center">
                <span class="font-bold text-xl">${jugador.nombre}</span>
            </div>
            <button data-peer-id="${jugador.conn.peer}" class="eliminar-jugador-btn text-red-400 hover:text-red-500 font-bold p-2 rounded-full hover:bg-red-900 hover:bg-opacity-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        `;
        listaJugadoresEl.appendChild(li);
    });
    iniciarJuegoBtn.disabled = jugadoresActivos.length === 0;
}

function actualizarEstadoJugadoresDisplay() {
    const jugadoresConectados = Object.values(jugadores).filter(j => j.conectado);
    const votado = jugadoresConectados.filter(j => j.haVotado);
    const pendientes = jugadoresConectados.filter(j => !j.haVotado);

    jugadoresVotadoLista.innerHTML = '';
    votado.forEach(j => {
        const li = document.createElement('li');
        li.textContent = j.nombre;
        jugadoresVotadoLista.appendChild(li);
    });
    contadorVotado.textContent = votado.length;

    jugadoresPendientesLista.innerHTML = '';
    pendientes.forEach(j => {
        const li = document.createElement('li');
        li.textContent = j.nombre;
        jugadoresPendientesLista.appendChild(li);
    });
    contadorPendientes.textContent = pendientes.length;
}

function mostrarModalAñadirJugador() {
    if(modalAñadirJugador) {
         modalAñadirJugador.classList.remove('hidden');
         modalAñadirJugador.classList.add('flex');
    }
}

function cerrarModalAñadirJugador() {
    if(modalAñadirJugador) {
         modalAñadirJugador.classList.add('hidden');
         modalAñadirJugador.classList.remove('flex');
    }
}

function generarCodigoCorto(longitud = 5) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < longitud; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function reenviarEstadoActual(conn) {
    const pregunta = cuestionario[preguntaActualIndex];
    if (!pregunta) return;

    if (estadoJuego === 'jugando' || estadoJuego === 'mostrando_correcta') {
         let numRespuestasVisibles = 0;
         pregunta.respuestas.forEach((respuesta) => {
            if (respuesta.trim() !== '') numRespuestasVisibles++;
         });
        conn.send({
            tipo: 'pregunta',
            payload: {
                numRespuestas: numRespuestasVisibles,
                tipo: pregunta.tipo
            }
        });
    } else if (estadoJuego === 'leaderboard') {
        conn.send({ tipo: 'partida_iniciada' }); 
    }
}

function reiniciarJuegoCompleto() {
    if (peer && !peer.destroyed) {
        peer.destroy();
    }
    detenerMusica();
    if (controlVolumenEl) controlVolumenEl.style.display = 'none';
    
    limpiarEstadoJuego();
    
    cuestionario = [];
    jugadores = {};
    conexiones = {};
    respuestasRonda = {};
    estadoJuego = 'carga';
    preguntaActualIndex = -1;
    gameId = '';
    peer = null;
    
    mostrarPantalla('pantalla-carga');
}

function iniciarJuego() {
    estadoJuego = 'jugando';
    if (document.getElementById('opcion-preguntas-aleatorias').checked) {
        for (let i = cuestionario.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cuestionario[i], cuestionario[j]] = [cuestionario[j], cuestionario[i]];
        }
    }
    preguntaActualIndex = -1;
    guardarEstadoJuego();
    avanzarPregunta();
}

function avanzarPregunta() {
    preguntaActualIndex++;
    if (preguntaActualIndex >= cuestionario.length) {
        finalizarJuego();
        return;
    }
    respuestasRonda = {};
    Object.values(jugadores).forEach(j => j.haVotado = false);
    estadoJuego = 'jugando';
    guardarEstadoJuego();
    mostrarPregunta();
    actualizarEstadoJugadoresDisplay();
}

function mostrarPregunta() {
    const pregunta = cuestionario[preguntaActualIndex];
    isPaused = false;
    pausaBtn.textContent = t('pause_button');
    pausaOverlay.style.display = 'none';
    mostrarPantalla('pantalla-pregunta');
    controlesPostPregunta.classList.add('hidden');
    mostrarCorrectaBtn.disabled = false;
    saltarTiempoBtn.style.display = 'inline-block';
    
    document.getElementById('contador-pregunta').textContent = t('question_counter', {
        current: preguntaActualIndex + 1,
        total: cuestionario.length
    });

    renderizarContenidoMixto(document.getElementById('texto-pregunta'), pregunta.pregunta);
    
    const imgEl = document.getElementById('imagen-pregunta');
    if (pregunta.imagen_url) {
        imgEl.src = pregunta.imagen_url;
        imgEl.classList.remove('hidden');
    } else {
        imgEl.classList.add('hidden');
    }
    const respuestasGrid = document.getElementById('respuestas-grid');
    respuestasGrid.innerHTML = '';
    const simbolos = ['▲', '◆', '●', '■'];
    
    // --- INICIO DE LA MODIFICACIÓN ---
    let respuestasParaMostrar = pregunta.respuestas.map((texto, index) => ({ texto, originalIndex: index }));
    let indicesCorrectosOriginales = Array.isArray(pregunta.correcta) ? pregunta.correcta : [pregunta.correcta];

    if (document.getElementById('opcion-respuestas-aleatorias').checked) {
        // Algoritmo de desordenación Fisher-Yates
        for (let i = respuestasParaMostrar.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [respuestasParaMostrar[i], respuestasParaMostrar[j]] = [respuestasParaMostrar[j], respuestasParaMostrar[i]];
        }

        // Actualizar el índice de la respuesta correcta a su nueva posición
        const nuevosIndicesCorrectos = respuestasParaMostrar
            .map((resp, nuevaPosicion) => (indicesCorrectosOriginales.includes(resp.originalIndex) ? nuevaPosicion : -1))
            .filter(index => index !== -1);
        
        // Asignar los nuevos índices correctos a la pregunta actual para esta ronda
        if (Array.isArray(pregunta.correcta)) {
            pregunta.correcta = nuevosIndicesCorrectos.sort();
        } else {
            pregunta.correcta = nuevosIndicesCorrectos[0];
        }
    }
    // --- FIN DE LA MODIFICACIÓN ---

    let numRespuestasVisibles = 0;
    
    // Usar el array (potencialmente desordenado) para crear los elementos
    respuestasParaMostrar.forEach((respuesta, index) => {
        if (respuesta.texto.trim() !== '') {
            numRespuestasVisibles++;
            const respuestaDiv = document.createElement('div');
            respuestaDiv.className = `respuesta-color-${index} text-white p-6 rounded-lg flex items-center text-3xl text-shadow`;
            
            const simboloSpan = document.createElement('span');
            simboloSpan.className = 'mr-4 text-4xl';
            simboloSpan.textContent = simbolos[index];
            
            const textoP = document.createElement('p');
            renderizarContenidoMixto(textoP, respuesta.texto);

            respuestaDiv.appendChild(simboloSpan);
            respuestaDiv.appendChild(textoP);
            respuestasGrid.appendChild(respuestaDiv);
        }
    });
    
    tiempoPregunta = pregunta.tiempo;
    tiempoRestante = tiempoPregunta;
    const temporizadorEl = document.getElementById('temporizador');
    temporizadorEl.textContent = tiempoRestante;
    setCircleDashoffset();
    clearInterval(temporizadorInterval);
    temporizadorInterval = null;
    temporizadorInterval = setInterval(() => {
        if (isPaused) return;
        tiempoRestante--;
        temporizadorEl.textContent = tiempoRestante;
        setCircleDashoffset();
        if (tiempoRestante <= 0) {
            finalizarRonda();
        }
    }, 1000);
    
    Object.values(conexiones).forEach(nombre => {
        const jugador = jugadores[nombre];
        if (jugador.conectado && jugador.conn) {
            jugador.conn.send({
                tipo: 'pregunta',
                payload: {
                    numRespuestas: numRespuestasVisibles,
                    tipo: pregunta.tipo
                }
            });
        }
    });
    actualizarEstadoJugadoresDisplay();
}


function setCircleDashoffset() {
    const rawTimeFraction = tiempoRestante / tiempoPregunta;
    const dashoffset = (1 - rawTimeFraction) * FULL_DASH_ARRAY;
    temporizadorCirculo.style.strokeDashoffset = dashoffset;
}

function finalizarRonda() {
    if (temporizadorInterval) {
        clearInterval(temporizadorInterval);
        temporizadorInterval = null;
    }
    estadoJuego = 'mostrando_correcta';
    gestionarMusicaPorEstado(); 
    controlesPostPregunta.classList.remove('hidden');
    saltarTiempoBtn.style.display = 'none';

    const pregunta = cuestionario[preguntaActualIndex];

    Object.values(jugadores).forEach(jugador => {
        if (!jugador.nombre) return; // Skip si algo está mal

        // Asegurarse de que el array existe (para retrocompatibilidad)
        if (!jugador.respuestasDetalladas) {
            jugador.respuestasDetalladas = [];
        }

        let esCorrecta = false;
        let puntosRonda = 0;

        if (respuestasRonda[jugador.nombre]) {
            // El jugador ha respondido
            const respJugador = respuestasRonda[jugador.nombre].respuesta;
            const respCorrecta = pregunta.correcta;

            if (Array.isArray(respCorrecta)) {
                esCorrecta = respCorrecta.length === respJugador.length && respCorrecta.every(val => respJugador.includes(val));
            } else {
                esCorrecta = respCorrecta === respJugador;
            }

            if (esCorrecta) {
                jugador.correctas = (jugador.correctas || 0) + 1;
                puntosRonda = (500 + respuestasRonda[jugador.nombre].tiempoRespuesta * 10);
                jugador.puntaje += puntosRonda;
                jugador.respuestasDetalladas[preguntaActualIndex] = 1; // 1 para correcto
            } else {
                jugador.respuestasDetalladas[preguntaActualIndex] = 0; // 0 para incorrecto
            }
        } else {
            // El jugador no ha respondido
            jugador.respuestasDetalladas[preguntaActualIndex] = -1; // -1 para sin respuesta
        }

        // Enviar resultado individual al jugador si está conectado
        if (jugador.conectado && jugador.conn) {
            jugador.conn.send({
                tipo: 'resultado',
                payload: {
                    esCorrecta: esCorrecta,
                    puntosRonda: puntosRonda,
                    puntosTotal: jugador.puntaje
                }
            });
        }
    });

    guardarEstadoJuego();
}


function gestionarPausa() {
    isPaused = !isPaused;
    if (isPaused) {
        pausarMusica();
    } else {
        reanudarMusica();
    }
    const tipoMensaje = isPaused ? 'pausa' : 'resume';
    Object.values(jugadores).forEach(j => {
        if (j.conectado && j.conn) {
            j.conn.send({
                tipo: tipoMensaje
            });
        }
    });

    if (isPaused) {
        pausaBtn.textContent = t('resume_button');
        pausaOverlay.style.display = 'flex';
    } else {
        pausaBtn.textContent = t('pause_button');
        pausaOverlay.style.display = 'none';
    }
}

function revelarRespuestaCorrecta() {
    mostrarCorrectaBtn.disabled = true;
    const pregunta = cuestionario[preguntaActualIndex];
    const respuestasGrid = document.getElementById('respuestas-grid');
    let correctaIndices = Array.isArray(pregunta.correcta) ? pregunta.correcta : [pregunta.correcta];
    Array.from(respuestasGrid.children).forEach((el, index) => {
        if (correctaIndices.includes(index)) {
            el.classList.add('respuesta-correcta');
        }
    });
}

function mostrarLeaderboard() {
    estadoJuego = 'leaderboard';
    guardarEstadoJuego();
    mostrarPantalla('pantalla-leaderboard');
    const listaPuntuaciones = document.getElementById('lista-puntuaciones');
    listaPuntuaciones.innerHTML = '';
    const jugadoresOrdenados = Object.values(jugadores).filter(j => j.nombre).sort((a, b) => b.puntaje - a.puntaje);
    jugadoresOrdenados.forEach((jugador, index) => {
        const li = document.createElement('li');
        const medallas = ['👑', '🥈', '🥉'];
        const medalla = index < 3 ? `<span class="text-4xl mr-4">${medallas[index]}</span>` : `<span class="w-12 mr-4 text-center text-gray-300 font-semibold">${index + 1}.</span>`;
        li.className = 'flex items-center glass-card p-4 rounded-lg shadow-sm';
        li.innerHTML = `
            ${medalla}
            <span class="font-bold flex-grow">${jugador.nombre}</span>
            <span class="font-semibold text-teal-300">${jugador.puntaje} pts</span>
        `;
        listaPuntuaciones.appendChild(li);
    });
}

function finalizarJuego() {
    estadoJuego = 'final';
    mostrarPantalla('pantalla-final');
    podioEl.innerHTML = '';
    const jugadoresOrdenados = Object.values(jugadores).filter(j => j.nombre).sort((a, b) => b.puntaje - a.puntaje);
    const puntuacionMaxima = jugadoresOrdenados.length > 0 ? jugadoresOrdenados[0].puntaje : 0;
    const alturas = ['h-48', 'h-64', 'h-32'];
    const ordenPodio = [1, 0, 2];
    const medallas = ['🥈', '🥇', '🥉'];
    for (let i = 0; i < 3; i++) {
        const index = ordenPodio[i];
        const jugador = jugadoresOrdenados[index];
        if (!jugador) continue;
        const podioDiv = document.createElement('div');
        podioDiv.className = 'flex flex-col items-center';
        podioDiv.innerHTML = `
            <p class="text-4xl mb-2">${medallas[i]}</p>
            <p class="text-3xl font-bold">${jugador.nombre}</p>
            <div class="w-48 text-center p-4 rounded-t-lg ${alturas[i]} flex flex-col justify-end bg-gradient-to-t from-purple-500 to-pink-500">
                <p class="text-5xl font-extrabold">${index + 1}</p>
                <p class="text-2xl">${jugador.puntaje} pts</p>
            </div>
        `;
        podioEl.appendChild(podioDiv);
    }
    Object.values(conexiones).forEach(nombre => {
        const jugador = jugadores[nombre];
        if (jugador && jugador.conectado && jugador.conn) {
            jugador.conn.send({
                tipo: 'resultado_final',
                payload: {
                    tuPuntuacion: jugador.puntaje,
                    puntuacionMaxima: puntuacionMaxima,
                    respuestasCorrectas: jugador.correctas || 0,
                    totalPreguntas: cuestionario.length
                }
            });
        }
    });
    limpiarEstadoJuego();
}

function descargarResultados() {
    const jugadoresOrdenados = Object.values(jugadores).filter(j => j.nombre).sort((a, b) => b.puntaje - a.puntaje);
    
    // 1. Crear cabecera con totales y enunciados de preguntas
    let cabeceras = ['Posición', 'Nombre', 'Puntuación Total', 'Total Correctos'];
    cuestionario.forEach(pregunta => {
        // Se limpia el texto de la pregunta para evitar conflictos con el formato CSV
        const textoPreguntaLimpio = `"${pregunta.pregunta.replace(/"/g, '""')}"`;
        cabeceras.push(textoPreguntaLimpio);
    });
    let csvContent = cabeceras.join(';') + '\n';

    // 2. Crear una fila por cada jugador
    jugadoresOrdenados.forEach((jugador, index) => {
        // Se añaden los datos del jugador, incluyendo el total de aciertos
        let fila = [
            index + 1,
            `"${jugador.nombre}"`,
            jugador.puntaje,
            jugador.correctas || 0 // Se añade el total de respuestas correctas
        ];
        
        // 3. Añadir el resultado de cada pregunta a la fila
        for (let i = 0; i < cuestionario.length; i++) {
            const resultado = jugador.respuestasDetalladas ? jugador.respuestasDetalladas[i] : undefined;
            let textoResultado = '';
            switch(resultado) {
                case 1: textoResultado = 'Correcto'; break;
                case 0: textoResultado = 'Incorrecto'; break;
                default: textoResultado = 'Sin respuesta';
            }
            fila.push(textoResultado);
        }
        csvContent += fila.join(';') + '\n';
    });

    // 4. Lógica de descarga (sin cambios)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${t('results_csv_filename')}_detallado_completo.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


function inicializarPeer(existingGameId = null) {
    if (peer) {
        peer.destroy();
    }
    gameId = existingGameId || generarCodigoCorto(5);

    const peerConfig = {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 2,
        config: {
            iceServers: [
              { urls: 'stun:stun.relay.metered.ca:80' },
              {
                urls: 'turn:standard.relay.metered.ca:80',
                username: '9745e21b303bdaea589c29bc',
                credential: 'UgG56tBqCEGNjzLY'
              },
              {
                urls: 'turn:standard.relay.metered.ca:443?transport=tcp',
                username: '9745e21b303bdaea589c29bc',
                credential: 'UgG56tBqCEGNjzLY'
              }
            ],
            iceTransportPolicy: 'all'
        }
    };
    
    peer = new Peer(gameId, peerConfig);
    
    peer.on('open', id => {
        const urlUnion = new URL('jugador.html', window.location.href);
        if(urlSitioEl) urlSitioEl.textContent = urlUnion.origin + urlUnion.pathname;
        urlUnion.searchParams.set('partida', id);
        if(codigoPartidaEl) codigoPartidaEl.textContent = id;
        // Click-to-copy full join URL on the code element
        try {
            const fullJoinUrl = urlUnion.href;
            if (codigoPartidaEl) {
                codigoPartidaEl.title = fullJoinUrl;
                codigoPartidaEl.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(fullJoinUrl);
                        const hint = document.getElementById('copy-join-hint');
                        if (hint) {
                            const original = hint.textContent;
                            hint.textContent = (typeof t === 'function' ? t('lobby_copied') : 'URL copiada');
                            setTimeout(() => { hint.textContent = original; }, 1500);
                        }
                    } catch (e) {
                        // Fallback: prompt if clipboard API not available
                        window.prompt('Copia la URL:', fullJoinUrl);
                    }
                });
            }
        } catch (_e) {}
        if (qrCodeEl) {
            qrCodeEl.innerHTML = "";
            new QRCode(qrCodeEl, {
                text: urlUnion.href,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
            });
        }
        if(modalUrlSitioEl) modalUrlSitioEl.textContent = urlUnion.origin + urlUnion.pathname;
        if(modalCodigoPartidaEl) modalCodigoPartidaEl.textContent = id;
        if (modalQrCodeEl) {
            modalQrCodeEl.innerHTML = "";
            new QRCode(modalQrCodeEl, {
                text: urlUnion.href,
                width: 320,
                height: 320,
                colorDark: "#000000",
                colorLight: "#ffffff",
            });
        }

        if (!existingGameId) {
            mostrarPantalla('pantalla-lobby');
            actualizarListaJugadores(); // <-- CORRECCIÓN AÑADIDA AQUÍ
            guardarEstadoJuego();
        }
    });
    peer.on('connection', configurarNuevaConexion);
    peer.on('error', (err) => {
        console.error("Error en PeerJS: ", err);
        if (err.type === 'unavailable-id' && existingGameId) {
            console.log("Reintentando conexión a PeerJS...");
            setTimeout(() => inicializarPeer(existingGameId), 2000);
        }
    });
}

function configurarNuevaConexion(conn) {
    conn.on('data', (data) => {
        if (data.tipo === 'join') {
            gestionarConexionJugador(conn, data.nombre);
        } else if (data.tipo === 'respuesta' && estadoJuego === 'jugando') {
            gestionarRespuestaJugador(conn.peer, data.payload);
        }
    });
    conn.on('close', () => gestionarDesconexionJugador(conn.peer));
}

function gestionarConexionJugador(conn, nombre) {
    if (Object.values(jugadores).some(j => j.nombre === nombre && j.conectado)) {
        conn.send({
            tipo: 'error',
            payload: {
                mensaje: t('error_name_in_use')
            }
        });
        setTimeout(() => conn.close(), 100);
        return;
    }
    let jugador = jugadores[nombre];
    if (jugador) {
        jugador.conectado = true;
        jugador.conn = conn;
    } else {
        jugador = {
            nombre: nombre,
            puntaje: 0,
            conn: conn,
            conectado: true,
            haVotado: false,
            correctas: 0,
            respuestasDetalladas: [] // MODIFICADO
        };
        jugadores[nombre] = jugador;
    }
    conexiones[conn.peer] = nombre;
    if (estadoJuego === 'jugando' || estadoJuego === 'mostrando_correcta' || estadoJuego === 'leaderboard') {
        reenviarEstadoActual(jugador.conn);
    } else {
        jugador.conn.send({
            tipo: 'confirmacion_join'
        });
    }
    actualizarListaJugadores();
    actualizarEstadoJugadoresDisplay();
    guardarEstadoJuego();
}

function gestionarRespuestaJugador(peerId, payload) {
    const nombre = conexiones[peerId];
    if (!nombre || !jugadores[nombre] || jugadores[nombre].haVotado) return;
    respuestasRonda[nombre] = {
        respuesta: payload.respuesta,
        tiempoRespuesta: tiempoRestante
    };
    jugadores[nombre].haVotado = true;
    actualizarEstadoJugadoresDisplay();
    guardarEstadoJuego();
    const jugadoresActivos = Object.values(jugadores).filter(j => j.conectado).length;
    if (Object.keys(respuestasRonda).length === jugadoresActivos) {
        finalizarRonda();
    }
}

function gestionarDesconexionJugador(peerId) {
    const nombre = conexiones[peerId];
    if (nombre && jugadores[nombre]) {
        console.log(`${nombre} se ha desconectado.`);
        jugadores[nombre].conectado = false;
        jugadores[nombre].conn = null;
        delete conexiones[peerId];
        if (estadoJuego === 'carga' || estadoJuego === 'lobby') {
            actualizarListaJugadores();
        } else {
            actualizarEstadoJugadoresDisplay();
        }
    }
    guardarEstadoJuego();
}

function procesarYEmpezar(csvText) {
    const lineas = csvText.split('\n').filter(l => l.trim() !== '');
    const regex = /"([^"]*)"|([^;]+)/g;
    cuestionario = [];
    for (let i = 1; i < lineas.length; i++) {
        const campos = Array.from(lineas[i].matchAll(regex), m => m[1] || m[2]);
        if (campos.length >= 8) {
            let correcta;
            const correctaRaw = campos[7] || '';
            if (correctaRaw.includes(',')) {
                correcta = correctaRaw.split(',').map(n => parseInt(n) - 1).sort();
            } else {
                correcta = parseInt(correctaRaw) - 1;
            }
            cuestionario.push({
                tipo: campos[0] || 'quiz',
                pregunta: campos[1] || '',
                respuestas: [campos[2] || '', campos[3] || '', campos[4] || '', campos[5] || ''],
                tiempo: parseInt(campos[6]) || 30,
                correcta: correcta,
                imagen_url: campos[8] || ''
            });
        }
    }
    if (cuestionario.length === 0) {
        alert(t('error_csv_format'));
        mostrarPantalla('pantalla-carga');
        return;
    }
    estadoJuego = 'lobby';
    preguntaActualIndex = -1;
    jugadores = {};
    conexiones = {};
    inicializarPeer();
}

if(cargarBtn) cargarBtn.addEventListener('click', () => {
    inicializarAudio();

    if (localStorage.getItem('qplay_estado_partida')) {
        if (confirm(t('confirm_new_game'))) {
            limpiarEstadoJuego();
            fileInput.click();
        }
    } else {
        fileInput.click();
    }
});

if(cargarEjemploBtn) {
    cargarEjemploBtn.addEventListener('click', () => {
        inicializarAudio();
        
        if (localStorage.getItem('qplay_estado_partida')) {
            if (!confirm(t('confirm_new_game'))) {
                return; 
            }
        }
        
        limpiarEstadoJuego();
        const urlEjemplo = 'https://raw.githubusercontent.com/jjdeharo/qplay/refs/heads/main/ejemplo.csv';

        fetch(urlEjemplo)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error de red: ${response.statusText}`);
                }
                return response.text();
            })
            .then(csvText => {
                procesarYEmpezar(csvText);
            })
            .catch(error => {
                console.error('Error al cargar el cuestionario de ejemplo:', error);
                alert(t('error_load_example', { message: error.message }));
            });
    });
}

if(fileInput) fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    limpiarEstadoJuego();
    const reader = new FileReader();
    reader.onload = (event) => {
        procesarYEmpezar(event.target.result);
    };
    reader.readAsText(file);
});

if(listaJugadoresEl) listaJugadoresEl.addEventListener('click', e => {
    const boton = e.target.closest('.eliminar-jugador-btn');
    if (boton) {
        const peerId = boton.dataset.peerId;
        const nombre = conexiones[peerId];
        if (nombre && jugadores[nombre] && jugadores[nombre].conn) {
            jugadores[nombre].conn.send({
                tipo: 'expulsado'
            });
            setTimeout(() => jugadores[nombre].conn.close(), 100);
        }
        delete jugadores[nombre];
        delete conexiones[peerId];
        actualizarListaJugadores();
        guardarEstadoJuego();
    }
});

if(añadirJugadorBtn) añadirJugadorBtn.addEventListener('click', mostrarModalAñadirJugador);
if(cerrarModalBtn) cerrarModalBtn.addEventListener('click', cerrarModalAñadirJugador);
if(modalAñadirJugador) modalAñadirJugador.addEventListener('click', (e) => {
    if (e.target.id === 'modal-añadir-jugador') {
        cerrarModalAñadirJugador();
    }
});

if(iniciarJuegoBtn) iniciarJuegoBtn.addEventListener('click', iniciarJuego);
if(siguientePreguntaBtn) siguientePreguntaBtn.addEventListener('click', avanzarPregunta);
if(pausaBtn) pausaBtn.addEventListener('click', gestionarPausa);
if(saltarTiempoBtn) saltarTiempoBtn.addEventListener('click', finalizarRonda);
if(mostrarCorrectaBtn) mostrarCorrectaBtn.addEventListener('click', revelarRespuestaCorrecta);
if(irAPuntuacionesBtn) irAPuntuacionesBtn.addEventListener('click', mostrarLeaderboard);

if(reiniciarBtn) reiniciarBtn.addEventListener('click', () => {
    reiniciarJuegoCompleto();
});

if(reiniciarPartidaBtn) reiniciarPartidaBtn.addEventListener('click', () => {
    if (confirm(t('confirm_restart_game'))) {
        reiniciarJuegoCompleto();
    }
});

if(descargarResultadosBtn) descargarResultadosBtn.addEventListener('click', descargarResultados);

if(volumenSlider) {
    volumenSlider.addEventListener('input', (e) => {
        let nuevoVolumen = parseFloat(e.target.value);
        if (isNaN(nuevoVolumen)) {
            nuevoVolumen = 0;
        }
        nuevoVolumen = Math.min(Math.max(nuevoVolumen, 0), 1);

        if (!audioContext) {
            inicializarAudio();
        }

        if (audioElement) {
            audioElement.volume = nuevoVolumen;
            audioElement.muted = nuevoVolumen === 0;
            if (nuevoVolumen > 0) {
                ultimoVolumenActivo = nuevoVolumen;
            }
        }

        volumenSlider.value = nuevoVolumen;

        localStorage.setItem(VOLUME_STORAGE_KEY, nuevoVolumen);
        localStorage.setItem(MUTE_STORAGE_KEY, (audioElement && audioElement.muted) ? 'true' : 'false');
        actualizarIconoVolumen();
    });
}

if (toggleVolumenBtn) {
    toggleVolumenBtn.addEventListener('click', () => {
        if (!audioContext) {
            inicializarAudio();
        }

        if (!audioElement) return;

        const silenciado = audioElement.muted || audioElement.volume === 0;

        if (silenciado) {
            const volumenRestaurado = Math.min(Math.max(ultimoVolumenActivo > 0 ? ultimoVolumenActivo : 0.4, 0), 1);
            audioElement.muted = false;
            audioElement.volume = volumenRestaurado;
            if (volumenSlider) {
                volumenSlider.value = volumenRestaurado;
            }
            localStorage.setItem(VOLUME_STORAGE_KEY, volumenRestaurado);
            localStorage.setItem(MUTE_STORAGE_KEY, 'false');
        } else {
            if (audioElement.volume > 0) {
                ultimoVolumenActivo = audioElement.volume;
            }
            audioElement.muted = true;
            localStorage.setItem(MUTE_STORAGE_KEY, 'true');
        }

        actualizarIconoVolumen();
    });
}

window.addEventListener('beforeunload', guardarEstadoJuego);

function reanudarPartida() {
    console.log("Restaurando partida...");
    inicializarAudio();
    inicializarPeer(gameId);
    if (estadoJuego === 'lobby') {
        mostrarPantalla('pantalla-lobby');
        actualizarListaJugadores();
    } else if (estadoJuego === 'jugando' || estadoJuego === 'mostrando_correcta') {
        mostrarPregunta();
        actualizarEstadoJugadoresDisplay();
    } else if (estadoJuego === 'leaderboard') {
        mostrarLeaderboard();
    }
}
if (cargarEstadoJuego()) {
    reanudarPartida();
} else {
    mostrarPantalla('pantalla-carga');
}
