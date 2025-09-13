// --- Type definitions for Electron APIs from preload.js ---
declare global {
    interface Window {
        windowControls: {
            minimize: () => void;
            maximize: () => Promise<boolean>;
            close: () => void;
            isMaximized: () => Promise<boolean>;
            onMaximizeChanged: (callback: (maximized: boolean) => void) => void;
        };
        api: {
            openImages: () => Promise<string[]>;
            selectOutputDir: () => Promise<string | null>;
            saveFile: (args: { dataUrl: string; directory: string; originalName: string; format: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
            openFolder: (path: string) => void;
        };
    }
}

// --- App State ---
const AppState = {
    images: [] as { name: string; path: string; originalWidth: number; originalHeight: number }[],
    outputDir: null as string | null,
    logoFile: null as { name: string; path: string; element: HTMLImageElement } | null,
    settings: {} as any,
    presets: {} as { [key: string]: any },
    selectedIcon: { class: 'fa-solid fa-copyright', unicode: '\u00a9' }
};

// --- Constants ---
const faIcons = [
    { class: 'fa-solid fa-copyright', unicode: '\u00a9' }, { class: 'fa-solid fa-camera', unicode: '\uf030' },
    { class: 'fa-solid fa-image', unicode: '\uf03e' }, { class: 'fa-solid fa-star', unicode: '\uf005' },
    { class: 'fa-solid fa-heart', unicode: '\uf004' }, { class: 'fa-solid fa-lock', unicode: '\uf023' },
    { class: 'fa-solid fa-shield-halved', unicode: '\uf3ed' }, { class: 'fa-solid fa-circle-check', unicode: '\uf058' },
    { class: 'fa-solid fa-triangle-exclamation', unicode: '\uf071' }, { class: 'fa-solid fa-fire', unicode: '\uf06d' },
    { class: 'fa-solid fa-signature', unicode: '\uf5b7' }, { class: 'fa-solid fa-info', unicode: '\uf129' },
];
const emojis = ['©️', '®️', '™️', '❤️', '⭐️', '✅', '🔒', '📷', '🖼️', '✨', '🔥', '💧'];

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    setupWindowControls();
    setupEventListeners();
    setupRangeValueDisplays();
    setupCollapsibleGroups();
    loadPresets();
    updateSettings();
    toggleControlGroups();
    populatePickers();
});

// --- Window Controls ---
function setupWindowControls() {
    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');

    async function refreshMaxButton() {
        try {
            const maximized = await window.windowControls.isMaximized();
            document.body.classList.toggle('maximized', maximized);
            const maxIcon = document.getElementById('max-icon');
            if (maximized) {
                maxIcon?.classList.remove('fa-window-maximize');
                maxIcon?.classList.add('fa-window-restore');
                maxBtn!.title = 'Restore';
            } else {
                maxIcon?.classList.remove('fa-window-restore');
                maxIcon?.classList.add('fa-window-maximize');
                maxBtn!.title = 'Maximize';
            }
        } catch {}
    }

    minBtn?.addEventListener('click', () => window.windowControls.minimize());
    maxBtn?.addEventListener('click', () => window.windowControls.maximize());
    closeBtn?.addEventListener('click', () => window.windowControls.close());
    window.windowControls.onMaximizeChanged(refreshMaxButton);
    document.getElementById('window-title')!.querySelector('span')!.textContent = 'Firemark';
    refreshMaxButton();
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Main UI
    const dropzone = document.getElementById('dropzone')!;
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
    document.getElementById('add-images-btn')!.addEventListener('click', handleAddImages);
    document.getElementById('clear-images-btn')!.addEventListener('click', handleClearImages);
    document.getElementById('output-dir-btn')!.addEventListener('click', handleSelectOutputDir);
    document.getElementById('start-btn')!.addEventListener('click', processImages);
    document.getElementById('logo-select-btn')!.addEventListener('click', handleSelectLogo);
    document.getElementById('image-grid')!.addEventListener('click', handleGridClick);

    // Settings listeners
    document.querySelectorAll('.sidebar-content input, .sidebar-content select').forEach(el => {
        el.addEventListener('input', updateSettingsAndPreview);
        el.addEventListener('change', updateSettingsAndPreview);
    });
    document.querySelectorAll('.sidebar-content button').forEach(el => {
        el.addEventListener('click', (e) => {
             const target = e.currentTarget as HTMLElement;
             if (target.closest('.position-grid')) {
                target.closest('.position-grid')!.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                updateSettingsAndPreview();
             } else if (target.closest('.text-styles')) {
                target.classList.toggle('active');
                updateSettingsAndPreview();
             }
        });
    });

    document.querySelectorAll('.toggle-switch input').forEach(el => el.addEventListener('change', toggleControlGroups));
    
    // Pickers
    document.getElementById('icon-picker-btn')!.addEventListener('click', () => document.getElementById('icon-picker-modal')!.classList.remove('hidden'));
    document.getElementById('emoji-picker-btn')!.addEventListener('click', () => document.getElementById('emoji-picker-modal')!.classList.remove('hidden'));
    document.querySelectorAll('.modal-backdrop').forEach(el => el.addEventListener('click', () => {
        document.getElementById('icon-picker-modal')!.classList.add('hidden');
        document.getElementById('emoji-picker-modal')!.classList.add('hidden');
    }));

    // Presets
    document.getElementById('preset-save-btn')!.addEventListener('click', savePreset);
    document.getElementById('preset-delete-btn')!.addEventListener('click', deletePreset);
    document.getElementById('presets-select')!.addEventListener('change', applyPreset);
    
    // Preview Modal
    setupPreviewModalListeners();
}

