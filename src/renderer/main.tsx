
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
            saveFile: (args: { dataUrl: string; directory: string; originalName: string; format:string }) => Promise<{ success: boolean; path?: string; error?: string }>;
            openFolder: (path: string) => void;
            // FIX: Add ghostWatermark to the api definition to match the one in index.tsx and fix the type error.
            ghostWatermark: (args: { dataUrl: string, subtlety: number }) => Promise<{ success: boolean; dataUrl?: string, error?: string }>;
        };
    }
}

import { 
    setupWindowControls, 
    setupEventListeners, 
    setupRangeValueDisplays, 
    setupCollapsibleGroups, 
    populatePickers,
    toggleControlGroups
} from './modules/ui';
import { loadLastSettings, loadPresets } from './modules/settings';

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupWindowControls();
    loadLastSettings(); 
    setupEventListeners();
    setupRangeValueDisplays();
    setupCollapsibleGroups();
    loadPresets();
    toggleControlGroups();
    populatePickers();
});

// To satisfy the TypeScript compiler for an empty export
export {};
