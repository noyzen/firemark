import { loadLastSettings, loadPresets, updateSettingsAndPreview } from './modules/settings';
import { setupPreviewListeners } from './modules/preview';
// Fix: Correctly import UIEvents from ui.ts and remove incorrect import from settings.ts
import { setupCollapsibleGroups, setupRangeValueDisplays, toggleControlGroups, populatePickers, renderAllLayerLists, updateActiveLayerControls, handleGridClick, UIEvents, showGrid } from './modules/ui';
import { handleAddImages, handleClearImages, handleDrop, handleSelectOutputDir, processImages } from './modules/file-handling';

document.addEventListener('DOMContentLoaded', () => {
    setupWindowControls();
    setupEventListeners();
    loadLastSettings();
    setupRangeValueDisplays();
    setupCollapsibleGroups();
    loadPresets();
    toggleControlGroups();
    populatePickers();
    renderAllLayerLists();
    updateActiveLayerControls();
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

    document.querySelectorAll('.sidebar-content input, .sidebar-content select, .sidebar-content textarea').forEach(el => {
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
                if(target.dataset.align) {
                    target.closest('.text-styles')!.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
                }
                target.classList.toggle('active');
                updateSettingsAndPreview();
             }
        });
    });

    document.querySelectorAll('.toggle-switch input, .group-header.collapsible').forEach(el => el.addEventListener('change', toggleControlGroups));
    
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