function updateSettingsAndPreview() {
    updateSettings();
    if (previewState.visible) {
        drawPreview();
    }
}

// --- Image Handling & UI ---
function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.add('dragover');
}

function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.remove('dragover');
}

async function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.remove('dragover');
    if (!e.dataTransfer) return;
    const files = [...e.dataTransfer.files]
        .filter(f => f.type.startsWith('image/'))
        .map(f => ({ name: f.name, path: (f as any).path }));
    await addImages(files);
}

async function handleAddImages() {
    const filePaths = await window.api.openImages();
    if (!filePaths || filePaths.length === 0) return;
    const files = filePaths.map(p => ({ name: p.split(/[/\\]/).pop()!, path: p }));
    await addImages(files);
}

async function addImages(newImages: { name: string, path: string }[]) {
    for (const image of newImages) {
        if (!AppState.images.some(existing => existing.path === image.path)) {
            const dimensions = await getImageDimensions(image.path);
            AppState.images.push({ ...image, ...dimensions });
        }
    }
    renderImageGrid();
    updateStartButtonState();
}

function handleClearImages() {
    AppState.images = [];
    renderImageGrid();
    updateStartButtonState();
}

function renderImageGrid() {
    const grid = document.getElementById('image-grid')!;
    const dropzone = document.getElementById('dropzone')!;
    const actions = document.getElementById('image-grid-actions')!;

    if (AppState.images.length === 0) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
        actions.classList.add('hidden');
        dropzone.classList.remove('hidden');
        return;
    }
    dropzone.classList.add('hidden');
    grid.classList.remove('hidden');
    actions.classList.remove('hidden');
    grid.innerHTML = '';
    AppState.images.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.dataset.index = String(index);
        const img = document.createElement('img');
        img.src = image.path;
        img.alt = image.name;
        item.appendChild(img);
        grid.appendChild(item);
    });
}

// --- Settings & Controls ---
function updateSettings() {
    const getPosition = (containerId: string) => {
        const activeBtn = document.querySelector(`#${containerId} button.active`) as HTMLElement;
        if (!activeBtn) return { x: 0.5, y: 0.5 };
        const pos = activeBtn.dataset.position!;
        const map: { [key: string]: { x: number, y: number } } = {
            'top-left': { x: 0, y: 0 }, 'top-center': { x: 0.5, y: 0 }, 'top-right': { x: 1, y: 0 },
            'center-left': { x: 0, y: 0.5 }, 'center': { x: 0.5, y: 0.5 }, 'center-right': { x: 1, y: 0.5 },
            'bottom-left': { x: 0, y: 1 }, 'bottom-center': { x: 0.5, y: 1 }, 'bottom-right': { x: 1, y: 1 },
        };
        return map[pos];
    };
    const getValue = (id: string, isInt = false, isFloat = false) => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (isInt) return parseInt(el.value, 10) || 0;
        if (isFloat) return parseFloat(el.value) || 0;
        return el.value;
    };
    const isChecked = (id: string) => (document.getElementById(id) as HTMLInputElement).checked;
    const isActive = (id: string) => document.getElementById(id)!.classList.contains('active');

    AppState.settings = {
        text: {
            enabled: isChecked('text-enable'),
            content: getValue('text-content'),
            fontFamily: getValue('text-font-family'),
            fontSize: getValue('text-font-size', true),
            bold: isActive('text-bold'),
            italic: isActive('text-italic'),
            color: getValue('text-color'),
            opacity: getValue('text-opacity', false, true),
            padding: getValue('text-padding', true),
            gradient: {
                enabled: isChecked('text-gradient-enable'),
                color: getValue('text-gradient-color'),
                direction: getValue('text-gradient-direction'),
            },
            stroke: {
                enabled: isChecked('text-stroke-enable'),
                color: getValue('text-stroke-color'),
                width: getValue('text-stroke-width', true),
            },
            shadow: {
                enabled: isChecked('text-shadow-enable'),
                color: getValue('text-shadow-color'),
                blur: getValue('text-shadow-blur', true),
            },
            position: AppState.settings.text?.position || getPosition('text-position'),
        },
        logo: {
            enabled: isChecked('logo-enable'),
            size: getValue('logo-size', true),
            opacity: getValue('logo-opacity', false, true),
            padding: getValue('logo-padding', true),
            position: AppState.settings.logo?.position || getPosition('logo-position'),
        },
        icon: {
            enabled: isChecked('icon-enable'),
            size: getValue('icon-size', true),
            color: getValue('icon-color'),
            opacity: getValue('icon-opacity', false, true),
            padding: getValue('icon-padding', true),
            position: AppState.settings.icon?.position || getPosition('icon-position'),
        },
        tile: { enabled: isChecked('tile-enable'), useLogo: isChecked('tile-use-logo'), content: getValue('tile-text-content'), fontSize: getValue('tile-font-size', true), opacity: getValue('tile-opacity', false, true), rotation: getValue('tile-rotation', true), spacing: getValue('tile-spacing', true), },
        pattern: { enabled: isChecked('pattern-enable'), type: getValue('pattern-type'), color1: getValue('pattern-color1'), color2: getValue('pattern-color2'), opacity: getValue('pattern-opacity', false, true), size: getValue('pattern-size', true), },
        frame: { enabled: isChecked('frame-enable'), style: getValue('frame-style'), color: getValue('frame-color'), width: getValue('frame-width', true), padding: getValue('frame-padding', true), },
        effects: {
            blur: { enabled: isChecked('effect-blur-enable'), radius: getValue('effect-blur-radius', false, true) },
            noise: { enabled: isChecked('effect-noise-enable'), amount: getValue('effect-noise-amount', true) },
            sharpen: { enabled: isChecked('effect-sharpen-enable'), amount: getValue('effect-sharpen-amount', false, true) },
        },
        output: { format: getValue('output-format'), quality: getValue('output-quality', false, true), resize: { mode: getValue('resize-mode'), width: getValue('resize-width', true), height: getValue('resize-height', true), } }
    };
    if (document.querySelector('#text-position .active')) AppState.settings.text.position = getPosition('text-position');
    if (document.querySelector('#logo-position .active')) AppState.settings.logo.position = getPosition('logo-position');
    if (document.querySelector('#icon-position .active')) AppState.settings.icon.position = getPosition('icon-position');
}

