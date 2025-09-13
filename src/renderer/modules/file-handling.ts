import { AppState } from './state';
import { renderImageGrid, updateStartButtonState, updateActiveLayerControls, renderAllLayerLists } from './ui';
import { applyWatermarksToImage } from './drawing';
import { updateSettingsAndPreview } from './settings';

function resetHeaderState() {
    const headerActions = document.getElementById('header-actions');
    const processingStatus = document.getElementById('processing-status');
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;

    if (!headerActions || !processingStatus || !startBtn) return;

    headerActions.classList.remove('hidden');
    processingStatus.classList.add('hidden');
    
    startBtn.querySelector('.btn-text')!.textContent = 'Start Watermarking';
    startBtn.querySelector('.btn-spinner')!.classList.add('hidden');
    startBtn.disabled = AppState.images.length === 0;
}

export async function handleDrop(e: DragEvent) {
    e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).classList.remove('dragover');
    if (!e.dataTransfer) return;
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/')).map(f => ({ name: f.name, path: (f as any).path }));
    await addImages(files);
}
export async function handleAddImages() {
    const filePaths = await window.api.openImages();
    if (!filePaths || filePaths.length === 0) return;
    const files = filePaths.map(p => ({ name: p.split(/[/\\]/).pop()!, path: p }));
    await addImages(files);
}
async function addImages(newImages: { name: string, path: string }[]) {
    for (const image of newImages) {
        if (!AppState.images.some(existing => existing.path === image.path)) {
            const dimensions = await getImageDimensions(image.path);
            AppState.images.push({ ...image, ...dimensions });
        }
    }
    renderImageGrid();
    resetHeaderState();
}
export function handleClearImages() { 
    AppState.images = []; 
    renderImageGrid(); 
    resetHeaderState();
}

function getImageDimensions(path: string): Promise<{ originalWidth: number, originalHeight: number }> {
    return new Promise(resolve => {
        const img = new Image(); img.onload = () => resolve({ originalWidth: img.width, originalHeight: img.height }); img.onerror = () => resolve({ originalWidth: 0, originalHeight: 0 }); img.src = path;
    });
}

export async function handleSelectOutputDir() {
    const dir = await window.api.selectOutputDir();
    if (dir) { AppState.outputDir = dir; document.getElementById('output-dir-path')!.textContent = dir; updateStartButtonState(); }
}
export async function handleSelectLogo(layerId: number) {
    const filePaths = await window.api.openImages();
    if (filePaths && filePaths.length > 0) {
        const file = { name: filePaths[0].split(/[/\\]/).pop()!, path: filePaths[0] };
        const logoImg = new Image();
        logoImg.src = file.path;
        logoImg.onload = () => {
            const newLayer = {
                id: layerId, enabled: true, name: file.name, path: file.path, element: logoImg,
                size: 15, opacity: 0.7, padding: 20, position: { x: 0.5, y: 0.5 }
            };
            AppState.settings.logos.push(newLayer);
            AppState.activeLayer = { type: 'logos', id: newLayer.id };
            renderAllLayerLists();
            updateActiveLayerControls();
            updateSettingsAndPreview();
        };
    }
}

export async function processImages() {
    if (!AppState.outputDir) {
        const dir = await window.api.selectOutputDir();
        if (dir) {
            AppState.outputDir = dir;
            document.getElementById('output-dir-path')!.textContent = dir;
        } else {
            return; // Abort if user cancels directory selection
        }
    }
    
    updateStartButtonState(); // Re-check if we can proceed

    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    if (startBtn.disabled) return;
    
    const clearBtn = document.getElementById('clear-images-btn') as HTMLButtonElement;
    const processingStatus = document.getElementById('processing-status')!;
    const progressContainer = document.getElementById('progress-container')!;
    const completionContainer = document.getElementById('completion-container')!;
    const progressText = document.getElementById('progress-text')!;
    const progressBarInner = document.getElementById('progress-bar-inner')!;
    
    startBtn.disabled = true;
    clearBtn.disabled = true;
    startBtn.querySelector('.btn-text')!.textContent = 'Processing...';
    startBtn.querySelector('.btn-spinner')!.classList.remove('hidden');

    processingStatus.classList.remove('hidden');
    progressContainer.classList.remove('hidden');
    completionContainer.classList.add('hidden');
    progressBarInner.style.width = '0%';
    
    const total = AppState.images.length;
    for (let i = 0; i < total; i++) {
        const image = AppState.images[i];
        progressText.textContent = `Processing ${i + 1} of ${total}: ${image.name}`;
        
        let dataUrl = await applyWatermarksToImage(image);
        if (dataUrl) {
            await window.api.saveFile({ dataUrl, directory: AppState.outputDir!, originalName: image.name, format: AppState.settings.output.format });
        }
        progressBarInner.style.width = `${((i + 1) / total) * 100}%`;
    }
    
    progressContainer.classList.add('hidden');
    completionContainer.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success);"></i><span>Processing complete!</span><button id="open-folder-btn" class="button-secondary">Open Output Folder</button>`;
    completionContainer.classList.remove('hidden');
    document.getElementById('open-folder-btn')!.addEventListener('click', () => window.api.openFolder(AppState.outputDir!));

    // Reset buttons to be active again for another run
    startBtn.disabled = false;
    clearBtn.disabled = false;
    startBtn.querySelector('.btn-text')!.textContent = 'Start Watermarking';
    startBtn.querySelector('.btn-spinner')!.classList.add('hidden');
}
