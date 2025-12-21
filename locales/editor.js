const BASE_LANG = 'es';
const LANGUAGES = [
    { code: 'es', name: 'Espanol' },
    { code: 'en', name: 'Ingles' },
    { code: 'de', name: 'Aleman' },
    { code: 'ca', name: 'Catala' },
    { code: 'gl', name: 'Galego' },
    { code: 'eu', name: 'Euskara' },
];

const rowsContainer = document.getElementById('rows');
const rowTemplate = document.getElementById('row-template');
const languageSelect = document.getElementById('language-select');
const searchInput = document.getElementById('search-input');
const missingOnly = document.getElementById('missing-only');
const sameOnly = document.getElementById('same-only');
const statsEl = document.getElementById('stats');
const footerStatus = document.getElementById('footer-status');
const reloadButton = document.getElementById('reload-button');
const downloadButton = document.getElementById('download-button');
const copyButton = document.getElementById('copy-button');

const cloneDeep = typeof structuredClone === 'function'
    ? structuredClone
    : (value) => JSON.parse(JSON.stringify(value));

const state = {
    base: null,
    target: null,
    rows: [],
    extraKeys: [],
};

function buildRows() {
    rowsContainer.innerHTML = '';
    state.rows.forEach((row) => {
        const fragment = rowTemplate.content.cloneNode(true);
        const rowEl = fragment.querySelector('.row');
        const keyEl = fragment.querySelector('.key');
        const baseEl = fragment.querySelector('.base');
        const inputEl = fragment.querySelector('textarea');

        keyEl.textContent = row.key;
        baseEl.textContent = row.baseValue;
        inputEl.value = row.targetValue;

        rowEl.dataset.key = row.key.toLowerCase();
        rowEl.dataset.base = String(row.baseValue).toLowerCase();
        rowEl.dataset.target = String(row.targetValue).toLowerCase();

        inputEl.addEventListener('input', () => {
            row.targetValue = inputEl.value;
            rowEl.dataset.target = row.targetValue.toLowerCase();
            updateRowState(row, rowEl);
            updateStats();
            applyFilters();
        });

        row.element = rowEl;
        row.input = inputEl;
        updateRowState(row, rowEl);

        rowsContainer.appendChild(fragment);
    });
}

function updateRowState(row, rowEl) {
    const isMissing = String(row.targetValue).trim() === '';
    const isChanged = row.targetValue !== row.baseValue;
    rowEl.classList.toggle('is-missing', isMissing);
    rowEl.classList.toggle('is-changed', isChanged);
}

function updateStats() {
    const missingCount = state.rows.filter((row) => String(row.targetValue).trim() === '').length;
    const changedCount = state.rows.filter((row) => row.targetValue !== row.baseValue).length;
    const total = state.rows.length;
    const extras = state.extraKeys.length;

    statsEl.textContent = `Claves: ${total} · Vacias: ${missingCount} · Diferentes: ${changedCount} · Extras: ${extras}`;
}

function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const onlyMissing = missingOnly.checked;
    const onlySame = sameOnly.checked;

    state.rows.forEach((row) => {
        const rowEl = row.element;
        const isEditing = document.activeElement === row.input;
        const matchesSearch =
            !query ||
            rowEl.dataset.key.includes(query) ||
            rowEl.dataset.base.includes(query) ||
            rowEl.dataset.target.includes(query);
        const matchesMissing = !onlyMissing || String(row.targetValue).trim() === '';
        const matchesSame = !onlySame || row.targetValue === row.baseValue;

        rowEl.style.display = matchesSearch && (matchesMissing || isEditing) && (matchesSame || isEditing)
            ? ''
            : 'none';
    });
}

function buildOutput() {
    const output = cloneDeep(state.target || {});

    state.rows.forEach((row) => {
        output[row.key] = row.targetValue;
    });

    return output;
}

async function loadTranslations(lang) {
    const baseResp = await fetch(`./${BASE_LANG}.json`, { cache: 'no-store' });
    if (!baseResp.ok) throw new Error('No se pudo cargar la base en espanol.');
    const base = await baseResp.json();

    let target = {};
    const targetResp = await fetch(`./${lang}.json`, { cache: 'no-store' });
    if (targetResp.ok) {
        target = await targetResp.json();
    }

    return { base, target };
}

function rebuildRows(base, target) {
    state.rows = [];
    state.extraKeys = [];

    Object.keys(base).forEach((key) => {
        const row = {
            key,
            baseValue: base[key] ?? '',
            targetValue: target[key] ?? '',
            element: null,
            input: null,
        };
        state.rows.push(row);
    });

    Object.keys(target).forEach((key) => {
        if (!(key in base)) {
            state.extraKeys.push(key);
        }
    });

    buildRows();
    updateStats();
    applyFilters();
}

async function refresh() {
    const lang = languageSelect.value;

    if (!lang) return;
    footerStatus.textContent = 'Cargando traducciones...';

    const { base, target } = await loadTranslations(lang);
    state.base = base;
    state.target = target;

    rebuildRows(base, target);
    footerStatus.textContent = `Editando: ${lang}`;
}

function downloadJson(jsonText) {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const lang = languageSelect.value || BASE_LANG;
    link.download = `qplay_${lang}.json`;
    link.click();
    URL.revokeObjectURL(url);
    footerStatus.textContent = `Descarga iniciada: qplay_${lang}.json`;
}

async function copyJson() {
    const jsonText = `${JSON.stringify(buildOutput(), null, 2)}\n`;
    await navigator.clipboard.writeText(jsonText);
    footerStatus.textContent = 'JSON copiado al portapapeles.';
}

function attachEvents() {
    searchInput.addEventListener('input', applyFilters);
    missingOnly.addEventListener('change', applyFilters);
    sameOnly.addEventListener('change', applyFilters);
    reloadButton.addEventListener('click', refresh);
    downloadButton.addEventListener('click', () => downloadJson(`${JSON.stringify(buildOutput(), null, 2)}\n`));
    copyButton.addEventListener('click', copyJson);
    languageSelect.addEventListener('change', refresh);
}

function showError(error) {
    console.error(error);
    statsEl.textContent = 'Error al cargar las traducciones.';
    footerStatus.textContent = error.message || 'No se pudo iniciar el editor.';
}

async function init() {
    attachEvents();

    languageSelect.innerHTML = '';
    LANGUAGES.forEach((lang) => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = `${lang.name} (${lang.code})`;
        languageSelect.appendChild(option);
    });

    const defaultLang = LANGUAGES.find((lang) => lang.code !== BASE_LANG)?.code || BASE_LANG;
    languageSelect.value = defaultLang;

    await refresh();
}

init().catch(showError);