function applySettingsToUI(s: any) {
    const setValue = (id: string, value: any, type = 'value') => { if (value === undefined) return; const el = document.getElementById(id) as any; if (el) el[type] = value; };
    const setChecked = (id: string, value: boolean) => setValue(id, value, 'checked');
    const setActive = (id: string, value: boolean) => document.getElementById(id)?.classList.toggle('active', value);
    const setPosition = (id: string, pos: { x: number, y: number }) => {
        document.querySelectorAll(`#${id} button`).forEach(b => b.classList.remove('active'));
        const posStr = `${pos.y === 0 ? 'top' : pos.y === 0.5 ? 'center' : 'bottom'}-${pos.x === 0 ? 'left' : pos.x === 0.5 ? 'center' : 'right'}`;
        document.querySelector(`#${id} button[data-position="${posStr}"]`)?.classList.add('active');
    };

    // Text
    setChecked('text-enable', s.text.enabled); setValue('text-content', s.text.content); setValue('text-font-family', s.text.fontFamily); setValue('text-font-size', s.text.fontSize); setActive('text-bold', s.text.bold); setActive('text-italic', s.text.italic); setValue('text-color', s.text.color); setValue('text-opacity', s.text.opacity); setValue('text-padding', s.text.padding);
    setChecked('text-gradient-enable', s.text.gradient.enabled); setValue('text-gradient-color', s.text.gradient.color); setValue('text-gradient-direction', s.text.gradient.direction);
    setChecked('text-stroke-enable', s.text.stroke.enabled); setValue('text-stroke-color', s.text.stroke.color); setValue('text-stroke-width', s.text.stroke.width);
    setChecked('text-shadow-enable', s.text.shadow.enabled); setValue('text-shadow-color', s.text.shadow.color); setValue('text-shadow-blur', s.text.shadow.blur);
    if(s.text.position) setPosition('text-position', s.text.position);
    
    // Logo, Icon, Tile, Pattern, Frame, Effects, Output...
    setChecked('logo-enable', s.logo.enabled); setValue('logo-size', s.logo.size); setValue('logo-opacity', s.logo.opacity); setValue('logo-padding', s.logo.padding); if(s.logo.position) setPosition('logo-position', s.logo.position);
    setChecked('icon-enable', s.icon.enabled); setValue('icon-size', s.icon.size); setValue('icon-color', s.icon.color); setValue('icon-opacity', s.icon.opacity); setValue('icon-padding', s.icon.padding); if(s.icon.position) setPosition('icon-position', s.icon.position);
    setChecked('tile-enable', s.tile.enabled); setChecked('tile-use-logo', s.tile.useLogo); setValue('tile-text-content', s.tile.content); setValue('tile-font-size', s.tile.fontSize); setValue('tile-opacity', s.tile.opacity); setValue('tile-rotation', s.tile.rotation); setValue('tile-spacing', s.tile.spacing);
    setChecked('pattern-enable', s.pattern.enabled); setValue('pattern-type', s.pattern.type); setValue('pattern-color1', s.pattern.color1); setValue('pattern-color2', s.pattern.color2); setValue('pattern-opacity', s.pattern.opacity); setValue('pattern-size', s.pattern.size);
    setChecked('frame-enable', s.frame.enabled); setValue('frame-style', s.frame.style); setValue('frame-color', s.frame.color); setValue('frame-width', s.frame.width); setValue('frame-padding', s.frame.padding);
    setChecked('effect-blur-enable', s.effects.blur.enabled); setValue('effect-blur-radius', s.effects.blur.radius);
    setChecked('effect-noise-enable', s.effects.noise.enabled); setValue('effect-noise-amount', s.effects.noise.amount);
    setChecked('effect-sharpen-enable', s.effects.sharpen.enabled); setValue('effect-sharpen-amount', s.effects.sharpen.amount);
    setValue('output-format', s.output.format); setValue('output-quality', s.output.quality); setValue('resize-mode', s.output.resize.mode); setValue('resize-width', s.output.resize.width); setValue('resize-height', s.output.resize.height);

    toggleControlGroups();
    setupRangeValueDisplays();
}

