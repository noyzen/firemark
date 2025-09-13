import { AppState, SETTINGS_KEY, PRESETS_PREFIX, settingsUpdateTimeout } from './state';
import { drawPreview } from './preview';
import { toggleControlGroups, setupRangeValueDisplays, renderAllLayerLists, updateActiveLayerControls, updateCollapsibleIndicators } from './ui';

export function updateSettings() {
    if (AppState.activeLayer) {
        const { type, id } = AppState.activeLayer;
        const layer = AppState.settings[type]?.find((l: { id: any; }) => l.id === id);
        if (layer) {
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
            const getValue = (elId: string, isInt = false, isFloat = false) => {
                const el = document.getElementById(elId) as HTMLInputElement;
                if (isInt) return parseInt(el.value, 10) || 0;
                if (isFloat) return parseFloat(el.value) || 0;
                return el.value;
            };
            const isChecked = (elId: string) => (document.getElementById(elId) as HTMLInputElement).checked;
            const isActive = (elId: string) => document.getElementById(elId)!.classList.contains('active');

            switch (type) {
                case 'texts':
                    Object.assign(layer, { content: getValue('text-content'), fontFamily: getValue('text-font-family'), fontSize: getValue('text-font-size', true), bold: isActive('text-bold'), italic: isActive('text-italic'), align: (document.querySelector('#text-align-left.active, #text-align-center.active, #text-align-right.active') as HTMLElement)?.dataset.align || 'left', lineHeight: getValue('text-line-height', false, true), color: getValue('text-color'), opacity: getValue('text-opacity', false, true), padding: getValue('text-padding', true), gradient: { enabled: isChecked('text-gradient-enable'), color: getValue('text-gradient-color'), direction: getValue('text-gradient-direction') }, stroke: { enabled: isChecked('text-stroke-enable'), color: getValue('text-stroke-color'), width: getValue('text-stroke-width', true) }, shadow: { enabled: isChecked('text-shadow-enable'), color: getValue('text-shadow-color'), blur: getValue('text-shadow-blur', true) }, position: getPosition('text-position'), freePlacement: isChecked('text-free-placement') });
                    break;
                case 'logos':
                    Object.assign(layer, { size: getValue('logo-size', true), opacity: getValue('logo-opacity', false, true), padding: getValue('logo-padding', true), position: getPosition('logo-position'), freePlacement: isChecked('logo-free-placement') });
                    break;
                case 'icons':
                    Object.assign(layer, { size: getValue('icon-size', true), color: getValue('icon-color'), opacity: getValue('icon-opacity', false, true), padding: getValue('icon-padding', true), position: getPosition('icon-position'), freePlacement: isChecked('icon-free-placement') });
                    break;
            }
        }
    }
    
    const getValue = (elId: string, isInt = false, isFloat = false) => { const el = document.getElementById(elId) as HTMLInputElement; if(!el) return null; if (isInt) return parseInt(el.value, 10) || 0; if (isFloat) return parseFloat(el.value) || 0; return el.value; };
    const isChecked = (elId: string) => (document.getElementById(elId) as HTMLInputElement)?.checked;
    
    AppState.settings.tile = { enabled: isChecked('tile-enable'), useLogo: isChecked('tile-use-logo'), content: getValue('tile-text-content'), fontSize: getValue('tile-font-size', true), opacity: getValue('tile-opacity', false, true), rotation: getValue('tile-rotation', true), spacing: getValue('tile-spacing', true) };
    AppState.settings.pattern = { enabled: isChecked('pattern-enable'), type: getValue('pattern-type'), color1: getValue('pattern-color1'), color2: getValue('pattern-color2'), opacity: getValue('pattern-opacity', false, true), size: getValue('pattern-size', true) };
    AppState.settings.frame = { enabled: isChecked('frame-enable'), style: getValue('frame-style'), color: getValue('frame-color'), width: getValue('frame-width', true), padding: getValue('frame-padding', true) };
    AppState.settings.effects = { brightness: getValue('effect-brightness', false, true), contrast: getValue('effect-contrast', false, true), grayscale: getValue('effect-grayscale', false, true), blur: { enabled: isChecked('effect-blur-enable'), radius: getValue('effect-blur-radius', false, true) }, noise: { enabled: isChecked('effect-noise-enable'), amount: getValue('effect-noise-amount', true) }, sharpen: { enabled: isChecked('effect-sharpen-enable'), amount: getValue('effect-sharpen-amount', false, true) } };
    AppState.settings.output = { format: getValue('output-format'), quality: getValue('output-quality', false, true), resize: { mode: getValue('resize-mode'), width: getValue('resize-width', true), height: getValue('resize-height', true) } };
}

