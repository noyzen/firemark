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
            ghostWatermark: (args: { dataUrl: string, subtlety: number }) => Promise<{ success: boolean; dataUrl?: string, error?: string }>;
            // Fix: Add getFonts to the api interface to match the preload script and fix TypeScript error.
            getFonts: () => Promise<string[]>;
        };
    }
}

// --- App State ---
export const AppState = {
    images: [] as { name: string; path: string; originalWidth: number; originalHeight: number }[],
    outputDir: null as string | null,
    settings: {
        texts: [] as any[],
        logos: [] as any[],
        icons: [] as any[],
        // Fix: Add missing boolean properties to the settings type definition to resolve TypeScript errors.
        textsEnabled: true,
        logosEnabled: true,
        iconsEnabled: true,
        effectsEnabled: false,
        tile: {} as any,
        pattern: {} as any,
        frame: {} as any,
        effects: {} as any,
        output: {} as any,
    },
    activeLayer: null as { type: 'texts' | 'logos' | 'icons', id: number } | null,
    presets: {} as { [key: string]: any },
};

export let previewState = { 
    visible: false, 
    index: 0, 
    zoom: 1, 
    pan: { x: 0, y: 0 }, 
    isPanning: false, 
    isDragging: null as { type: 'texts' | 'logos' | 'icons', id: number } | null, 
    dragOffset: { x: 0, y: 0 }, 
    startPan: { x: 0, y: 0 }, 
    image: null as HTMLImageElement | null, 
    showWatermark: true 
};

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
export const PRESETS_PREFIX = 'firemark_preset_';