// --- UI Helpers ---
function setupRangeValueDisplays() {
    const ranges = [
        { input: 'text-opacity', out: 'text-opacity-value', unit: '%', scale: 100, fixed: 0 }, { input: 'text-padding', out: 'text-padding-value', unit: 'px' }, { input: 'text-shadow-blur', out: 'text-shadow-blur-value', unit: 'px' }, { input: 'text-stroke-width', out: 'text-stroke-width-value', unit: 'px' },
        { input: 'logo-size', out: 'logo-size-value', unit: '%' }, { input: 'logo-opacity', out: 'logo-opacity-value', unit: '%', scale: 100, fixed: 0 }, { input: 'logo-padding', out: 'logo-padding-value', unit: 'px' },
        { input: 'icon-size', out: 'icon-size-value', unit: 'px' }, { input: 'icon-opacity', out: 'icon-opacity-value', unit: '%', scale: 100, fixed: 0 }, { input: 'icon-padding', out: 'icon-padding-value', unit: 'px' },
        { input: 'tile-opacity', out: 'tile-opacity-value', unit: '%', scale: 100, fixed: 0 }, { input: 'tile-rotation', out: 'tile-rotation-value', unit: '°' }, { input: 'tile-spacing', out: 'tile-spacing-value', unit: 'px' },
        { input: 'pattern-opacity', out: 'pattern-opacity-value', unit: '%', scale: 100, fixed: 0 }, { input: 'pattern-size', out: 'pattern-size-value', unit: 'px' },
        { input: 'frame-width', out: 'frame-width-value', unit: 'px' }, { input: 'frame-padding', out: 'frame-padding-value', unit: 'px' },
        { input: 'effect-blur-radius', out: 'effect-blur-radius-value', unit: 'px' }, { input: 'effect-noise-amount', out: 'effect-noise-amount-value', unit: '%' }, { input: 'effect-sharpen-amount', out: 'effect-sharpen-amount-value', unit: '%' , scale: 100, fixed: 0},
        { input: 'output-quality', out: 'output-quality-value', unit: '%', scale: 100, fixed: 0 },
    ];
    ranges.forEach(r => {
        const input = document.getElementById(r.input) as HTMLInputElement;
        const out = document.getElementById(r.out) as HTMLSpanElement;
        const update = () => {
            let value: number | string = parseFloat(input.value);
            if (r.scale) value *= r.scale;
            value = value.toFixed(r.fixed ?? 0);
            out.textContent = `${value}${r.unit}`;
        };
        input.addEventListener('input', update);
        update();
    });
}

function setupCollapsibleGroups() {
    document.querySelectorAll('.collapsible').forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            const body = header.nextElementSibling as HTMLElement;
            if (body) {
                body.classList.toggle('hidden');
            }
        });
    });
}

function toggleControlGroups() {
    const isChecked = (id: string) => (document.getElementById(id) as HTMLInputElement).checked;
    document.getElementById('text-gradient-controls')!.classList.toggle('hidden', !isChecked('text-gradient-enable'));
    document.getElementById('text-stroke-controls')!.classList.toggle('hidden', !isChecked('text-stroke-enable'));
    document.getElementById('text-shadow-controls')!.classList.toggle('hidden', !isChecked('text-shadow-enable'));
    document.getElementById('tile-text-options')!.style.display = isChecked('tile-use-logo') ? 'none' : 'grid';
    document.getElementById('quality-control')!.classList.toggle('hidden', (document.getElementById('output-format') as HTMLSelectElement).value === 'png');
    
    const mode = (document.getElementById('resize-mode') as HTMLSelectElement).value;
    const resizeControls = document.getElementById('resize-controls')!;
    resizeControls.classList.toggle('hidden', mode === 'none');
    (document.getElementById('resize-width') as HTMLElement).style.display = (mode === 'width' || mode === 'fit') ? 'block' : 'none';
    (document.getElementById('resize-height') as HTMLElement).style.display = (mode === 'height' || mode === 'fit') ? 'block' : 'none';

    updateSettingsAndPreview();
}

function populatePickers() {
    const iconGrid = document.getElementById('icon-picker-grid')!;
    faIcons.forEach(icon => {
        const btn = document.createElement('button');
        btn.innerHTML = `<i class="${icon.class}"></i>`;
        btn.addEventListener('click', () => {
            AppState.selectedIcon = icon;
            const display = document.getElementById('icon-display')!;
            display.innerHTML = `<i class="${icon.class}"></i><span>${icon.class.split(' ')[1]}</span>`;
            document.getElementById('icon-picker-modal')!.classList.add('hidden');
            updateSettingsAndPreview();
        });
        iconGrid.appendChild(btn);
    });

    const emojiGrid = document.getElementById('emoji-picker-grid')!;
    const textInput = document.getElementById('text-content') as HTMLInputElement;
    emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.addEventListener('click', () => {
            textInput.value += emoji;
            document.getElementById('emoji-picker-modal')!.classList.add('hidden');
            updateSettingsAndPreview();
        });
        emojiGrid.appendChild(btn);
    });
}

async function handleSelectOutputDir() {
    const dir = await window.api.selectOutputDir();
    if (dir) {
        AppState.outputDir = dir;
        document.getElementById('output-dir-path')!.textContent = dir;
        updateStartButtonState();
    }
}

