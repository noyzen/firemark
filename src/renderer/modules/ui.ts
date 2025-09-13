
import { AppState, emojis } from './state';
import { updateSettingsAndPreview, applyPreset, openSavePresetModal, openDeletePresetModal, deletePreset, savePreset } from './settings';
import { handleSelectLogo } from './file-handling';
import { openPreview, drawPreview } from './preview';
import { getWatermarkBBox } from './drawing';
import { previewState } from './state';

const gridView = document.getElementById('grid-view')!;
const previewView = document.getElementById('preview-view')!;

export function showPreview() {
    gridView.classList.add('hidden');
    previewView.classList.remove('hidden');
    drawPreview();
}

export function showGrid() {
    previewView.classList.add('hidden');
    gridView.classList.remove('hidden');
    AppState.activeLayer = null;
    updateActiveLayerControls();
}


export function addLayer(type: 'texts' | 'logos' | 'icons') {
    const newLayer: any = { id: Date.now(), enabled: true, freePlacement: false };
    switch (type) {
        case 'texts':
            Object.assign(newLayer, { content: 'New Text', fontFamily: 'Arial', fontSize: 48, bold: false, italic: false, align: 'left', lineHeight: 1.2, color: '#FFFFFF', opacity: 0.7, padding: 20, gradient: { enabled: false, color: '#4a90e2', direction: 'vertical' }, stroke: { enabled: false, color: '#000000', width: 2 }, shadow: { enabled: false, color: '#000000', blur: 5 }, position: { x: 0.5, y: 0.5 } });
            break;
        case 'logos':
            handleSelectLogo(newLayer.id);
            return;
        case 'icons':
            const defaultIcon = { class: 'fa-solid fa-copyright', unicode: '\u00a9', name: 'copyright' };
            Object.assign(newLayer, { icon: defaultIcon, size: 64, color: '#FFFFFF', opacity: 0.7, padding: 20, position: { x: 0.5, y: 0.5 } });
            break;
    }
    AppState.settings[type].push(newLayer);
    AppState.activeLayer = { type, id: newLayer.id };
    renderAllLayerLists();
    updateActiveLayerControls();
    updateSettingsAndPreview();
}

function deleteLayer(type: 'texts' | 'logos' | 'icons', id: number) {
    AppState.settings[type] = AppState.settings[type].filter((layer: { id: number; }) => layer.id !== id);
    if (AppState.activeLayer && AppState.activeLayer.id === id) {
        AppState.activeLayer = null;
    }
    renderAllLayerLists();
    updateActiveLayerControls();
    updateSettingsAndPreview();
}

export function selectLayer(type: 'texts' | 'logos' | 'icons', id: number) {
    AppState.activeLayer = { type, id };
    renderAllLayerLists();
    updateActiveLayerControls();
}

export function renderAllLayerLists() {
    renderLayerList('texts');
    renderLayerList('logos');
    renderLayerList('icons');
}

