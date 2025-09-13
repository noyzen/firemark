
import { initializeDefaultState, loadPresets, updateSettingsAndPreview } from './modules/settings';
import { setupPreviewListeners } from './modules/preview';
// Fix: Correctly import UIEvents from ui.ts and remove incorrect import from settings.ts
import { setupCollapsibleGroups, setupRangeValueDisplays, toggleControlGroups, populatePickers, renderAllLayerLists, updateActiveLayerControls, handleGridClick, UIEvents, showGrid } from './modules/ui';
import { handleAddImages, handleClearImages, handleDrop, handleSelectOutputDir, processImages } from './modules/file-handling';

async function populateFontSelectors() {
    const fontSelectors = [
        document.getElementById('text-font-family'),
        document.getElementById('tile-font-family')
    ].filter(el => el) as HTMLSelectElement[];

    if (fontSelectors.length === 0) return;

    const commonFonts = [
        'Arial', 'Verdana', 'Helvetica', 'Roboto', 'Inter', 'Calibri', 'Gill Sans', 'Futura', 'Tahoma', 'Trebuchet MS', 'Lato', 'Open Sans',
        'Times New Roman', 'Georgia', 'Garamond', 'Baskerville', 'Palatino', 'Merriweather',
        'Courier New', 'Lucida Console', 'Monaco', 'Consolas', 'Source Code Pro',
        'Impact', 'Brush Script MT', 'Lobster', 'Pacifico', 'Comic Sans MS'
    ];

    try {
        const systemFonts = await window.api.getFonts();
        
        const createOption = (font: string) => {
            const option = document.createElement('option');
            option.value = font;
            option.textContent = font;
            return option;
        };

        const commonFontsGroup = document.createElement('optgroup');
        commonFontsGroup.label = 'Common Fonts';
        commonFonts.forEach(font => commonFontsGroup.appendChild(createOption(font)));

        const systemFontsGroup = document.createElement('optgroup');
        systemFontsGroup.label = 'System Fonts';
        
        const uniqueSystemFonts = systemFonts.filter(f => !commonFonts.includes(f));
        uniqueSystemFonts.forEach(font => systemFontsGroup.appendChild(createOption(font)));

        fontSelectors.forEach(select => {
            select.innerHTML = '';
            select.appendChild(commonFontsGroup.cloneNode(true));
            if (uniqueSystemFonts.length > 0) {
                select.appendChild(systemFontsGroup.cloneNode(true));
            }
            select.value = 'Arial';
        });
        
    } catch (error) {
        console.error('Failed to load system fonts:', error);
        const group = document.createElement('optgroup');
        group.label = 'Available Fonts';
        commonFonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font;
            option.textContent = font;
            group.appendChild(option);
        });
        fontSelectors.forEach(select => {
            select.innerHTML = '';
            select.appendChild(group.cloneNode(true));
            select.value = 'Arial';
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    setupWindowControls();
    setupEventListeners();
    await populateFontSelectors();
    initializeDefaultState();
    setupRangeValueDisplays();
    setupCollapsibleGroups();
    loadPresets();
    toggleControlGroups();
    await populatePickers();
});

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

function setupEventListeners() {
    const dropzone = document.getElementById('dropzone')!;
    dropzone.addEventListener('dragover', (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).classList.add('dragover'); });
    dropzone.addEventListener('dragleave', (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).classList.remove('dragover'); });
    dropzone.addEventListener('drop', handleDrop);
    document.getElementById('add-images-btn')!.addEventListener('click', handleAddImages);
    document.getElementById('clear-images-btn')!.addEventListener('click', handleClearImages);
    document.getElementById('output-dir-btn')!.addEventListener('click', handleSelectOutputDir);
    document.getElementById('start-btn')!.addEventListener('click', processImages);
    document.getElementById('image-grid')!.addEventListener('click', handleGridClick);
    document.getElementById('back-to-grid-btn')!.addEventListener('click', showGrid);

    // Fix: Use the correctly imported UIEvents object
    document.getElementById('add-text-btn')!.addEventListener('click', () => UIEvents.addLayer('texts'));
    document.getElementById('add-logo-btn')!.addEventListener('click', () => UIEvents.addLayer('logos'));
    document.getElementById('add-icon-btn')!.addEventListener('click', () => UIEvents.addLayer('icons'));
    document.getElementById('text-recenter-btn')!.addEventListener('click', () => UIEvents.recenterActiveLayer());
    document.getElementById('logo-recenter-btn')!.addEventListener('click', () => UIEvents.recenterActiveLayer());
    document.getElementById('icon-recenter-btn')!.addEventListener('click', () => UIEvents.recenterActiveLayer());

    const sidebarContent = document.querySelector('.sidebar-content')!;

    const handleSidebarUpdate = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.matches('input, select, textarea')) {
            updateSettingsAndPreview();
        }
        if (e.type === 'change' && target.matches('select, .toggle-switch input')) {
            toggleControlGroups();
        }
    };

    sidebarContent.addEventListener('input', handleSidebarUpdate);
    sidebarContent.addEventListener('change', handleSidebarUpdate);

    sidebarContent.addEventListener('click', (e) => {
        const button = (e.target as HTMLElement).closest('button');
        if (!button) return;

        if (button.closest('.position-grid')) {
            button.closest('.position-grid')!.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            updateSettingsAndPreview();
        } else if (button.closest('.text-styles')) {
            if (button.dataset.align) {
                button.closest('.text-styles')!.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
            }
            button.classList.toggle('active');
            updateSettingsAndPreview();
        }
    });
    
    document.getElementById('icon-picker-btn')!.addEventListener('click', () => document.getElementById('icon-picker-modal')!.classList.remove('hidden'));
    document.getElementById('emoji-picker-btn')!.addEventListener('click', () => document.getElementById('emoji-picker-modal')!.classList.remove('hidden'));
    document.querySelectorAll('.modal-backdrop').forEach(el => el.addEventListener('click', () => document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'))));
    // Fix: Use the correctly imported UIEvents object
    document.getElementById('icon-search-input')!.addEventListener('input', UIEvents.filterIcons);
    
    document.getElementById('preset-save-btn')!.addEventListener('click', UIEvents.openSavePresetModal);
    document.getElementById('preset-save-cancel-btn')!.addEventListener('click', () => document.getElementById('preset-save-modal')!.classList.add('hidden'));
    document.getElementById('preset-save-confirm-btn')!.addEventListener('click', UIEvents.savePreset);
    document.getElementById('preset-delete-btn')!.addEventListener('click', UIEvents.openDeletePresetModal);
    document.getElementById('preset-delete-cancel-btn')!.addEventListener('click', () => document.getElementById('preset-delete-modal')!.classList.add('hidden'));
    document.getElementById('preset-delete-confirm-btn')!.addEventListener('click', UIEvents.deletePreset);
    document.getElementById('presets-select')!.addEventListener('change', UIEvents.applyPreset);
    
    setupPreviewListeners();
}

export {};