async function handleSelectLogo() {
    const filePaths = await window.api.openImages();
    if (filePaths && filePaths.length > 0) {
        const file = { name: filePaths[0].split(/[/\\]/).pop()!, path: filePaths[0] };
        const logoImg = new Image();
        logoImg.src = file.path;
        logoImg.onload = () => {
            AppState.logoFile = { ...file, element: logoImg };
            document.getElementById('logo-filename')!.textContent = file.name;
            (document.getElementById('logo-preview') as HTMLImageElement)!.src = file.path;
            document.getElementById('logo-preview-container')!.classList.remove('hidden');
            updateSettingsAndPreview();
        };
    }
}

function updateStartButtonState() {
    (document.getElementById('start-btn') as HTMLButtonElement).disabled = !(AppState.images.length > 0 && AppState.outputDir);
}

// --- Presets Logic ---
function savePreset() {
    const name = prompt("Enter a name for this preset:");
    if (name && name.trim()) {
        const key = `firemark_preset_${name.trim()}`;
        localStorage.setItem(key, JSON.stringify(AppState.settings));
        loadPresets();
        (document.getElementById('presets-select') as HTMLSelectElement).value = key;
    }
}
function loadPresets() {
    const select = document.getElementById('presets-select') as HTMLSelectElement;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Select a preset...</option>';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('firemark_preset_')) {
            const name = key.replace('firemark_preset_', '');
            const option = document.createElement('option');
            option.value = key;
            option.textContent = name;
            select.appendChild(option);
        }
    }
    select.value = currentVal;
}
function applyPreset(e: Event) {
    const key = (e.target as HTMLSelectElement).value;
    if (key) {
        const settingsJSON = localStorage.getItem(key);
        if (settingsJSON) {
            const settings = JSON.parse(settingsJSON);
            applySettingsToUI(settings);
        }
    }
}
function deletePreset() {
    const select = document.getElementById('presets-select') as HTMLSelectElement;
    const key = select.value;
    if (key && confirm(`Are you sure you want to delete the "${key.replace('firemark_preset_', '')}" preset?`)) {
        localStorage.removeItem(key);
        loadPresets();
    }
}


// --- Processing Logic ---
async function processImages() {
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    const btnText = startBtn.querySelector('.btn-text')!;
    const btnSpinner = startBtn.querySelector('.btn-spinner')!;
    const progressContainer = document.getElementById('progress-container')!;
    
    startBtn.disabled = true;
    btnText.textContent = 'Processing...';
    btnSpinner.classList.remove('hidden');
    progressContainer.classList.remove('hidden');
    progressContainer.innerHTML = `<p id="progress-text"></p><div class="progress-bar"><div id="progress-bar-inner"></div></div>`;
    
    const total = AppState.images.length;
    for (let i = 0; i < total; i++) {
        const image = AppState.images[i];
        document.getElementById('progress-text')!.textContent = `Processing ${i + 1} of ${total}: ${image.name}`;
        document.getElementById('progress-bar-inner')!.style.width = `${((i + 1) / total) * 100}%`;
        
        const dataUrl = await applyWatermarksToImage(image);
        if (dataUrl) {
            await window.api.saveFile({
                dataUrl,
                directory: AppState.outputDir!,
                originalName: image.name,
                format: AppState.settings.output.format,
            });
        }
    }
    
    progressContainer.innerHTML = `Processing complete! <button id="open-folder-btn" class="button-secondary">Open Output Folder</button>`;
    document.getElementById('open-folder-btn')!.addEventListener('click', () => window.api.openFolder(AppState.outputDir!));

    setTimeout(() => {
        btnText.textContent = 'Start Processing';
        btnSpinner.classList.add('hidden');
        if(document.getElementById('progress-container')) {
            document.getElementById('progress-container')!.classList.add('hidden');
        }
        updateStartButtonState();
    }, 5000);
}

// --- Drawing Logic ---
function getResizedDimensions(originalWidth: number, originalHeight: number, resizeSettings: any) {
    const { mode, width, height } = resizeSettings;
    if (mode === 'none' || !mode) return { newWidth: originalWidth, newHeight: originalHeight };
    const ratio = originalWidth / originalHeight;
    let newWidth = originalWidth, newHeight = originalHeight;
    switch (mode) {
        case 'width': if (originalWidth > width) { newWidth = width; newHeight = newWidth / ratio; } break;
        case 'height': if (originalHeight > height) { newHeight = height; newWidth = newHeight * ratio; } break;
        case 'fit':
             if (originalWidth > width || originalHeight > height) {
                if (ratio > (width / height)) { newWidth = width; newHeight = newWidth / ratio; }
                else { newHeight = height; newWidth = newHeight * ratio; }
            } break;
    }
    return { newWidth: Math.round(newWidth), newHeight: Math.round(newHeight) };
}

function getPositionCoords(pos: { x: number, y: number }, w: number, h: number, elementWidth: number, elementHeight: number, padding = 20) {
    let x = pos.x * (w - elementWidth - padding * 2) + padding;
    let y = pos.y * (h - elementHeight - padding * 2) + padding;
    return { x, y };
}

// ... Drawing functions will go here ...

