

import { getAppState, setAppState, SETTINGS_KEY, PRESETS_PREFIX } from './state';
import { updateSettingsAndPreview, setupRangeValueDisplays, toggleControlGroups } from './ui';

let settingsUpdateTimeout: number;

// --- Settings Management ---
export function updateSettings() {
    const AppState = getAppState();
    
    const getPosition = (containerId: string) => {
        const activeBtn = document.querySelector(`#${containerId} button.active`) as HTMLElement;
        if (!activeBtn) return AppState.settings[containerId.split('-')[0]]?.position || { x: 0.5, y: 0.5 };
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
        if (!el) return 0;
        if (isInt) return parseInt(el.value, 10) || 0;
        if (isFloat) return parseFloat(el.value) || 0;
        return el.value;
    };
    const isChecked = (id: string) => (document.getElementById(id) as HTMLInputElement)?.checked ?? false;
    const isActive = (id: string) => document.getElementById(id)?.classList.contains('active') ?? false;

    setAppState({
        settings: {
            text: {
                enabled: isChecked('text-enable'), content: getValue('text-content'), fontFamily: getValue('text-font-family'),
                fontSize: getValue('text-font-size', true), bold: isActive('text-bold'), italic: isActive('text-italic'),
                align: (document.querySelector('#text-align-left.active, #text-align-center.active, #text-align-right.active') as HTMLElement)?.dataset.align || 'left',
                lineHeight: getValue('text-line-height', false, true), color: getValue('text-color'), opacity: getValue('text-opacity', false, true),
                padding: getValue('text-padding', true),
                gradient: { enabled: isChecked('text-gradient-enable'), color: getValue('text-gradient-color'), direction: getValue('text-gradient-direction') },
                stroke: { enabled: isChecked('text-stroke-enable'), color: getValue('text-stroke-color'), width: getValue('text-stroke-width', true) },
                shadow: { enabled: isChecked('text-shadow-enable'), color: getValue('text-shadow-color'), blur: getValue('text-shadow-blur', true) },
                position: getPosition('text-position'),
            },
            logo: { enabled: isChecked('logo-enable'), size: getValue('logo-size', true), opacity: getValue('logo-opacity', false, true), padding: getValue('logo-padding', true), position: getPosition('logo-position') },
            icon: { enabled: isChecked('icon-enable'), size: getValue('icon-size', true), color: getValue('icon-color'), opacity: getValue('icon-opacity', false, true), padding: getValue('icon-padding', true), position: getPosition('icon-position') },
            tile: { enabled: isChecked('tile-enable'), useLogo: isChecked('tile-use-logo'), content: getValue('tile-text-content'), fontSize: getValue('tile-font-size', true), opacity: getValue('tile-opacity', false, true), rotation: getValue('tile-rotation', true), spacing: getValue('tile-spacing', true) },
            pattern: { enabled: isChecked('pattern-enable'), type: getValue('pattern-type'), color1: getValue('pattern-color1'), color2: getValue('pattern-color2'), opacity: getValue('pattern-opacity', false, true), size: getValue('pattern-size', true) },
            frame: { enabled: isChecked('frame-enable'), style: getValue('frame-style'), color: getValue('frame-color'), width: getValue('frame-width', true), padding: getValue('frame-padding', true) },
            effects: {
                brightness: getValue('effect-brightness', false, true), contrast: getValue('effect-contrast', false, true), grayscale: getValue('effect-grayscale', false, true),
                blur: { enabled: isChecked('effect-blur-enable'), radius: getValue('effect-blur-radius', false, true) },
                noise: { enabled: isChecked('effect-noise-enable'), amount: getValue('effect-noise-amount', true) },
                sharpen: { enabled: isChecked('effect-sharpen-enable'), amount: getValue('effect-sharpen-amount', false, true) },
            },
            // Preserve AI ghosting settings from old index.tsx, even if no UI exists for it yet
            aiGhosting: AppState.settings.aiGhosting || { enabled: false, subtlety: 50 },
            output: { format: getValue('output-format'), quality: getValue('output-quality', false, true), resize: { mode: getValue('resize-mode'), width: getValue('resize-width', true), height: getValue('resize-height', true) } }
        }
    });
}

