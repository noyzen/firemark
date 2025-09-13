// --- App State ---
const AppState = {
    images: [] as { name: string; path: string; originalWidth: number; originalHeight: number }[],
    outputDir: null as string | null,
    logoFile: null as { name: string; path: string; element: HTMLImageElement } | null,
    settings: {} as any,
    presets: {} as { [key: string]: any },
    selectedIcon: { class: 'fa-solid fa-copyright', unicode: '\u00a9', name: 'copyright' }
};

export function getAppState() {
    return AppState;
}

// --- Constants ---
export const faIcons = [
    { class: 'fa-solid fa-copyright', unicode: '\u00a9', name: 'copyright' }, { class: 'fa-solid fa-camera', unicode: '\uf030', name: 'camera' },
    { class: 'fa-solid fa-image', unicode: '\uf03e', name: 'image' }, { class: 'fa-solid fa-star', unicode: '\uf005', name: 'star' },
    { class: 'fa-solid fa-heart', unicode: '\uf004', name: 'heart' }, { class: 'fa-solid fa-lock', unicode: '\uf023', name: 'lock' },
    { class: 'fa-solid fa-shield-halved', unicode: '\uf3ed', name: 'shield' }, { class: 'fa-solid fa-circle-check', unicode: '\uf058', name: 'check' },
    { class: 'fa-solid fa-triangle-exclamation', unicode: '\uf071', name: 'warning' }, { class: 'fa-solid fa-fire', unicode: '\uf06d', name: 'fire' },
    { class: 'fa-solid fa-signature', unicode: '\uf5b7', name: 'signature' }, { class: 'fa-solid fa-info', unicode: '\uf129', name: 'info' },
    { class: 'fa-solid fa-camera-retro', name: 'camera-retro', unicode: '\uf083' }, { class: 'fa-solid fa-video', name: 'video', unicode: '\uf03d' },
    { class: 'fa-solid fa-microphone', name: 'microphone', unicode: '\uf130' }, { class: 'fa-solid fa-bolt', name: 'bolt', unicode: '\uf0e7' },
    { class: 'fa-solid fa-cloud', name: 'cloud', unicode: '\uf0c2' }, { class: 'fa-solid fa-cube', name: 'cube', unicode: '\uf1b2' },
    { class: 'fa-solid fa-crown', name: 'crown', unicode: '\uf521' }, { class: 'fa-solid fa-ghost', name: 'ghost', unicode: '\uf6e2' },
];
export const emojis = ['©️', '®️', '™️', '❤️', '⭐️', '✅', '🔒', '📷', '🖼️', '✨', '🔥', '💧'];
export const SETTINGS_KEY = 'firemark_last_settings';
export const PRESETS_PREFIX = 'firemark_preset_';
