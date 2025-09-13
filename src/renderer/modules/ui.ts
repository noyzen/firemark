
import { getAppState, faIcons, emojis } from './state';
import { updateSettings, debouncedSave, openSavePresetModal, savePreset, applyPreset, openDeletePresetModal, deletePreset } from './settings';
import { applyWatermarksToImage } from './drawing';
import { isPreviewVisible, drawPreview, setupPreviewModalListeners, openPreview } from './preview';

// --- Global UI Event: Update Settings & Live Preview ---
export function updateSettingsAndPreview() {
    updateSettings();
    if (isPreviewVisible()) {
        drawPreview();
    }
    debouncedSave();
}

// --- Window Controls ---
export function setupWindowControls() {
    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');

    async function refreshMaxButton() {
        try {
            const maximized = await window.windowControls.isMaximized();
            document.body.classList.toggle('maximized', maximized);
            const maxIcon = document.getElementById('max-icon');
            if (!maxIcon) return;
            if (maximized) {
                maxIcon.classList.remove('fa-window-maximize');
                maxIcon.classList.add('fa-window-restore');
                maxBtn!.title = 'Restore';
            } else {
                maxIcon.classList.remove('fa-window-restore');
                maxIcon.classList.add('fa-window-maximize');
                maxBtn!.title = 'Maximize';
            }
        } catch (e) {
            console.error("Could not refresh max button state:", e)
        }
    }

    minBtn?.addEventListener('click', () => window.windowControls.minimize());
    maxBtn?.addEventListener('click', () => window.windowControls.maximize());
    closeBtn?.addEventListener('click', () => window.windowControls.close());
    window.windowControls.onMaximizeChanged(refreshMaxButton);
    document.getElementById('window-title')!.querySelector('span')!.textContent = 'Firemark';
    refreshMaxButton();
}