export function applySettingsToUI(s: any) {
    if (!s) return;
    const setValue = (id: string, value: any, type = 'value') => { if (value === undefined) return; const el = document.getElementById(id) as any; if (el) el[type] = value; };
    const setChecked = (id: string, value: boolean) => setValue(id, value, 'checked');
    const setActive = (id: string, value: boolean) => document.getElementById(id)?.classList.toggle('active', !!value);
    const setPosition = (id: string, pos: { x: number, y: number }) => {
        if (!pos) return;
        document.querySelectorAll(`#${id} button`).forEach(b => b.classList.remove('active'));
        const yStr = pos.y < 0.25 ? 'top' : pos.y > 0.75 ? 'bottom' : 'center';
        const xStr = pos.x < 0.25 ? 'left' : pos.x > 0.75 ? 'right' : 'center';
        const posStr = `${yStr}-${xStr}`;
        document.querySelector(`#${id} button[data-position="${posStr}"]`)?.classList.add('active');
    };

    if (s.text) {
        setChecked('text-enable', s.text.enabled); setValue('text-content', s.text.content); setValue('text-font-family', s.text.fontFamily); setValue('text-font-size', s.text.fontSize); setActive('text-bold', s.text.bold); setActive('text-italic', s.text.italic); setValue('text-color', s.text.color); setValue('text-opacity', s.text.opacity); setValue('text-padding', s.text.padding); setValue('text-line-height', s.text.lineHeight);
        document.querySelectorAll('[data-align]').forEach(el => el.classList.remove('active')); setActive(`text-align-${s.text.align}`, true);
        if(s.text.gradient) { setChecked('text-gradient-enable', s.text.gradient.enabled); setValue('text-gradient-color', s.text.gradient.color); setValue('text-gradient-direction', s.text.gradient.direction); }
        if(s.text.stroke) { setChecked('text-stroke-enable', s.text.stroke.enabled); setValue('text-stroke-color', s.text.stroke.color); setValue('text-stroke-width', s.text.stroke.width); }
        if(s.text.shadow) { setChecked('text-shadow-enable', s.text.shadow.enabled); setValue('text-shadow-color', s.text.shadow.color); setValue('text-shadow-blur', s.text.shadow.blur); }
        setPosition('text-position', s.text.position);
    }
    if (s.logo) { setChecked('logo-enable', s.logo.enabled); setValue('logo-size', s.logo.size); setValue('logo-opacity', s.logo.opacity); setValue('logo-padding', s.logo.padding); setPosition('logo-position', s.logo.position); }
    if (s.icon) { setChecked('icon-enable', s.icon.enabled); setValue('icon-size', s.icon.size); setValue('icon-color', s.icon.color); setValue('icon-opacity', s.icon.opacity); setValue('icon-padding', s.icon.padding); setPosition('icon-position', s.icon.position); }
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

    // After applying all settings, update UI states
    toggleControlGroups(); // Manages visibility of conditional controls
    setupRangeValueDisplays(); // Updates all range slider text values
    updateSettings(); // Syncs the AppState with the new UI state
}

// --- Persistent Settings ---
export function saveCurrentSettingsToLocalStorage() {
    const AppState = getAppState();
    if (Object.keys(AppState.settings).length > 0) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(AppState.settings));
    }
}

export function debouncedSave() {
    clearTimeout(settingsUpdateTimeout);
    settingsUpdateTimeout = window.setTimeout(saveCurrentSettingsToLocalStorage, 300);
}

export function loadLastSettings() {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            applySettingsToUI(settings);
        } catch (e) {
            console.error("Failed to parse last settings", e);
            updateSettings(); // fallback to default
        }
    } else {
        updateSettings();
    }
}

// --- Presets Logic ---
export function openSavePresetModal() {
    (document.getElementById('preset-name-input') as HTMLInputElement).value = '';
    document.getElementById('preset-save-modal')!.classList.remove('hidden');
    (document.getElementById('preset-name-input') as HTMLInputElement).focus();
}

export function savePreset() {
    const AppState = getAppState();
    const nameInput = document.getElementById('preset-name-input') as HTMLInputElement;
    const name = nameInput.value;
    if (name && name.trim()) {
        const key = `${PRESETS_PREFIX}${name.trim()}`;
        localStorage.setItem(key, JSON.stringify(AppState.settings));
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
            const option = document.createElement('option');
            option.value = key;
            option.textContent = name;
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