// --- Main Image Processing Function ---
async function applyWatermarksToImage(image: { path: string }) {
    return new Promise<string | null>((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = async () => {
            const { newWidth, newHeight } = getResizedDimensions(img.width, img.height, AppState.settings.output.resize);
            canvas.width = newWidth; canvas.height = newHeight;
            
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            drawImageEffects(ctx, newWidth, newHeight);
            
            if (AppState.settings.frame.enabled) drawFrameWatermark(ctx, newWidth, newHeight);
            if (AppState.settings.pattern.enabled) drawPatternWatermark(ctx, newWidth, newHeight);
            if (AppState.settings.tile.enabled) drawTileWatermark(ctx, newWidth, newHeight);
            if (AppState.settings.text.enabled) drawTextWatermark(ctx, newWidth, newHeight);
            if (AppState.settings.logo.enabled && AppState.logoFile) drawLogoWatermark(ctx, newWidth, newHeight);
            if (AppState.settings.icon.enabled) drawIconWatermark(ctx, newWidth, newHeight);

            const format = AppState.settings.output.format;
            const quality = AppState.settings.output.quality;
            resolve(canvas.toDataURL(`image/${format}`, quality));
        };
        img.onerror = () => resolve(null);
        img.src = image.path;
    });
}
function getImageDimensions(path: string): Promise<{ originalWidth: number, originalHeight: number }> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ originalWidth: img.width, originalHeight: img.height });
        img.onerror = () => resolve({ originalWidth: 0, originalHeight: 0 });
        img.src = path;
    });
}

// --- Drawing Functions ---
function drawTextWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.text;
    ctx.font = `${s.italic ? 'italic ' : ''}${s.bold ? 'bold ' : ''}${s.fontSize}px ${s.fontFamily}`;
    const metrics = ctx.measureText(s.content);
    const { x, y } = getPositionCoords(s.position, width, height, metrics.width, s.fontSize, s.padding);

    ctx.globalAlpha = s.opacity;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';

    if (s.shadow.enabled) {
        ctx.shadowColor = s.shadow.color; ctx.shadowBlur = s.shadow.blur; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    }

    if (s.gradient.enabled) {
        const gradient = s.gradient.direction === 'vertical'
            ? ctx.createLinearGradient(x, y, x, y + s.fontSize)
            : ctx.createLinearGradient(x, y, x + metrics.width, y);
        gradient.addColorStop(0, s.color);
        gradient.addColorStop(1, s.gradient.color);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = s.color;
    }

    ctx.fillText(s.content, x, y);

    if (s.stroke.enabled) {
        ctx.strokeStyle = s.stroke.color;
        ctx.lineWidth = s.stroke.width;
        ctx.strokeText(s.content, x, y);
    }
    
    ctx.globalAlpha = 1.0;
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
}
function drawLogoWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.logo;
    const logo = AppState.logoFile!.element;
    const logoWidth = width * (s.size / 100);
    const logoHeight = logo.height * (logoWidth / logo.width);
    const { x, y } = getPositionCoords(s.position, width, height, logoWidth, logoHeight, s.padding);
    ctx.globalAlpha = s.opacity;
    ctx.drawImage(logo, x, y, logoWidth, logoHeight);
    ctx.globalAlpha = 1.0;
}
function drawIconWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.icon;
    // For FontAwesome 6, the solid font is required for solid icons.
    ctx.font = `900 ${s.size}px "Font Awesome 6 Free"`;
    const metrics = ctx.measureText(AppState.selectedIcon.unicode);
    const { x, y } = getPositionCoords(s.position, width, height, metrics.width, s.size, s.padding);
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = s.color;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(AppState.selectedIcon.unicode, x, y);
    ctx.globalAlpha = 1.0;
}
function drawTileWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.tile;
    const patternCanvas = document.createElement('canvas');
    const patternCtx = patternCanvas.getContext('2d')!;
    ctx.globalAlpha = s.opacity;

    if (s.useLogo && AppState.logoFile) {
        const logo = AppState.logoFile.element;
        const logoWidth = s.spacing;
        const logoHeight = logo.height * (logoWidth / logo.width);
        const size = Math.max(logoWidth, logoHeight) + s.spacing;
        patternCanvas.width = size; patternCanvas.height = size;
        patternCtx.translate(size/2, size/2);
        patternCtx.rotate(s.rotation * Math.PI / 180);
        patternCtx.drawImage(logo, -logoWidth/2, -logoHeight/2, logoWidth, logoHeight);
    } else {
        patternCtx.font = `${s.fontSize}px ${AppState.settings.text.fontFamily || 'sans-serif'}`;
        const metrics = patternCtx.measureText(s.content);
        const size = Math.max(metrics.width, s.fontSize) + s.spacing;
        patternCanvas.width = size; patternCanvas.height = size;
        patternCtx.fillStyle = AppState.settings.text.color;
        patternCtx.font = `${s.fontSize}px ${AppState.settings.text.fontFamily || 'sans-serif'}`;
        patternCtx.textAlign = 'center'; patternCtx.textBaseline = 'middle';
        patternCtx.translate(size / 2, size / 2);
        patternCtx.rotate(s.rotation * Math.PI / 180);
        patternCtx.fillText(s.content, 0, 0);
    }
    const pattern = ctx.createPattern(patternCanvas, 'repeat')!;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1.0;
}
function drawPatternWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.pattern;
    ctx.globalAlpha = s.opacity;
    const size = s.size;
    switch(s.type) {
        case 'checker':
            for(let y = 0; y < height; y += size) {
                for(let x = 0; x < width; x += size) {
                    ctx.fillStyle = ((x/size + y/size) % 2 === 0) ? s.color1 : s.color2;
                    ctx.fillRect(x, y, size, size);
                }
            }
            break;
        case 'lines':
            ctx.strokeStyle = s.color1;
            ctx.lineWidth = size / 10;
            for(let i = -height; i < width; i += size) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + height, height);
                ctx.stroke();
            }
            break;
        case 'cross':
            ctx.strokeStyle = s.color1;
            ctx.lineWidth = size / 20;
            for(let i = 0; i < width; i += size) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
            }
            for(let i = 0; i < height; i += size) {
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
            }
            break;
    }
    ctx.globalAlpha = 1.0;
}
function drawFrameWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.frame;
    const p = s.padding;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.strokeRect(p, p, width - p*2, height - p*2);
    if (s.style === 'double') {
        const p2 = p + s.width + 5;
        ctx.strokeRect(p2, p2, width - p2*2, height - p2*2);
    }
}
function drawImageEffects(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.effects;
    if (s.blur.enabled && s.blur.radius > 0) {
        ctx.filter = `blur(${s.blur.radius}px)`;
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';
    }
    if (s.noise.enabled && s.noise.amount > 0) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const amount = s.noise.amount;
        for(let i=0; i < data.length; i+=4) {
            const noise = (Math.random() - 0.5) * amount;
            data[i] += noise;
            data[i+1] += noise;
            data[i+2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);
    }
    if (s.sharpen.enabled && s.sharpen.amount > 0) {
        // Simple sharpen via unsharp mask (blur inverted original and add)
        // A full convolution is too slow without web workers/wasm
        ctx.globalAlpha = s.sharpen.amount * 0.5;
        ctx.filter = `blur(${Math.max(1, 20 - s.sharpen.amount * 10)}px)`;
        ctx.drawImage(ctx.canvas, 0, 0, width, height);
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'difference';
        ctx.drawImage(ctx.canvas, 0, 0, width, height);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 1;
    }
}