// --- Main Event Listener Setup ---
export function setupEventListeners() {
    // Main UI Actions
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

    // Settings Listeners
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

    document.querySelectorAll('.toggle-switch input').forEach(el => el.addEventListener('change', toggleControlGroups));
    
    // Pickers & Modals
    document.getElementById('icon-picker-btn')!.addEventListener('click', () => document.getElementById('icon-picker-modal')!.classList.remove('hidden'));
    document.getElementById('emoji-picker-btn')!.addEventListener('click', () => document.getElementById('emoji-picker-modal')!.classList.remove('hidden'));
    document.querySelectorAll('.modal-backdrop').forEach(el => el.addEventListener('click', () => document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'))));
    document.getElementById('icon-search-input')!.addEventListener('input', filterIcons);
    
    // Preset Modals
    document.getElementById('preset-save-btn')!.addEventListener('click', openSavePresetModal);
    document.getElementById('preset-save-cancel-btn')!.addEventListener('click', () => document.getElementById('preset-save-modal')!.classList.add('hidden'));
    document.getElementById('preset-save-confirm-btn')!.addEventListener('click', savePreset);
    document.getElementById('preset-delete-btn')!.addEventListener('click', openDeletePresetModal);
    document.getElementById('preset-delete-cancel-btn')!.addEventListener('click', () => document.getElementById('preset-delete-modal')!.classList.add('hidden'));
    document.getElementById('preset-delete-confirm-btn')!.addEventListener('click', deletePreset);
    document.getElementById('presets-select')!.addEventListener('change', applyPreset);
    
    // Preview Modal
    setupPreviewModalListeners();
}

// --- UI Helpers ---
export function setupRangeValueDisplays() {
    const ranges = [
        { input: 'text-opacity', out: 'text-opacity-value', unit: '%', scale: 100, fixed: 0 }, { input: 'text-padding', out: 'text-padding-value', unit: 'px' }, { input: 'text-line-height', out: 'text-line-height-value', unit: '', fixed: 1 }, { input: 'text-shadow-blur', out: 'text-shadow-blur-value', unit: 'px' }, { input: 'text-stroke-width', out: 'text-stroke-width-value', unit: 'px' },
        { input: 'logo-size', out: 'logo-size-value', unit: '%' }, { input: 'logo-opacity', out: 'logo-opacity-value', unit: '%', scale: 100, fixed: 0 }, { input: 'logo-padding', out: 'logo-padding-value', unit: 'px' },
        { input: 'icon-size', out: 'icon-size-value', unit: 'px' }, { input: 'icon-opacity', out: 'icon-opacity-value', unit: '%', scale: 100, fixed: 0 }, { input: 'icon-padding', out: 'icon-padding-value', unit: 'px' },
        { input: 'tile-opacity', out: 'tile-opacity-value', unit: '%', scale: 100, fixed: 0 }, { input: 'tile-rotation', out: 'tile-rotation-value', unit: '°' }, { input: 'tile-spacing', out: 'tile-spacing-value', unit: 'px' },
        { input: 'pattern-opacity', out: 'pattern-opacity-value', unit: '%', scale: 100, fixed: 0 }, { input: 'pattern-size', out: 'pattern-size-value', unit: 'px' },
        { input: 'frame-width', out: 'frame-width-value', unit: 'px' }, { input: 'frame-padding', out: 'frame-padding-value', unit: 'px' },
        { input: 'effect-brightness', out: 'effect-brightness-value', unit: '%', scale: 100, fixed: 0 }, { input: 'effect-contrast', out: 'effect-contrast-value', unit: '%', scale: 100, fixed: 0 }, { input: 'effect-grayscale', out: 'effect-grayscale-value', unit: '%', scale: 100, fixed: 0 },
        { input: 'effect-blur-radius', out: 'effect-blur-radius-value', unit: 'px' }, { input: 'effect-noise-amount', out: 'effect-noise-amount-value', unit: '%' }, { input: 'effect-sharpen-amount', out: 'effect-sharpen-amount-value', unit: '%' , scale: 100, fixed: 0},
        // FIX: Add range display for aiGhosting to complete the feature refactoring.
        { input: 'ai-ghosting-subtlety', out: 'ai-ghosting-subtlety-value', unit: '%' },
        { input: 'output-quality', out: 'output-quality-value', unit: '%', scale: 100, fixed: 0 },
    ];
    ranges.forEach(r => {
        const input = document.getElementById(r.input) as HTMLInputElement;
        const out = document.getElementById(r.out) as HTMLSpanElement;
        const update = () => {
            if (!input || !out) return;
            let value: number | string = parseFloat(input.value);
            if (r.scale) value *= r.scale;
            value = value.toFixed(r.fixed ?? 0);
            out.textContent = `${value}${r.unit}`;
        };
        input?.addEventListener('input', update);
        update();
    });
}

export function setupCollapsibleGroups() {
    document.querySelectorAll('.collapsible').forEach(header => {
        const groupBody = header.nextElementSibling as HTMLElement;

        const setMaxHeight = () => {
            if (header.classList.contains('active')) {
                // When active, set max-height to its scrollHeight to expand it.
                groupBody.style.maxHeight = groupBody.scrollHeight + 'px';
            } else {
                // When not active, collapse it.
                groupBody.style.maxHeight = '0';
            }
        };
        
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            setMaxHeight();
        });

        // Set initial state for all panels on load
        setMaxHeight();
    });
}

export function toggleControlGroups() {
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

export function populatePickers() {
    const AppState = getAppState();
    const iconGrid = document.getElementById('icon-picker-grid')!; 
    iconGrid.innerHTML = '';
    faIcons.forEach(icon => {
        const btn = document.createElement('button');
        btn.innerHTML = `<i class="${icon.class}"></i>`;
        btn.dataset.name = icon.name;
        btn.addEventListener('click', () => {
            AppState.selectedIcon = icon;
            const display = document.getElementById('icon-display')!;
            display.innerHTML = `<i class="${icon.class}"></i><span>${icon.name}</span>`;
            document.getElementById('icon-picker-modal')!.classList.add('hidden');
            updateSettingsAndPreview();
        });
        iconGrid.appendChild(btn);
    });

    const emojiGrid = document.getElementById('emoji-picker-grid')!;
    const textInput = document.getElementById('text-content') as HTMLInputElement;
    emojis.forEach(emoji => {
        const btn = document.createElement('button'); btn.textContent = emoji;
        btn.addEventListener('click', () => {
            textInput.value += emoji; 
            document.getElementById('emoji-picker-modal')!.classList.add('hidden'); 
            updateSettingsAndPreview();
        });
        emojiGrid.appendChild(btn);
    });
}

// --- Image Handling ---
function handleDragOver(e: DragEvent) { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).classList.add('dragover'); }
function handleDragLeave(e: DragEvent) { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).classList.remove('dragover'); }
async function handleDrop(e: DragEvent) {
    e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).classList.remove('dragover');
    if (!e.dataTransfer) return;
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/')).map(f => ({ name: f.name, path: (f as any).path }));
    await addImages(files);
}
async function handleAddImages() {
    const filePaths = await window.api.openImages();
    if (!filePaths || filePaths.length === 0) return;
    const files = filePaths.map(p => ({ name: p.split(/[/\\]/).pop()!, path: p }));
    await addImages(files);
}
async function addImages(newImages: { name: string, path: string }[]) {
    const AppState = getAppState();
    for (const image of newImages) {
        if (!AppState.images.some(existing => existing.path === image.path)) {
            const dimensions = await getImageDimensions(image.path);
            AppState.images.push({ ...image, ...dimensions });
        }
    }
    renderImageGrid();
    updateStartButtonState();
}
function handleClearImages() { getAppState().images = []; renderImageGrid(); updateStartButtonState(); }
function handleGridClick(e: MouseEvent) { const item = (e.target as HTMLElement).closest('.grid-item'); if (item) openPreview(parseInt((item as HTMLElement).dataset.index!, 10)); }

