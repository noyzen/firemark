
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
export const emojis = ['©️', '®️', '™️', '❤️', '⭐️', '✅', '🔒', '📷', '🖼️', '✨', '🔥', '💧'];
export const PRESETS_PREFIX = 'firemark_preset_';