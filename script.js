// Función para mostrar secciones
function showSection(sectionId, event) {
    const allSections = document.querySelectorAll('.section-content');
    let activeNavButton = event ? event.currentTarget : null;

    // Ocultar todas las secciones primero
    allSections.forEach(section => {
        section.classList.add('hidden');
    });

    let sectionToShow = document.getElementById(sectionId);

    if (sectionId === 'inicio') {
        // Mostrar todas las secciones principales en la vista de inicio
        const mainSections = ['spline-viewer-section', 'perfil', 'cursos', 'proyectos', 'deportes', 'certificaciones'];
        mainSections.forEach(id => {
            const section = document.getElementById(id);
            if (section) section.classList.remove('hidden');
        });
        // Para 'inicio', el scroll es al principio de la página
        sectionToShow = document.body;
    } else {
        // Mostrar sqolo la sección seleccionada
        if (sectionToShow) {
            sectionToShow.classList.remove('hidden');
        }
    }

    // Casos especiales para el detalle del curso y de la semana
    if (sectionId === 'curso-detalle' || sectionId === 'semana-detalle') {
        activeNavButton = document.querySelector('.nav-btn[data-section="cursos"]');
    }

    // Actualizar botones de navegación
    updateNavButtons(activeNavButton, sectionToShow);
}