function renderLayerList(type: 'texts' | 'logos' | 'icons') {
    const listEl = document.getElementById(`${type.slice(0, -1)}-layers-list`)!;
    listEl.innerHTML = '';
    AppState.settings[type]?.forEach((layer: any) => {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.dataset.id = layer.id;
        if (AppState.activeLayer?.type === type && AppState.activeLayer?.id === layer.id) {
            item.classList.add('editing');
        }

        let contentPreview = '';
        if (type === 'texts') contentPreview = `<div class="layer-item-content">${layer.content}</div>`;
        if (type === 'logos') contentPreview = `<img src="${layer.path}" class="layer-item-logo-preview"><div class="layer-item-content">${layer.name}</div>`;
        if (type === 'icons') contentPreview = `<div class="layer-item-icon-preview"><i class="${layer.icon.class}"></i></div><div class="layer-item-content">${layer.icon.name}</div>`;
        
        item.innerHTML = `
            <label class="toggle-switch"><input type="checkbox" ${layer.enabled ? 'checked' : ''}><span class="slider"></span></label>
            ${contentPreview}
            <div class="layer-item-actions">
                <button class="delete-layer-btn" title="Delete Layer"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        item.querySelector('.delete-layer-btn')!.addEventListener('click', (e) => { e.stopPropagation(); deleteLayer(type, layer.id); });
        
        // Let the global input/change handler manage the toggle state
        item.addEventListener('click', (e) => {
            if((e.target as HTMLElement).closest('.toggle-switch')) return;
            selectLayer(type, layer.id)
        });
        
        listEl.appendChild(item);
    });
}

export function updateActiveLayerControls() {
    document.getElementById('text-controls-wrapper')!.classList.toggle('disabled', AppState.activeLayer?.type !== 'texts');
    document.getElementById('logo-controls-wrapper')!.classList.toggle('disabled', AppState.activeLayer?.type !== 'logos');
    document.getElementById('icon-controls-wrapper')!.classList.toggle('disabled', AppState.activeLayer?.type !== 'icons');

    if (!AppState.activeLayer) return;

    const { type, id } = AppState.activeLayer;
    const layer = AppState.settings[type]?.find((l: { id: any; }) => l.id === id);
    if (!layer) return;

    const setValue = (elId: string, value: any, type = 'value') => { if (value === undefined) return; const el = document.getElementById(elId) as any; if (el) el[type] = value; };
    const setChecked = (elId: string, value: boolean) => setValue(elId, value, 'checked');
    const setActive = (elId: string, value: boolean) => document.getElementById(elId)?.classList.toggle('active', !!value);
    const setPosition = (containerId: string, pos: { x: number, y: number }) => {
        document.querySelectorAll(`#${containerId} button`).forEach(b => b.classList.remove('active'));
        const yStr = pos.y < 0.25 ? 'top' : pos.y > 0.75 ? 'bottom' : 'center';
        const xStr = pos.x < 0.25 ? 'left' : pos.x > 0.75 ? 'right' : 'center';
        let posStr = `${yStr}-${xStr}`;
        if(posStr === 'center-center') posStr = 'center';
        
        const btn = document.querySelector(`#${containerId} button[data-position="${posStr}"]`);
        if (btn) btn.classList.add('active');
    };

    if (type === 'texts') {
        const s = layer;
        setValue('text-content', s.content); setValue('text-font-family', s.fontFamily); setValue('text-font-size', s.fontSize); setActive('text-bold', s.bold); setActive('text-italic', s.italic); setValue('text-color', s.color); setValue('text-opacity', s.opacity); setValue('text-padding', s.padding); setValue('text-line-height', s.lineHeight); setChecked('text-free-placement', s.freePlacement);
        document.querySelectorAll('[data-align]').forEach(el => el.classList.remove('active')); setActive(`text-align-${s.align}`, true);
        if(s.gradient) { setChecked('text-gradient-enable', s.gradient.enabled); setValue('text-gradient-color', s.gradient.color); setValue('text-gradient-direction', s.gradient.direction); }
        if(s.stroke) { setChecked('text-stroke-enable', s.stroke.enabled); setValue('text-stroke-color', s.stroke.color); setValue('text-stroke-width', s.stroke.width); }
        if(s.shadow) { setChecked('text-shadow-enable', s.shadow.enabled); setValue('text-shadow-color', s.shadow.color); setValue('text-shadow-blur', s.shadow.blur); }
        if(!s.freePlacement && s.position) setPosition('text-position', s.position);
        document.getElementById('text-controls-wrapper')!.classList.toggle('free-placement-active', !!s.freePlacement);
        document.getElementById('text-recenter-container')!.classList.toggle('hidden', !s.freePlacement);
    } else if (type === 'logos') {
        const s = layer;
        setValue('logo-size', s.size); setValue('logo-opacity', s.opacity); setValue('logo-padding', s.padding); setChecked('logo-free-placement', s.freePlacement);
        document.getElementById('logo-filename')!.textContent = s.name;
        (document.getElementById('logo-preview') as HTMLImageElement)!.src = s.path;
        document.getElementById('logo-preview-container')!.classList.remove('hidden');
        if(!s.freePlacement && s.position) setPosition('logo-position', s.position);
        document.getElementById('logo-controls-wrapper')!.classList.toggle('free-placement-active', !!s.freePlacement);
        document.getElementById('logo-recenter-container')!.classList.toggle('hidden', !s.freePlacement);
    } else if (type === 'icons') {
        const s = layer;
        const display = document.getElementById('icon-display')!;
        display.innerHTML = `<i class="${s.icon.class}"></i><span>${s.icon.name}</span>`;
        setValue('icon-size', s.size); setValue('icon-color', s.color); setValue('icon-opacity', s.opacity); setValue('icon-padding', s.padding); setChecked('icon-free-placement', s.freePlacement);
        if(!s.freePlacement && s.position) setPosition('icon-position', s.position);
        document.getElementById('icon-controls-wrapper')!.classList.toggle('free-placement-active', !!s.freePlacement);
        document.getElementById('icon-recenter-container')!.classList.toggle('hidden', !s.freePlacement);
    }

    toggleControlGroups();
    setupRangeValueDisplays();
}

export function renderImageGrid() {
    const grid = document.getElementById('image-grid')!; 
    const dropzone = document.getElementById('dropzone')!; 
    const gridHeader = document.getElementById('grid-header')!;
    const gridTitle = document.getElementById('grid-title')!;

    if (AppState.images.length === 0) {
        grid.innerHTML = ''; 
        grid.classList.add('hidden'); 
        gridHeader.classList.add('hidden');
        dropzone.classList.remove('hidden'); 
        return;
    }

    dropzone.classList.add('hidden'); 
    grid.classList.remove('hidden'); 
    gridHeader.classList.remove('hidden');
    gridTitle.textContent = `Image List (${AppState.images.length} items)`;
    grid.innerHTML = '';
    
    AppState.images.forEach((image, index) => {
        const item = document.createElement('div'); 
        item.className = 'grid-item'; 
        item.dataset.index = String(index);
        item.innerHTML = `
            <div class="grid-item-thumbnail">
                <img src="${image.path}" alt="${image.name}" loading="lazy">
            </div>
            <span class="grid-item-name">${image.name}</span>
        `;
        grid.appendChild(item);
    });
}
export function handleGridClick(e: MouseEvent) { 
    const item = (e.target as HTMLElement).closest('.grid-item'); 
    if (item) openPreview(parseInt((item as HTMLElement).dataset.index!, 10)); 
}

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
        const body = header.nextElementSibling as HTMLElement;
        if (!body) return;

        header.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            // Allow the icon to toggle, but prevent other controls (like the switch) from toggling.
            if (target.closest('.header-controls') && !target.classList.contains('collapse-icon')) {
                return;
            }

            header.classList.toggle('active');

            if (header.classList.contains('active')) {
                body.style.paddingTop = '16px';
                body.style.paddingBottom = '16px';
                body.style.maxHeight = body.scrollHeight + 'px';
            } else {
                body.style.maxHeight = body.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    body.style.maxHeight = '0px';
                    body.style.paddingTop = '0';
                    body.style.paddingBottom = '0';
                });
            }
        });
        
        body.addEventListener('transitionend', () => {
            if (header.classList.contains('active')) {
                body.style.maxHeight = 'none';
            }
        });

        if (header.classList.contains('active')) {
            setTimeout(() => {
                body.style.paddingTop = '16px';
                body.style.paddingBottom = '16px';
                body.style.maxHeight = body.scrollHeight + 'px';
            }, 150);
        } else {
            body.style.paddingTop = '0';
            body.style.paddingBottom = '0';
            body.style.maxHeight = '0px';
        }
    });
}
export function toggleControlGroups() {
    const isChecked = (id: string) => (document.getElementById(id) as HTMLInputElement).checked;
    
    document.querySelector('#text-group .group-body')!.classList.toggle('disabled', !isChecked('text-group-enable'));
    document.querySelector('#logo-group .group-body')!.classList.toggle('disabled', !isChecked('logo-group-enable'));
    document.querySelector('#icon-group .group-body')!.classList.toggle('disabled', !isChecked('icon-group-enable'));
    document.querySelector('#effects-group .group-body')!.classList.toggle('disabled', !isChecked('effects-group-enable'));

    document.getElementById('text-gradient-controls')!.classList.toggle('hidden', !isChecked('text-gradient-enable'));
    document.getElementById('text-stroke-controls')!.classList.toggle('hidden', !isChecked('text-stroke-enable'));
    document.getElementById('text-shadow-controls')!.classList.toggle('hidden', !isChecked('text-shadow-enable'));
    document.getElementById('tile-text-options')!.classList.toggle('hidden', isChecked('tile-use-logo'));
    
    const format = (document.getElementById('output-format') as HTMLSelectElement).value;
    document.getElementById('quality-control')!.classList.toggle('hidden', format === 'png');
    document.getElementById('png-info-control')!.classList.toggle('hidden', format !== 'png');

    const mode = (document.getElementById('resize-mode') as HTMLSelectElement).value;
    const resizeControls = document.getElementById('resize-controls')!;
    resizeControls.classList.toggle('hidden', mode === 'none');
    (document.getElementById('resize-width') as HTMLElement).style.display = (mode === 'width' || mode === 'fit') ? 'block' : 'none';
    (document.getElementById('resize-height') as HTMLElement).style.display = (mode === 'height' || mode === 'fit') ? 'block' : 'none';
}
export async function populatePickers() {
    const faIcons: { class: string; unicode: string; name: string }[] = [];
    try {
        const response = await fetch('../../fonts/all.min.css');
        if (!response.ok) throw new Error(`Failed to load Font Awesome CSS: ${response.statusText}`);
        const cssText = await response.text();

        const ruleRegex = /([^{}]+?)\s*\{\s*content:\s*"\\([a-fA-F0-9]+)"/g;
        let match;
        while ((match = ruleRegex.exec(cssText)) !== null) {
            const selectors = match[1];
            const unicode = String.fromCharCode(parseInt(match[2], 16));

            if (!selectors.includes('::before')) continue;

            const individualSelectors = selectors.split(',');
            for (const selector of individualSelectors) {
                const trimmedSelector = selector.trim();
                if (!trimmedSelector.startsWith('.fa-')) continue;

                const parts = trimmedSelector.split('.fa-');
                const namePart = parts.pop();
                if (!namePart) continue;

                const name = namePart.split('::')[0].trim();
                if (!name) continue;
                
                let style = 'solid';
                if (trimmedSelector.includes('.fa-brands')) style = 'brands';
                else if (trimmedSelector.includes('.fa-regular')) style = 'regular';
                
                const fullClassName = `fa-${style} fa-${name}`;
                
                if (!faIcons.some(i => i.class === fullClassName)) {
                    faIcons.push({ class: fullClassName, unicode, name });
                }
            }
        }
    } catch (e) {
        console.error("Could not parse Font Awesome stylesheet. Icon picker may be incomplete.", e);
    }
    
    const uniqueIcons = faIcons.sort((a, b) => a.name.localeCompare(b.name));

    const iconGrid = document.getElementById('icon-picker-grid')!; 
    iconGrid.innerHTML = '';
    uniqueIcons.forEach(icon => {
        const btn = document.createElement('button');
        btn.innerHTML = `<i class="${icon.class}"></i>`;
        btn.dataset.name = icon.name;
        btn.title = icon.name;
        btn.addEventListener('click', () => {
            if (AppState.activeLayer?.type === 'icons') {
                const layer = AppState.settings.icons.find((l: { id: number; }) => l.id === AppState.activeLayer!.id);
                if (layer) layer.icon = icon;
                updateActiveLayerControls();
                updateSettingsAndPreview();
            }
            document.getElementById('icon-picker-modal')!.classList.add('hidden');
        });
        iconGrid.appendChild(btn);
    });

    const emojiGrid = document.getElementById('emoji-picker-grid')!;
    const textInput = document.getElementById('text-content') as HTMLInputElement;
    emojis.forEach(emoji => {
        const btn = document.createElement('button'); btn.textContent = emoji;
        btn.addEventListener('click', () => {
            textInput.value += emoji; document.getElementById('emoji-picker-modal')!.classList.add('hidden'); updateSettingsAndPreview();
        });
        emojiGrid.appendChild(btn);
    });
}
export function filterIcons(e: Event) {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    document.querySelectorAll('#icon-picker-grid button').forEach(btn => {
        const name = (btn as HTMLElement).dataset.name!;
        (btn as HTMLElement).style.display = name.includes(query) ? 'block' : 'none';
    });
}
export function updateStartButtonState() { 
    (document.getElementById('start-btn') as HTMLButtonElement).disabled = AppState.images.length === 0;
}

function updateIndicator(groupId: string, countOrState: number | boolean | undefined) {
    const groupHeader = document.getElementById(groupId)?.querySelector('.group-header');
    if (!groupHeader) return;
    const indicator = groupHeader.querySelector('.header-indicator') as HTMLElement;
    if (!indicator) return;

    if (typeof countOrState === 'number') {
        indicator.textContent = countOrState > 0 ? `(${countOrState})` : '';
        indicator.classList.remove('on');
    } else if (typeof countOrState === 'boolean') {
        indicator.textContent = countOrState ? 'On' : '';
        indicator.classList.toggle('on', countOrState);
    } else {
        indicator.textContent = '';
        indicator.classList.remove('on');
    }
}

export function updateCollapsibleIndicators() {
    updateIndicator('text-group', AppState.settings.texts?.filter(t => t.enabled).length || 0);
    updateIndicator('logo-group', AppState.settings.logos?.filter(l => l.enabled).length || 0);
    updateIndicator('icon-group', AppState.settings.icons?.filter(i => i.enabled).length || 0);
    updateIndicator('tile-group', AppState.settings.tile?.enabled);
    updateIndicator('pattern-group', AppState.settings.pattern?.enabled);
    updateIndicator('frame-group', AppState.settings.frame?.enabled);
    updateIndicator('effects-group', AppState.settings.effectsEnabled);
}

function recenterActiveLayer() {
    if (!AppState.activeLayer || !previewState.image) return;
    const { type, id } = AppState.activeLayer;
    const layer = AppState.settings[type]?.find((l: { id: any; }) => l.id === id);
    if (layer && layer.freePlacement) {
        const { width, height } = previewState.image;
        const bbox = getWatermarkBBox(type, layer, width, height);
        if (bbox) {
            const centerX = (width - bbox.w) / 2;
            const centerY = (height - bbox.h) / 2;
            layer.position.x = centerX / width;
            layer.position.y = centerY / height;
            updateActiveLayerControls();
            updateSettingsAndPreview();
        }
    }
}

export const UIEvents = {
    addLayer,
    applyPreset,
    openSavePresetModal,
    savePreset,
    openDeletePresetModal,
    deletePreset,
    filterIcons,
    recenterActiveLayer,
};
