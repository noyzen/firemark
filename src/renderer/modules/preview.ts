import { AppState, previewState } from './state';
import { drawImageEffects, drawFrameWatermark, drawPatternWatermark, drawTileWatermark, drawSingleTextWatermark, drawSingleLogoWatermark, drawSingleIconWatermark, getWatermarkBBox } from './drawing';
import { updateSettingsAndPreview } from './settings';
import { selectLayer, updateActiveLayerControls } from './ui';

const modal = document.getElementById('preview-modal')!; 
const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement; 
const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true })!;

export function openPreview(index: number) {
    previewState.index = index; 
    previewState.image = new Image();
    previewState.image.onload = () => { 
        modal.classList.remove('hidden'); 
        previewState.visible = true; 
        resetZoomAndPan(); 
    };
    previewState.image.src = AppState.images[index].path;
}

function closePreview() { 
    modal.classList.add('hidden'); 
    previewState.visible = false; 
    previewState.image = null; 
}

function changePreviewImage(offset: number) { 
    let newIndex = previewState.index + offset; 
    if (newIndex < 0) newIndex = AppState.images.length - 1; 
    if (newIndex >= AppState.images.length) newIndex = 0; 
    openPreview(newIndex); 
}

function changeZoom(factor: number) { 
    previewState.zoom = Math.max(0.1, Math.min(previewState.zoom * factor, 10)); 
    drawPreview(); 
}

function resetZoomAndPan() {
    if (!previewState.image) return; 
    const container = document.getElementById('preview-canvas-container')!;
    const scale = Math.min(container.clientWidth / previewState.image.width, container.clientHeight / previewState.image.height) * 0.95;
    previewState.zoom = scale; 
    previewState.pan = { x: 0, y: 0 }; 
    drawPreview();
}

export function drawPreview() {
    if (!previewState.image || !previewState.visible) return; 
    const img = previewState.image; 
    previewCanvas.width = img.width; 
    previewCanvas.height = img.height;
    const container = document.getElementById('preview-canvas-container')!; 
    const displayWidth = img.width * previewState.zoom; 
    const displayHeight = img.height * previewState.zoom;
    previewCanvas.style.width = `${displayWidth}px`; 
    previewCanvas.style.height = `${displayHeight}px`; 
    const x = (container.clientWidth - displayWidth) / 2 + previewState.pan.x; 
    const y = (container.clientHeight - displayHeight) / 2 + previewState.pan.y;
    previewCanvas.style.transform = `translate(${x}px, ${y}px)`; 
    document.getElementById('zoom-level')!.textContent = `${Math.round(previewState.zoom * 100)}%`;
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height); 
    previewCtx.drawImage(img, 0, 0);
    if (previewState.showWatermark) {
        drawImageEffects(previewCtx, img.width, img.height);
        if (AppState.settings.frame.enabled) drawFrameWatermark(previewCtx, img.width, img.height);
        if (AppState.settings.pattern.enabled) drawPatternWatermark(previewCtx, img.width, img.height);
        if (AppState.settings.tile.enabled) drawTileWatermark(previewCtx, img.width, img.height);
        AppState.settings.texts?.forEach(t => { if(t.enabled) drawSingleTextWatermark(previewCtx, img.width, img.height, t) });
        AppState.settings.logos?.forEach(l => { if(l.enabled && l.element) drawSingleLogoWatermark(previewCtx, img.width, img.height, l) });
        AppState.settings.icons?.forEach(i => { if(i.enabled) drawSingleIconWatermark(previewCtx, img.width, img.height, i) });
    }
}