function updateNavButtons(activeButton, sectionToScrollTo) {
    const navButtons = document.querySelectorAll('.nav-btn');
    const activeClasses = ['bg-gradient-to-r', 'from-purple-600', 'to-indigo-600', 'text-white', 'shadow-lg', 'border-transparent'];
    const inactiveClasses = ['bg-white/10', 'border', 'border-white/20', 'text-white/80', 'hover:bg-white/20', 'hover:text-white'];

    // Resetear todos los botones a su estado inactivo
    navButtons.forEach(button => {
        button.classList.remove(...activeClasses);
        button.classList.add(...inactiveClasses);
    });

    // Resaltar el botón activo (el que se acaba de presionar)
    if (activeButton) {
        // Primero removemos las clases de inactivo y hover para que no interfieran
        activeButton.classList.remove(...inactiveClasses);
        // Luego añadimos las clases de activo
        activeButton.classList.add(...activeClasses);
    }

    // Scroll suave al contenido
    if (sectionToScrollTo && sectionToScrollTo !== document.body) {
        sectionToScrollTo.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    } else if (sectionToScrollTo === document.body) {
        // Scroll al inicio para la sección 'inicio'
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Función para ir a la página detallada del curso
function goToCourseDetail() {
    // Se necesita un objeto de evento simulado para que `showSection` funcione correctamente
    // al no ser llamado desde un clic directo en un botón de navegación.
    const fakeEvent = { currentTarget: document.querySelector('.nav-btn[data-section="cursos"]') };
    showSection('curso-detalle', fakeEvent);
}

// Función para mostrar el detalle de una semana
function showWeekDetail(title, description, contentHtml = '') {
    // Ocultar la vista del temario y mostrar la del detalle de la semana
    showSection('semana-detalle');

    // Poblar el contenido dinámicamente
    document.getElementById('semana-detalle-titulo').textContent = title;
    document.getElementById('semana-detalle-descripcion').textContent = description;

    // Poblar el contenido HTML enriquecido si se proporciona
    const contentContainer = document.getElementById('semana-detalle-contenido');
    if (contentHtml) {
        contentContainer.innerHTML = contentHtml;
        // Aplicar resaltado de sintaxis a los nuevos bloques de código
        contentContainer.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    } else {
        contentContainer.innerHTML = '<p>El contenido detallado para esta semana estará disponible próximamente.</p>';
    }
}

// Función para volver al temario desde el detalle de la semana
function backToSyllabus() {
    // Llama a goToCourseDetail para volver a la vista del curso y mantener el botón de nav resaltado
    goToCourseDetail();
}
// Función para alternar el estado de las unidades

// --- Pyodide (Ejecución de Python en el navegador) ---
let pyodide = null;
let isPyodideLoading = false;

async function loadPyodideIfNotLoaded() {
    if (pyodide) return; // Si ya está cargado, no hacer nada.
    if (isPyodideLoading) return; // Si ya se está cargando, esperar.

    isPyodideLoading = true;
    showToast('Inicializando intérprete de Python...', 'info');
    try {
        pyodide = await loadPyodide();
        // Cargar paquetes comunes de antemano para mejorar el rendimiento
        showToast('Cargando paquetes (numpy, scipy, matplotlib)...', 'info');
        await pyodide.loadPackage(['numpy', 'scipy', 'matplotlib']);
        showToast('¡Intérprete listo! Ya puedes ejecutar el código.', 'success');
    } catch (error) {
        console.error("Error al cargar Pyodide:", error);
        showToast('Error al cargar el intérprete de Python.', 'error');
    } finally {
        isPyodideLoading = false;
    }
}

async function runPythonCode(button) {
    await loadPyodideIfNotLoaded();
    if (!pyodide) {
        showToast('El intérprete de Python no está listo.', 'error');
        return;
    }

    const preElement = button.closest('.bg-gray-900').querySelector('pre');
    const code = preElement.querySelector('code').innerText;
    const outputElement = button.closest('.bg-gray-900').querySelector('.python-output');

    button.disabled = true;
    button.textContent = 'Ejecutando...';
    outputElement.innerHTML = '<span class="text-yellow-400">Ejecutando código...</span>';

    try {
        await pyodide.loadPackagesFromImports(code);
        let capturedOutput = [];
        pyodide.setStdout({
            batched: (str) => {
                capturedOutput.push(str);
            }
        });

        let output = await pyodide.runPythonAsync(code);
        pyodide.setStdout({});

        let finalOutput = capturedOutput.join('\n');
        if (output !== undefined) {
            finalOutput += (finalOutput ? '\n' : '') + String(output);
        }
        outputElement.textContent = finalOutput || '(No hay salida para mostrar)';
    } catch (err) {
        outputElement.innerHTML = `<span class="text-red-400">${String(err)}</span>`;
    } finally {
        button.disabled = false;
        button.textContent = '▶ Ejecutar';
    }
}

function copyCode(button) {
    const preElement = button.closest('.bg-gray-900').querySelector('pre');
    const code = preElement.querySelector('code').innerText;

    navigator.clipboard.writeText(code).then(() => {
        showToast('¡Código copiado!', 'success');
    }).catch(err => {
        console.error('Error al copiar el código: ', err);
        showToast('Error al copiar', 'error');
    });
}

function toggleUnitStatus(checkbox, unitId) {
    const statusSpan = document.getElementById(unitId + '-status');
    const parentDiv = checkbox.closest('.border')?.querySelector('div');

    if (!statusSpan || !parentDiv) return;

    if (checkbox.checked) {
        // Marcar como completado
        statusSpan.textContent = 'Completado ✓';
        statusSpan.className = 'bg-green-500 text-white px-2 py-1 rounded text-xs';
        parentDiv.className = 'bg-green-50 p-4 border-b border-green-200';
        checkbox.className = 'w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2';
    } else {
        // Marcar como pendiente
        statusSpan.textContent = 'Pendiente';
        statusSpan.className = 'bg-gray-500 text-white px-2 py-1 rounded text-xs';
        parentDiv.className = 'bg-gray-50 p-4 border-b border-gray-200';
        checkbox.className = 'w-4 h-4 text-gray-600 bg-gray-100 border-gray-300 rounded focus:ring-gray-500 focus:ring-2';
    }
}

async function runCustomPythonCode() {
    await loadPyodideIfNotLoaded();
    if (!pyodide) {
        showToast('El intérprete de Python no está listo.', 'error');
        return;
    }

    const codeInput = document.getElementById('python-code-input');
    const outputElement = document.getElementById('custom-python-output');
    const runButton = document.getElementById('run-custom-python-btn');
    const code = codeInput.value;

    if (!code.trim()) {
        outputElement.innerHTML = '<span class="text-yellow-400">(No hay código para ejecutar)</span>';
        return;
    }

    runButton.disabled = true;
    runButton.innerHTML = 'Ejecutando...';
    outputElement.innerHTML = '<span class="text-yellow-400">Ejecutando código...</span>';

    try {
        await pyodide.loadPackagesFromImports(code);

        // Redirigir la salida estándar (stdout) para capturar los prints
        let capturedOutput = [];
        pyodide.setStdout({
            batched: (str) => {
                capturedOutput.push(str);
            }
        });

        let output = await pyodide.runPythonAsync(code);

        // Restaurar la salida estándar
        pyodide.setStdout({});

        let finalOutput = capturedOutput.join('\n');
        if (output !== undefined) {
            finalOutput += (finalOutput ? '\n' : '') + String(output);
        }
        outputElement.textContent = finalOutput || '(No hay salida para mostrar)';
    } catch (err) {
        outputElement.innerHTML = `<span class="text-red-400">${String(err)}</span>`;
    } finally {
        runButton.disabled = false;
        runButton.innerHTML = '▶ Ejecutar';
    }
}

// --- Función para leer texto en voz alta usando la Web Speech API ---
let speechState = {
    utterance: null,
    currentButton: null,
    voices: []
};

function initializeSpeech() {
    if (typeof speechSynthesis === 'undefined') return;

    function populateVoiceList() {
        speechState.voices = speechSynthesis.getVoices();
    }

    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
}

function updateSpeechButtonIcon(button, state) { // 'play', 'pause', 'stop'
    const playIcon = button.querySelector('.speak-icon-play');
    const pauseIcon = button.querySelector('.speak-icon-pause');
    const stopIcon = button.querySelector('.speak-icon-stop');

    [playIcon, pauseIcon, stopIcon].forEach(icon => icon && icon.classList.add('hidden'));

    if (state === 'pause') {
        pauseIcon && pauseIcon.classList.remove('hidden');
    } else if (state === 'stop') {
        stopIcon && stopIcon.classList.remove('hidden');
    } else { // play
        playIcon && playIcon.classList.remove('hidden');
    }
}

function manageSpeech(button, textProvider) {
    if (!('speechSynthesis' in window)) {
        showToast('Tu navegador no soporta la síntesis de voz.', 'warning');
        return;
    }

    const synth = window.speechSynthesis;

    // Si se presiona un botón diferente mientras algo se está reproduciendo o pausado,
    // cancela la locución anterior y resetea su ícono.
    if (speechState.currentButton && speechState.currentButton !== button) {
        updateSpeechButtonIcon(speechState.currentButton, 'play');
        synth.cancel();
    }

    // Si se hace clic en el mismo botón que está hablando, se pausa.
    if (synth.speaking && speechState.currentButton === button) {
        synth.pause();
        updateSpeechButtonIcon(button, 'stop'); // 'stop' se usa como ícono para reanudar
        return;

        // Si se hace clic en el mismo botón que está pausado, se reanuda.
    } else if (synth.paused && speechState.currentButton === button) {
        synth.resume();
        updateSpeechButtonIcon(button, 'pause');
    } else {
        // En cualquier otro caso (iniciar una nueva lectura o cambiar de una a otra),
        // se cancela todo lo anterior y se empieza de nuevo.
        synth.cancel();

        speechState.currentButton = button;

        const text = textProvider();
        speechState.utterance = new SpeechSynthesisUtterance(text);
        const spanishVoice = speechState.voices.find(voice => voice.lang.startsWith('es'));
        if (spanishVoice) {
            speechState.utterance.voice = spanishVoice;
        }

        speechState.utterance.onstart = () => {
            updateSpeechButtonIcon(button, 'pause');
        };

        speechState.utterance.onend = () => {
            updateSpeechButtonIcon(button, 'play');
            speechState.currentButton = null;
        };

        synth.speak(speechState.utterance);
    }
}


// Función para animar elementos al hacer scroll
function animateOnScroll() {
    const elements = document.querySelectorAll('.card-hover, .certification-card');

    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;

        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('animate-fade-in');
        }
    });
}