async function handleSelectLogo() {
    const AppState = getAppState();
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
async function handleSelectOutputDir() {
    const AppState = getAppState();
    const dir = await window.api.selectOutputDir();
    if (dir) { AppState.outputDir = dir; document.getElementById('output-dir-path')!.textContent = dir; updateStartButtonState(); }
}

// --- UI State Updates ---
function renderImageGrid() {
    const AppState = getAppState();
    const grid = document.getElementById('image-grid')!; const dropzone = document.getElementById('dropzone')!; const actions = document.getElementById('image-grid-actions')!;
    if (AppState.images.length === 0) {
        grid.innerHTML = ''; grid.classList.add('hidden'); actions.classList.add('hidden'); dropzone.classList.remove('hidden'); return;
    }
    dropzone.classList.add('hidden'); grid.classList.remove('hidden'); actions.classList.remove('hidden'); grid.innerHTML = '';
    AppState.images.forEach((image, index) => {
        const item = document.createElement('div'); item.className = 'grid-item'; item.dataset.index = String(index);
        const img = document.createElement('img'); img.src = image.path; img.alt = image.name; item.appendChild(img); grid.appendChild(item);
    });
}

function updateStartButtonState() { 
    const AppState = getAppState();
    (document.getElementById('start-btn') as HTMLButtonElement).disabled = !(AppState.images.length > 0 && AppState.outputDir); 
}

function filterIcons(e: Event) {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    document.querySelectorAll('#icon-picker-grid button').forEach(btn => {
        const name = (btn as HTMLElement).dataset.name!;
        (btn as HTMLElement).style.display = name.includes(query) ? 'block' : 'none';
    });
}
function getImageDimensions(path: string): Promise<{ originalWidth: number, originalHeight: number }> {
    return new Promise(resolve => {
        const img = new Image(); img.onload = () => resolve({ originalWidth: img.width, originalHeight: img.height }); img.onerror = () => resolve({ originalWidth: 0, originalHeight: 0 }); img.src = path;
    });
}

// --- Main Process ---
async function processImages() {
    const AppState = getAppState();
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
        
        // FIX: Add AI Ghosting logic to complete the feature refactoring.
        let dataUrl = await applyWatermarksToImage(image);
        if (dataUrl) {
            if (AppState.settings.aiGhosting && AppState.settings.aiGhosting.enabled) {
                document.getElementById('progress-text')!.textContent = `Applying AI Ghosting to ${image.name}...`;
                const result = await window.api.ghostWatermark({ dataUrl, subtlety: AppState.settings.aiGhosting.subtlety });
                if (result.success && result.dataUrl) {
                    dataUrl = result.dataUrl;
                } else {
                    console.warn(`AI Ghosting failed for ${image.name}: ${result.error}`);
                }
            }
            await window.api.saveFile({ dataUrl, directory: AppState.outputDir!, originalName: image.name, format: AppState.settings.output.format });
        }
        document.getElementById('progress-bar-inner')!.style.width = `${((i + 1) / total) * 100}%`;
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
