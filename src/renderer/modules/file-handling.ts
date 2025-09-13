import { AppState } from './state';
import { renderImageGrid, updateStartButtonState, updateActiveLayerControls, renderAllLayerLists } from './ui';
import { applyWatermarksToImage } from './drawing';
import { updateSettingsAndPreview } from './settings';

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
    updateStartButtonState();
}
export function handleClearImages() { 
    AppState.images = []; 
    renderImageGrid(); 
    updateStartButtonState(); 
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
        
        let dataUrl = await applyWatermarksToImage(image);
        if (dataUrl) {
            await window.api.saveFile({ dataUrl, directory: AppState.outputDir!, originalName: image.name, format: AppState.settings.output.format });
        }
        document.getElementById('progress-bar-inner')!.style.width = `${((i + 1) / total) * 100}%`;
    }
    
    progressContainer.innerHTML = `Processing complete! <button id="open-folder-btn" class="button-secondary">Open Output Folder</button>`;
    document.getElementById('open-folder-btn')!.addEventListener('click', () => window.api.openFolder(AppState.outputDir!));

    setTimeout(() => {
        btnText.textContent = 'Start Processing'; btnSpinner.classList.add('hidden');
        if(document.getElementById('progress-container')) { document.getElementById('progress-container')!.classList.add('hidden'); }
        updateStartButtonState();
    }, 5000);
}
