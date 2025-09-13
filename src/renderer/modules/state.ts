// --- App State ---
type AppStateType = {
    images: { name: string; path: string; originalWidth: number; originalHeight: number }[];
    outputDir: string | null;
    logoFile: { name: string; path: string; element: HTMLImageElement } | null;
    settings: any;
    selectedIcon: { class: string; unicode: string; name: string; };
};

let AppState: AppStateType = {
    images: [],
    outputDir: null,
    logoFile: null,
    settings: {},
    selectedIcon: { class: 'fa-solid fa-copyright', unicode: '\u00a9', name: 'copyright' }
};

export function getAppState() {
    return AppState;
}

export function setAppState(newState: Partial<AppStateType>) {
    AppState = { ...AppState, ...newState };
    // This is a good place to add any logic that needs to run on every state update,
    // like saving settings.
    if(newState.settings) {
        const { debouncedSave } = require('./settings');
        debouncedSave();
    }
}


// --- Constants ---
export const faIcons = [
    // Essentials
    { class: 'fa-solid fa-copyright', unicode: '\u00a9', name: 'copyright' },
    { class: 'fa-solid fa-camera', unicode: '\uf030', name: 'camera' },
    { class: 'fa-solid fa-image', unicode: '\uf03e', name: 'image' },
    { class: 'fa-solid fa-star', unicode: '\uf005', name: 'star' },
    { class: 'fa-solid fa-heart', unicode: '\uf004', name: 'heart' },
    { class: 'fa-solid fa-lock', unicode: '\uf023', name: 'lock' },
    // Brands & Logos
    { class: 'fa-brands fa-apple', unicode: '\uf179', name: 'apple' },
    { class: 'fa-brands fa-windows', unicode: '\uf17a', name: 'windows' },
    { class: 'fa-brands fa-android', unicode: '\uf17b', name: 'android' },
    { class: 'fa-brands fa-instagram', unicode: '\uf16d', name: 'instagram' },
    { class: 'fa-brands fa-facebook', unicode: '\uf09a', name: 'facebook' },
    { class: 'fa-brands fa-x-twitter', unicode: '\ue61b', name: 'x-twitter' },
    // Symbols & Shapes
    { class: 'fa-solid fa-shield-halved', unicode: '\uf3ed', name: 'shield' },
    { class: 'fa-solid fa-circle-check', unicode: '\uf058', name: 'check' },
    { class: 'fa-solid fa-triangle-exclamation', unicode: '\uf071', name: 'warning' },
    { class: 'fa-solid fa-fire', unicode: '\uf06d', name: 'fire' },
    { class: 'fa-solid fa-signature', unicode: '\uf5b7', name: 'signature' },
    { class: 'fa-solid fa-info-circle', unicode: '\uf05a', name: 'info-circle' },
    { class: 'fa-solid fa-camera-retro', name: 'camera-retro', unicode: '\uf083' },
    { class: 'fa-solid fa-video', name: 'video', unicode: '\uf03d' },
    // Fun & Misc
    { class: 'fa-solid fa-microphone', name: 'microphone', unicode: '\uf130' },
    { class: 'fa-solid fa-bolt', name: 'bolt', unicode: '\uf0e7' },
    { class: 'fa-solid fa-cloud', name: 'cloud', unicode: '\uf0c2' },
    { class: 'fa-solid fa-cube', name: 'cube', unicode: '\uf1b2' },
    { class: 'fa-solid fa-crown', name: 'crown', unicode: '\uf521' },
    { class: 'fa-solid fa-ghost', name: 'ghost', unicode: '\uf6e2' },
    { class: 'fa-solid fa-rocket', name: 'rocket', unicode: '\uf135' },
    { class: 'fa-solid fa-music', name: 'music', unicode: '\uf001' },
    { class: 'fa-solid fa-paw', name: 'paw', unicode: '\uf1b0' },
    { class: 'fa-solid fa-palette', name: 'palette', unicode: '\uf53f' },
];
export const emojis = ['©️', '®️', '™️', '❤️', '⭐️', '✅', '🔒', '📷', '🖼️', '✨', '🔥', '💧', '👍', '🎉', '💡', '🚀'];
export const SETTINGS_KEY = 'firemark_last_settings';
export const PRESETS_PREFIX = 'firemark_preset_';