function handlePreviewMouseDown(e: MouseEvent) {
    const mouse = { x: e.offsetX / previewState.zoom, y: e.offsetY / previewState.zoom };
    const layerTypes: ('texts' | 'logos' | 'icons')[] = ['texts', 'logos', 'icons'];
    
    for (const type of layerTypes) {
        if(!AppState.settings[type]) continue;
        for (let i = AppState.settings[type].length - 1; i >= 0; i--) {
            const layer = AppState.settings[type][i];
            if (!layer.enabled) continue;
            
            const bbox = getWatermarkBBox(type, layer, previewCanvas.width, previewCanvas.height);
            if (bbox && mouse.x > bbox.x && mouse.x < bbox.x + bbox.w && mouse.y > bbox.y && mouse.y < bbox.y + bbox.h) {
                previewState.isDragging = { type, id: layer.id };
                previewState.dragOffset = { x: mouse.x - bbox.x, y: mouse.y - bbox.y };
                selectLayer(type, layer.id);
                return;
            }
        }
    }

    previewState.isPanning = true; 
    previewState.startPan = { x: e.clientX - previewState.pan.x, y: e.clientY - previewState.pan.y };
}

function handlePreviewMouseMove(e: MouseEvent) {
    if (previewState.isDragging) {
        const { type, id } = previewState.isDragging;
        const layer = AppState.settings[type].find(l => l.id === id);
        if (!layer) return;

        const mouse = { x: e.offsetX / previewState.zoom, y: e.offsetY / previewState.zoom };
        const bbox = getWatermarkBBox(type, layer, previewCanvas.width, previewCanvas.height)!;
        const newX = mouse.x - previewState.dragOffset.x;
        const newY = mouse.y - previewState.dragOffset.y;

        const safeWidth = previewCanvas.width - bbox.w - layer.padding * 2;
        const safeHeight = previewCanvas.height - bbox.h - layer.padding * 2;

        layer.position.x = safeWidth > 0 ? (newX - layer.padding) / safeWidth : 0.5;
        layer.position.y = safeHeight > 0 ? (newY - layer.padding) / safeHeight : 0.5;
        layer.position.x = Math.max(0, Math.min(1, layer.position.x));
        layer.position.y = Math.max(0, Math.min(1, layer.position.y));

        updateActiveLayerControls();
        drawPreview();
    } else if (previewState.isPanning) {
        previewState.pan.x = e.clientX - previewState.startPan.x;
        previewState.pan.y = e.clientY - previewState.startPan.y;
        drawPreview();
    }
}

function handlePreviewMouseUp() { 
    if(previewState.isDragging) {
        updateSettingsAndPreview();
    }
    previewState.isPanning = false; 
    previewState.isDragging = null; 
}

function handlePreviewWheel(e: WheelEvent) { 
    e.preventDefault(); 
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1; 
    changeZoom(factor); 
}

export function setupPreviewModalListeners() {
    document.getElementById('preview-close-btn')!.addEventListener('click', closePreview); 
    document.getElementById('preview-backdrop')!.addEventListener('click', closePreview);
    document.getElementById('zoom-in-btn')!.addEventListener('click', () => changeZoom(1.25)); 
    document.getElementById('zoom-out-btn')!.addEventListener('click', () => changeZoom(0.8)); 
    document.getElementById('zoom-reset-btn')!.addEventListener('click', resetZoomAndPan);
    document.getElementById('next-image-btn')!.addEventListener('click', () => changePreviewImage(1)); 
    document.getElementById('prev-image-btn')!.addEventListener('click', () => changePreviewImage(-1));
    const toggleBtn = document.getElementById('toggle-watermark-btn')!;
    toggleBtn.addEventListener('mousedown', () => { previewState.showWatermark = false; drawPreview(); });
    toggleBtn.addEventListener('mouseup', () => { previewState.showWatermark = true; drawPreview(); });
    toggleBtn.addEventListener('mouseleave', () => { previewState.showWatermark = true; drawPreview(); });
    previewCanvas.addEventListener('mousedown', handlePreviewMouseDown); 
    previewCanvas.addEventListener('mousemove', handlePreviewMouseMove); 
    previewCanvas.addEventListener('mouseup', handlePreviewMouseUp);
    previewCanvas.addEventListener('mouseleave', handlePreviewMouseUp); 
    previewCanvas.addEventListener('wheel', handlePreviewWheel, { passive: false });
}