// --- Preview Modal Logic ---
let previewState = { visible: false, index: 0, zoom: 1, pan: { x: 0, y: 0 }, isPanning: false, isDragging: null as 'text' | 'logo' | 'icon' | null, dragOffset: { x: 0, y: 0 }, startPan: { x: 0, y: 0 }, image: null as HTMLImageElement | null, showWatermark: true };
const modal = document.getElementById('preview-modal')!;
const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true })!;

function handleGridClick(e: MouseEvent) {
    const item = (e.target as HTMLElement).closest('.grid-item');
    if (item) openPreview(parseInt((item as HTMLElement).dataset.index!, 10));
}
function openPreview(index: number) {
    previewState.index = index;
    previewState.image = new Image();
    previewState.image.onload = () => {
        modal.classList.remove('hidden');
        previewState.visible = true;
        resetZoomAndPan();
    };
    previewState.image.src = AppState.images[index].path;
}
function closePreview() { modal.classList.add('hidden'); previewState.visible = false; previewState.image = null; }
function changePreviewImage(offset: number) { let newIndex = previewState.index + offset; if (newIndex < 0) newIndex = AppState.images.length - 1; if (newIndex >= AppState.images.length) newIndex = 0; openPreview(newIndex); }
function setupPreviewModalListeners() {
    document.getElementById('preview-close-btn')!.addEventListener('click', closePreview);
    document.getElementById('preview-backdrop')!.addEventListener('click', closePreview);
    document.getElementById('zoom-in-btn')!.addEventListener('click', () => changeZoom(1.25));
    document.getElementById('zoom-out-btn')!.addEventListener('click', () => changeZoom(0.8));
    document.getElementById('zoom-reset-btn')!.addEventListener('click', resetZoomAndPan);
    document.getElementById('next-image-btn')!.addEventListener('click', () => changePreviewImage(1));
    document.getElementById('prev-image-btn')!.addEventListener('click', () => changePreviewImage(-1));
    const toggleBtn = document.getElementById('toggle-watermark-btn')!;
    toggleBtn.addEventListener('mousedown', () => { previewState.showWatermark = false; drawPreview(); });
    toggleBtn.addEventListener('mouseup', () => { previewState.showWatermark = true; drawPreview(); });
    toggleBtn.addEventListener('mouseleave', () => { previewState.showWatermark = true; drawPreview(); });
    previewCanvas.addEventListener('mousedown', handlePreviewMouseDown);
    previewCanvas.addEventListener('mousemove', handlePreviewMouseMove);
    previewCanvas.addEventListener('mouseup', handlePreviewMouseUp);
    previewCanvas.addEventListener('mouseleave', handlePreviewMouseUp);
    previewCanvas.addEventListener('wheel', handlePreviewWheel, { passive: false });
}
function changeZoom(factor: number) { previewState.zoom = Math.max(0.1, Math.min(previewState.zoom * factor, 10)); drawPreview(); }
function resetZoomAndPan() {
    if (!previewState.image) return;
    const container = document.getElementById('preview-canvas-container')!;
    const scale = Math.min(container.clientWidth / previewState.image.width, container.clientHeight / previewState.image.height) * 0.95;
    previewState.zoom = scale; previewState.pan = { x: 0, y: 0 };
    drawPreview();
}
function drawPreview() {
    if (!previewState.image || !previewState.visible) return;
    const img = previewState.image;
    previewCanvas.width = img.width; previewCanvas.height = img.height;
    const container = document.getElementById('preview-canvas-container')!;
    const displayWidth = img.width * previewState.zoom; const displayHeight = img.height * previewState.zoom;
    previewCanvas.style.width = `${displayWidth}px`; previewCanvas.style.height = `${displayHeight}px`;
    const x = (container.clientWidth - displayWidth) / 2 + previewState.pan.x;
    const y = (container.clientHeight - displayHeight) / 2 + previewState.pan.y;
    previewCanvas.style.transform = `translate(${x}px, ${y}px)`;
    document.getElementById('zoom-level')!.textContent = `${Math.round(previewState.zoom * 100)}%`;
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.drawImage(img, 0, 0);

    if (previewState.showWatermark) {
        drawImageEffects(previewCtx, img.width, img.height);
        if (AppState.settings.frame.enabled) drawFrameWatermark(previewCtx, img.width, img.height);
        if (AppState.settings.pattern.enabled) drawPatternWatermark(previewCtx, img.width, img.height);
        if (AppState.settings.tile.enabled) drawTileWatermark(previewCtx, img.width, img.height);
        if (AppState.settings.text.enabled) drawTextWatermark(previewCtx, img.width, img.height);
        if (AppState.settings.logo.enabled && AppState.logoFile) drawLogoWatermark(previewCtx, img.width, img.height);
        if (AppState.settings.icon.enabled) drawIconWatermark(previewCtx, img.width, img.height);
    }
}
function getWatermarkBBox(type: 'text' | 'logo' | 'icon', imgWidth: number, imgHeight: number) {
    if (type === 'text' && AppState.settings.text.enabled) {
        const s = AppState.settings.text;
        const tempCtx = document.createElement('canvas').getContext('2d')!;
        tempCtx.font = `${s.italic ? 'italic ' : ''}${s.bold ? 'bold ' : ''}${s.fontSize}px ${s.fontFamily}`;
        const metrics = tempCtx.measureText(s.content);
        const {x, y} = getPositionCoords(s.position, imgWidth, imgHeight, metrics.width, s.fontSize, s.padding);
        return { x, y, w: metrics.width, h: s.fontSize };
    }
    if (type === 'logo' && AppState.settings.logo.enabled && AppState.logoFile) {
        const s = AppState.settings.logo;
        const logo = AppState.logoFile.element;
        const w = imgWidth * (s.size / 100); const h = logo.height * (w / logo.width);
        const {x, y} = getPositionCoords(s.position, imgWidth, imgHeight, w, h, s.padding);
        return { x, y, w, h };
    }
    if(type === 'icon' && AppState.settings.icon.enabled) {
        const s = AppState.settings.icon;
        const tempCtx = document.createElement('canvas').getContext('2d')!;
        tempCtx.font = `900 ${s.size}px "Font Awesome 6 Free"`;
        const metrics = tempCtx.measureText(AppState.selectedIcon.unicode);
        const {x, y} = getPositionCoords(s.position, imgWidth, imgHeight, metrics.width, s.size, s.padding);
        return { x, y, w: metrics.width, h: s.size };
    }
    return null;
}
function handlePreviewMouseDown(e: MouseEvent) {
    const mouse = { x: e.offsetX / previewState.zoom, y: e.offsetY / previewState.zoom };
    const checkBBox = (type: 'text' | 'logo' | 'icon') => {
        const bbox = getWatermarkBBox(type, previewCanvas.width, previewCanvas.height);
        if (bbox && mouse.x > bbox.x && mouse.x < bbox.x + bbox.w && mouse.y > bbox.y && mouse.y < bbox.y + bbox.h) {
            previewState.isDragging = type;
            previewState.dragOffset = { x: mouse.x - bbox.x, y: mouse.y - bbox.y };
            document.querySelector(`#${type}-position .active`)?.classList.remove('active');
            return true;
        }
        return false;
    }
    if (checkBBox('text') || checkBBox('logo') || checkBBox('icon')) return;
    
    previewState.isPanning = true;
    previewState.startPan = { x: e.clientX - previewState.pan.x, y: e.clientY - previewState.pan.y };
}
function handlePreviewMouseMove(e: MouseEvent) {
    if (previewState.isDragging) {
        const mouse = { x: e.offsetX / previewState.zoom, y: e.offsetY / previewState.zoom };
        const type = previewState.isDragging;
        const bbox = getWatermarkBBox(type, previewCanvas.width, previewCanvas.height)!;
        const padding = AppState.settings[type].padding;
        const newX = mouse.x - previewState.dragOffset.x;
        const newY = mouse.y - previewState.dragOffset.y;
        AppState.settings[type].position.x = (newX - padding) / (previewCanvas.width - bbox.w - padding * 2);
        AppState.settings[type].position.y = (newY - padding) / (previewCanvas.height - bbox.h - padding * 2);
        AppState.settings[type].position.x = Math.max(0, Math.min(1, AppState.settings[type].position.x));
        AppState.settings[type].position.y = Math.max(0, Math.min(1, AppState.settings[type].position.y));
        drawPreview();
    } else if (previewState.isPanning) {
        previewState.pan.x = e.clientX - previewState.startPan.x;
        previewState.pan.y = e.clientY - previewState.startPan.y;
        drawPreview();
    }
}
function handlePreviewMouseUp() { previewState.isPanning = false; previewState.isDragging = null; }
function handlePreviewWheel(e: WheelEvent) { e.preventDefault(); const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1; changeZoom(factor); }
// Fix: Add export {} to make this file a module, which allows global scope augmentation.
export {};
