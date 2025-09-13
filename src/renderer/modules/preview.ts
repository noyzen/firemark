import { getAppState, setAppState } from './state';
import { drawImageEffects, drawFrameWatermark, drawPatternWatermark, drawTileWatermark, drawTextWatermark, drawLogoWatermark, drawIconWatermark, getPositionCoords } from './drawing';

// --- Preview Modal State & Elements ---
let previewState = {
    visible: false,
    index: 0,
    zoom: 1,
    pan: { x: 0, y: 0 },
    isPanning: false,
    isDragging: null as 'text' | 'logo' | 'icon' | null,
    dragOffset: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
    image: null as HTMLImageElement | null,
    showWatermark: true,
};

const modal = document.getElementById('preview-modal')!;
const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true })!;

// --- Public Functions ---
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

export function openPreview(index: number) {
    const AppState = getAppState();
    if (index < 0 || index >= AppState.images.length) return;
    
    previewState.index = index;
    previewState.image = new Image();
    previewState.image.onload = () => {
        modal.classList.remove('hidden');
        previewState.visible = true;
        resetZoomAndPan();
    };
    previewState.image.src = AppState.images[index].path;
}

export function isPreviewVisible() {
    return previewState.visible;
}

export function drawPreview() {
    if (!previewState.image || !previewState.visible) return;

    const AppState = getAppState();
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
        if (AppState.settings.text.enabled) drawTextWatermark(previewCtx, img.width, img.height);
        if (AppState.settings.logo.enabled && AppState.logoFile) drawLogoWatermark(previewCtx, img.width, img.height);
        if (AppState.settings.icon.enabled) drawIconWatermark(previewCtx, img.width, img.height);
    }
}

// --- Internal Functions ---
function closePreview() {
    modal.classList.add('hidden');
    previewState.visible = false;
    previewState.image = null;
}

function changePreviewImage(offset: number) {
    const AppState = getAppState();
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
    // Calculate the best fit scale and ensure it's not zero
    const scaleX = container.clientWidth / previewState.image.width;
    const scaleY = container.clientHeight / previewState.image.height;
    const scale = Math.min(scaleX, scaleY) * 0.95 || 1;

    previewState.zoom = scale;
    previewState.pan = { x: 0, y: 0 };
    drawPreview();
}

function getWatermarkBBox(type: 'text' | 'logo' | 'icon', imgWidth: number, imgHeight: number) {
    const AppState = getAppState();
    if (type === 'text' && AppState.settings.text.enabled) {
        const s = AppState.settings.text;
        const tempCtx = document.createElement('canvas').getContext('2d')!;
        tempCtx.font = `${s.italic ? 'italic ' : ''}${s.bold ? 'bold ' : ''}${s.fontSize}px ${s.fontFamily}`;
        const lines = String(s.content).split('\n');
        const metrics = lines.map(line => tempCtx.measureText(line));
        const w = Math.max(...metrics.map(m => m.width));
        const h = (lines.length -1) * (s.fontSize * s.lineHeight) + s.fontSize;
        const {x, y} = getPositionCoords(s.position, imgWidth, imgHeight, w, h, s.padding);
        return { x, y, w, h };
    }
    if (type === 'logo' && AppState.settings.logo.enabled && AppState.logoFile) {
        const s = AppState.settings.logo;
        const logo = AppState.logoFile.element;
        const w = imgWidth * (s.size / 100);
        const h = logo.height * (w / logo.width);
        const {x, y} = getPositionCoords(s.position, imgWidth, imgHeight, w, h, s.padding);
        return { x, y, w, h };
    }
    if(type === 'icon' && AppState.settings.icon.enabled) {
        const s = AppState.settings.icon;
        const tempCtx = document.createElement('canvas').getContext('2d')!;
        tempCtx.font = `900 ${s.size}px "Font Awesome 6 Free"`;
        const metrics = tempCtx.measureText(AppState.selectedIcon.unicode);
        const {x, y} = getPositionCoords(s.position, imgWidth, imgHeight, metrics.width, s.size, s.padding);
        return { x, y, w: metrics.width, h: s.size };
    }
    return null;
}

// --- Event Handlers ---
function handlePreviewMouseDown(e: MouseEvent) {
    const mouse = { x: e.offsetX / previewState.zoom, y: e.offsetY / previewState.zoom };

    const checkBBox = (type: 'text' | 'logo' | 'icon') => {
        const bbox = getWatermarkBBox(type, previewCanvas.width, previewCanvas.height);
        if (bbox && mouse.x > bbox.x && mouse.x < bbox.x + bbox.w && mouse.y > bbox.y && mouse.y < bbox.y + bbox.h) {
            previewState.isDragging = type;
            previewState.dragOffset = { x: mouse.x - bbox.x, y: mouse.y - bbox.y };
            document.querySelector(`#${type}-position .active`)?.classList.remove('active');
            return true;
        }
        return false;
    }

    if (checkBBox('text') || checkBBox('logo') || checkBBox('icon')) return;
    
    previewState.isPanning = true;
    previewState.startPan = { x: e.clientX - previewState.pan.x, y: e.clientY - previewState.pan.y };
}

function handlePreviewMouseMove(e: MouseEvent) {
    if (previewState.isDragging) {
        const AppState = getAppState();
        const mouse = { x: e.offsetX / previewState.zoom, y: e.offsetY / previewState.zoom };
        const type = previewState.isDragging;
        const bbox = getWatermarkBBox(type, previewCanvas.width, previewCanvas.height)!;
        const padding = AppState.settings[type].padding;

        const newX = mouse.x - previewState.dragOffset.x;
        const newY = mouse.y - previewState.dragOffset.y;

        const safeWidth = previewCanvas.width - bbox.w - padding * 2;
        const safeHeight = previewCanvas.height - bbox.h - padding * 2;

        AppState.settings[type].position.x = safeWidth > 0 ? (newX - padding) / safeWidth : 0.5;
        AppState.settings[type].position.y = safeHeight > 0 ? (newY - padding) / safeHeight : 0.5;

        AppState.settings[type].position.x = Math.max(0, Math.min(1, AppState.settings[type].position.x));
        AppState.settings[type].position.y = Math.max(0, Math.min(1, AppState.settings[type].position.y));

        drawPreview();
    } else if (previewState.isPanning) {
        previewState.pan.x = e.clientX - previewState.startPan.x;
        previewState.pan.y = e.clientY - previewState.startPan.y;
        drawPreview();
    }
}

function handlePreviewMouseUp() {
    previewState.isPanning = false;
    if (previewState.isDragging) {
        setAppState({ settings: getAppState().settings }); // Trigger settings save
    }
    previewState.isDragging = null;
}

function handlePreviewWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    changeZoom(factor);
}