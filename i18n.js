// Variable para almacenar las traducciones cargadas
let translations = {};

// Idioma por defecto de la aplicación
const defaultLang = 'es';

/**
 * Carga el archivo de traducción para un idioma específico.
 * @param {string} lang - El código del idioma (ej: 'en', 'es').
 */
async function loadTranslations(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`No se pudo cargar el archivo de idioma: ${lang}`);
        }
        translations = await response.json();
    } catch (error) {
        console.error(error);
        // Si falla la carga, intenta cargar el idioma por defecto.
        if (lang !== defaultLang) {
            await loadTranslations(defaultLang);
        }
    }
}

/**
 * Traduce todos los elementos estáticos de la página.
 * Busca elementos con el atributo 'data-i18n-key' y reemplaza su contenido.
 */
function translatePage() {
    // Traduce todos los elementos marcados con la clave
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.getAttribute('data-i18n-key');
        const translation = translations[key];
        if (translation !== undefined) {
            // Comprueba si el elemento es un input o textarea para usar .placeholder
            if (el.placeholder !== undefined) {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        }
    });

    // Traduce también el título de la página y los atributos title
    document.title = translations.page_title || 'QPlay';
    document.querySelectorAll('[data-i18n-title-key]').forEach(el => {
        const key = el.getAttribute('data-i18n-title-key');
        const translation = translations[key];
        if (translation !== undefined) {
            el.title = translation;
        }
    });
}


/**
 * Establece el idioma de la aplicación.
 * Carga las traducciones, las aplica y guarda la preferencia del usuario.
 * @param {string} lang - El código del idioma a establecer.
 */
async function setLanguage(lang) {
    await loadTranslations(lang);
    translatePage();
    
    // Actualiza el atributo 'lang' de la etiqueta <html> para accesibilidad
    document.documentElement.lang = translations.lang_code || lang;
    
    // Guarda la preferencia en localStorage para futuras visitas
    localStorage.setItem('qplay_language', lang);
}

/**
 * Obtiene un texto traducido para usarlo desde JavaScript.
 * Admite el reemplazo de variables dinámicas.
 * @param {string} key - La clave del texto a traducir.
 * @param {object} placeholders - Un objeto con los valores a reemplazar (ej: {current: 1, total: 10}).
 * @returns {string} El texto traducido.
 */
function t(key, placeholders = {}) {
    let text = translations[key] || key; // Si no encuentra traducción, devuelve la clave
    for (const placeholder in placeholders) {
        text = text.replace(new RegExp(`{${placeholder}}`, 'g'), placeholders[placeholder]);
    }
    return text;
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const availableLangs = ['en', 'es', 'de', 'ca', 'gl', 'eu'];
    const defaultLang = 'es';

    const langSelectorContainer = document.getElementById('lang-selector');

    if (langSelectorContainer) {
        availableLangs.forEach(lang => {
            const button = document.createElement('button');
            button.dataset.lang = lang;
            button.textContent = lang.toUpperCase();
            button.className = 'px-3 py-1 text-sm font-bold rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white';
            langSelectorContainer.appendChild(button);
        });

        langSelectorContainer.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-lang]');
            if (button) {
                setLanguage(button.dataset.lang);
            }
        });
    }

    // --- LÓGICA DE DETECCIÓN DE IDIOMA MODIFICADA ---
    const savedLang = localStorage.getItem('qplay_language');
    const browserLang = navigator.language.split('-')[0];
    
    let initialLang = defaultLang;

    if (savedLang) {
        // 1. Prioridad: el idioma guardado por el usuario.
        initialLang = savedLang;
    } else if (availableLangs.includes(browserLang)) {
        // 2. Prioridad: el idioma del navegador, si está disponible.
        initialLang = browserLang;
    }
    // 3. Si no, se usa el idioma por defecto ('es').
    
    setLanguage(initialLang);
});