function applySettingsToUI(s: any) {
    if (!s) return;
    
    AppState.settings = s;
    if (!Array.isArray(AppState.settings.texts)) AppState.settings.texts = [];
    if (!Array.isArray(AppState.settings.logos)) AppState.settings.logos = [];
    if (!Array.isArray(AppState.settings.icons)) AppState.settings.icons = [];
    
    AppState.activeLayer = null;
    
    renderAllLayerLists();
    updateActiveLayerControls();

    const setValue = (id: string, value: any, type = 'value') => { if (value === undefined) return; const el = document.getElementById(id) as any; if (el) el[type] = value; };
    const setChecked = (id: string, value: boolean) => setValue(id, value, 'checked');
    
    if (s.tile) { setChecked('tile-enable', s.tile.enabled); setChecked('tile-use-logo', s.tile.useLogo); setValue('tile-text-content', s.tile.content); setValue('tile-font-size', s.tile.fontSize); setValue('tile-opacity', s.tile.opacity); setValue('tile-rotation', s.tile.rotation); setValue('tile-spacing', s.tile.spacing); }
    if (s.pattern) { setChecked('pattern-enable', s.pattern.enabled); setValue('pattern-type', s.pattern.type); setValue('pattern-color1', s.pattern.color1); setValue('pattern-color2', s.pattern.color2); setValue('pattern-opacity', s.pattern.opacity); setValue('pattern-size', s.pattern.size); }
    if (s.frame) { setChecked('frame-enable', s.frame.enabled); setValue('frame-style', s.frame.style); setValue('frame-color', s.frame.color); setValue('frame-width', s.frame.width); setValue('frame-padding', s.frame.padding); }
    if (s.effects) {
        setValue('effect-brightness', s.effects.brightness); setValue('effect-contrast', s.effects.contrast); setValue('effect-grayscale', s.effects.grayscale);
        if(s.effects.blur) { setChecked('effect-blur-enable', s.effects.blur.enabled); setValue('effect-blur-radius', s.effects.blur.radius); }
        if(s.effects.noise) { setChecked('effect-noise-enable', s.effects.noise.enabled); setValue('effect-noise-amount', s.effects.noise.amount); }
        if(s.effects.sharpen) { setChecked('effect-sharpen-enable', s.effects.sharpen.enabled); setValue('effect-sharpen-amount', s.effects.sharpen.amount); }
    }
    if (s.output) { setValue('output-format', s.output.format); setValue('output-quality', s.output.quality); setValue('resize-mode', s.output.resize.mode); setValue('resize-width', s.output.resize.width); setValue('resize-height', s.output.resize.height); }

    toggleControlGroups();
    setupRangeValueDisplays();
    updateSettings();
}

export function updateSettingsAndPreview() {
    updateSettings();
    updateActiveLayerControls();
    drawPreview();
    updateCollapsibleIndicators();
    clearTimeout(settingsUpdateTimeout);
    (window as any).settingsUpdateTimeout = window.setTimeout(saveCurrentSettingsToLocalStorage, 300);
}

function saveCurrentSettingsToLocalStorage() {
    if(Object.keys(AppState.settings).length > 0) {
        const settingsToSave = JSON.parse(JSON.stringify(AppState.settings));
        settingsToSave.logos?.forEach((l: { element: any; }) => delete l.element);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
    }
}

export function loadLastSettings() {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if(savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            settings.logos?.forEach((logo: { path: string; element: HTMLImageElement; }) => {
                const img = new Image();
                img.src = logo.path;
                logo.element = img;
            });
            applySettingsToUI(settings);
        } catch (e) {
            console.error("Failed to parse last settings", e);
            updateSettings();
        }
    } else {
        updateSettings();
    }
}

export function openSavePresetModal() {
    (document.getElementById('preset-name-input') as HTMLInputElement).value = '';
    document.getElementById('preset-save-modal')!.classList.remove('hidden');
    (document.getElementById('preset-name-input') as HTMLInputElement).focus();
}

export function savePreset() {
    const nameInput = document.getElementById('preset-name-input') as HTMLInputElement;
    const name = nameInput.value;
    if (name && name.trim()) {
        const key = `${PRESETS_PREFIX}${name.trim()}`;
        const settingsToSave = JSON.parse(JSON.stringify(AppState.settings));
        settingsToSave.logos?.forEach((l: { element: any; }) => delete l.element);
        localStorage.setItem(key, JSON.stringify(settingsToSave));
        loadPresets();
        (document.getElementById('presets-select') as HTMLSelectElement).value = key;
        document.getElementById('preset-save-modal')!.classList.add('hidden');
    }
}

export function loadPresets() {
    const select = document.getElementById('presets-select') as HTMLSelectElement;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Select a preset...</option>';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PRESETS_PREFIX)) {
            const name = key.replace(PRESETS_PREFIX, '');
            const option = document.createElement('option'); option.value = key; option.textContent = name;
            select.appendChild(option);
        }
    }
    select.value = currentVal;
}

export function applyPreset(e: Event) {
    const key = (e.target as HTMLSelectElement).value;
    if (key) {
        const settingsJSON = localStorage.getItem(key);
        if (settingsJSON) { 
            const settings = JSON.parse(settingsJSON);
            settings.logos?.forEach((logo: { path: string; element: HTMLImageElement; }) => {
                const img = new Image();
                img.src = logo.path;
                logo.element = img;
            });
            applySettingsToUI(settings); 
        }
    }
}

export function openDeletePresetModal() {
    const select = document.getElementById('presets-select') as HTMLSelectElement;
    const key = select.value;
    if (key) {
        const name = key.replace(PRESETS_PREFIX, '');
        document.getElementById('preset-delete-confirm-text')!.textContent = `Are you sure you want to delete the "${name}" preset? This cannot be undone.`;
        document.getElementById('preset-delete-modal')!.classList.remove('hidden');
    }
}

export function deletePreset() {
    const select = document.getElementById('presets-select') as HTMLSelectElement;
    const key = select.value;
    if (key) {
        localStorage.removeItem(key);
        loadPresets();
        document.getElementById('preset-delete-modal')!.classList.add('hidden');
    }
}