// Función para notificaciones toast
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
    toast.textContent = message;
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';

    document.body.appendChild(toast);

    // Animar entrada
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 100);

    // Remover después de 3 segundos
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
    const defaultButton = document.querySelector('button[data-section="inicio"]');
    showSection('inicio', { currentTarget: defaultButton });

    // Animar elementos al hacer scroll
    window.addEventListener('scroll', animateOnScroll);

    // Manejar clicks en botones de navegación
    // Se usa document en lugar de un selector específico para que funcione
    // con botones agregados dinámicamente o en secciones ocultas.
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', function (event) {
            const sectionId = this.dataset.section;
            if (sectionId) { // Asegurarse de que el botón tiene una sección de destino
                showSection(sectionId, event);
            }
        });
    });

    // Manejar click en botón para ir a detalle de curso
    const courseDetailButton = document.getElementById('goToCourseDetailBtn');
    if (courseDetailButton) {
        courseDetailButton.addEventListener('click', (e) => {
            goToCourseDetail();
        });
    }

    // Mostrar mensaje de bienvenida
    setTimeout(() => {
        showToast('¡Bienvenido a tu Dashboard! 🎉', 'success');
    }, 1000);

    // --- Tooltip para el botón del editor de Python ---
    const openEditorBtn = document.getElementById('open-python-editor-btn');
    const runnerTooltip = document.getElementById('runner-tooltip');

    if (openEditorBtn && runnerTooltip) {
        // Mostrar el tooltip temporalmente al cargar la página
        setTimeout(() => {
            runnerTooltip.classList.remove('hidden', 'opacity-0');
        }, 2000); // Aparece después de 2 segundos

        // Ocultar después de unos segundos
        setTimeout(() => {
            runnerTooltip.classList.add('opacity-0');
            setTimeout(() => runnerTooltip.classList.add('hidden'), 300);
        }, 7000); // Se mantiene visible por 5 segundos

        // Lógica para mostrar/ocultar con el cursor
        openEditorBtn.addEventListener('mouseenter', () => {
            runnerTooltip.classList.remove('hidden', 'opacity-0');
        });
        openEditorBtn.addEventListener('mouseleave', () => {
            runnerTooltip.classList.add('opacity-0');
            setTimeout(() => runnerTooltip.classList.add('hidden'), 300);
        });
    }
});

// --- Event Listeners para botones de lectura de texto ---
document.addEventListener('DOMContentLoaded', function () {
    initializeSpeech(); // Cargar voces

    // Botón para leer descripción del curso
    const speakCourseBtn = document.getElementById('speak-course-desc-btn');
    if (speakCourseBtn) {
        speakCourseBtn.addEventListener('click', (e) => {
            manageSpeech(e.currentTarget, () => {
                const content = document.getElementById('course-description-content');
                const paragraphs = content.querySelectorAll('p');
                return Array.from(paragraphs).map(p => p.textContent).join(' ');
            });
        });
    }

    // --- Event Listeners para el editor de Python flotante ---
    const openBtn = document.getElementById('open-python-editor-btn');
    const closeBtn = document.getElementById('close-python-editor-btn');
    const runBtn = document.getElementById('run-custom-python-btn');
    const speakBtn = document.getElementById('speak-output-btn');
    const editorPanel = document.getElementById('python-editor-panel');

    openBtn.addEventListener('click', () => {
        editorPanel.classList.toggle('hidden');
        // Cargar Pyodide en segundo plano al abrir el panel
        loadPyodideIfNotLoaded();
    });

    closeBtn.addEventListener('click', () => {
        editorPanel.classList.add('hidden');
    });

    runBtn.addEventListener('click', runCustomPythonCode);

    // El botón de hablar en el editor de python no tiene un ID, lo buscamos por su atributo.
    const speakOutputBtn = document.getElementById('speak-output-btn');
    speakOutputBtn.addEventListener('click', (e) => {
        manageSpeech(e.currentTarget, () => document.getElementById('custom-python-output').textContent);
    });

    // Botón para leer contenido de la semana (manejador de eventos delegado)
    // Se asigna al contenedor que no cambia (body) para que funcione con el botón que es parte del contenido dinámico.
    document.body.addEventListener('click', function (e) {
        if (e.target.closest('#speak-week-content-btn')) {
            const button = e.target.closest('#speak-week-content-btn');
            manageSpeech(button, () => {
                const title = document.getElementById('semana-detalle-titulo').textContent;
                const description = document.getElementById('semana-detalle-descripcion').textContent;
                const contentContainer = document.getElementById('semana-detalle-contenido');
                const mainContent = contentContainer.innerText || contentContainer.textContent;
                return `${title}. ${description}. A continuación, el contenido principal: ${mainContent}`;
            });
        }
    });
});


// Funciones de utilidad
const utils = {
    // Formatear fecha
    formatDate: (date) => {
        return new Intl.DateTimeFormat('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },

    // Calcular promedio
    calculateAverage: (grades) => {
        const sum = grades.reduce((a, b) => a + b, 0);
        return (sum / grades.length).toFixed(1);
    },

    // Generar color aleatorio
    randomColor: () => {
        const colors = ['blue', 'green', 'purple', 'pink', 'yellow', 'red', 'indigo'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
};

// Prevenir errores de consola
window.addEventListener('error', function (e) {
    console.log('Error capturado:', e.message);
});