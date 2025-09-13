// --- Window Controls Setup ---
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const maxIcon = document.getElementById('max-icon');
const closeBtn = document.getElementById('close-btn');

async function refreshMaxButton() {
  try {
    const maximized = await window.windowControls.isMaximized();
    document.body.classList.toggle('maximized', maximized);
    if (maximized) {
      maxIcon.classList.remove('fa-window-maximize');
      maxIcon.classList.add('fa-window-restore');
      maxBtn.title = 'Restore';
    } else {
      maxIcon.classList.remove('fa-window-restore');
      maxIcon.classList.add('fa-window-maximize');
      maxBtn.title = 'Maximize';
    }
  } catch {}
}

minBtn?.addEventListener('click', () => window.windowControls.minimize());
maxBtn?.addEventListener('click', () => window.windowControls.maximize());
closeBtn?.addEventListener('click', () => window.windowControls.close());
window.windowControls.onMaximizeChanged(refreshMaxButton);

// --- Firemark Application Logic ---

const AppState = {
    images: [], // Array of { name: string, path: string }
    outputDir: null,
    logoFile: null, // { name: string, path: string }
    settings: {},
};

document.addEventListener('DOMContentLoaded', () => {
    // Initial UI setup
    document.getElementById('window-title').querySelector('span').textContent = 'Firemark';
    refreshMaxButton();
    setupEventListeners();
    updateSettings();
    toggleControlGroups();
});

function setupEventListeners() {
    const dropzone = document.getElementById('dropzone');
    const addImagesBtn = document.getElementById('add-images-btn');
    const clearImagesBtn = document.getElementById('clear-images-btn');
    const outputDirBtn = document.getElementById('output-dir-btn');
    const startBtn = document.getElementById('start-btn');
    const logoSelectBtn = document.getElementById('logo-select-btn');

    // Drag and Drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
        const files = [...e.dataTransfer.files]
            .filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
            .map(f => ({ name: f.name, path: f.path }));
        addImages(files);
    });
    
    // Button Clicks
    addImagesBtn.addEventListener('click', async () => {
        const filePaths = await window.api.openImages();
        const files = filePaths.map(p => ({ name: p.split(/[/\\]/).pop(), path: p }));
        addImages(files);
    });

    clearImagesBtn.addEventListener('click', () => {
        AppState.images = [];
        renderImageGrid();
        updateStartButtonState();
    });

    outputDirBtn.addEventListener('click', async () => {
        const dir = await window.api.selectOutputDir();
        if (dir) {
            AppState.outputDir = dir;
            document.getElementById('output-dir-path').textContent = dir;
            updateStartButtonState();
        }
    });

    logoSelectBtn.addEventListener('click', async () => {
        const filePaths = await window.api.openImages(); // Re-use image dialog
        if (filePaths.length > 0) {
            const file = { name: filePaths[0].split(/[/\\]/).pop(), path: filePaths[0] };
            AppState.logoFile = file;
            document.getElementById('logo-filename').textContent = file.name;
            const logoPreview = document.getElementById('logo-preview');
            logoPreview.src = file.path;
            document.getElementById('logo-preview-container').classList.remove('hidden');
        }
    });

    startBtn.addEventListener('click', processImages);

    // Settings listeners
    document.querySelectorAll('.control-group input, .control-group button').forEach(el => {
        el.addEventListener('input', updateSettings);
        el.addEventListener('change', updateSettings); // For color, checkbox
        el.addEventListener('click', (e) => {
             if (e.target.closest('.position-grid')) {
                e.target.closest('.position-grid').querySelectorAll('button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                updateSettings();
             }
        });
    });

    document.querySelectorAll('.toggle-switch input').forEach(el => {
        el.addEventListener('change', toggleControlGroups);
    });
}

function addImages(newImages) {
    AppState.images.push(...newImages);
    renderImageGrid();
    updateStartButtonState();
}

function renderImageGrid() {
    const grid = document.getElementById('image-grid');
    const dropzone = document.getElementById('dropzone');
    const actions = document.getElementById('image-grid-actions');

    if (AppState.images.length === 0) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
        actions.classList.add('hidden');
        dropzone.classList.remove('hidden');
        return;
    }

    dropzone.classList.add('hidden');
    grid.classList.remove('hidden');
    actions.classList.remove('hidden');

    grid.innerHTML = '';
    AppState.images.forEach(image => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        const img = document.createElement('img');
        // Use blob URLs for better performance and to handle special characters in paths
        fetch(image.path).then(res => res.blob()).then(blob => {
            img.src = URL.createObjectURL(blob);
            img.onload = () => URL.revokeObjectURL(img.src);
        });
        
        item.appendChild(img);
        grid.appendChild(item);
    });
}

function updateSettings() {
    const getPosition = (containerId) => document.querySelector(`#${containerId} button.active`)?.dataset.position || 'center';

    AppState.settings = {
        text: {
            enabled: document.getElementById('text-enable').checked,
            content: document.getElementById('text-content').value,
            fontSize: parseInt(document.getElementById('text-font-size').value, 10),
            color: document.getElementById('text-color').value,
            opacity: parseFloat(document.getElementById('text-opacity').value),
            position: getPosition('text-position'),
        },
        logo: {
            enabled: document.getElementById('logo-enable').checked,
            size: parseInt(document.getElementById('logo-size').value, 10),
            opacity: parseFloat(document.getElementById('logo-opacity').value),
            position: getPosition('logo-position'),
        },
        tile: {
            enabled: document.getElementById('tile-enable').checked,
            content: document.getElementById('tile-text-content').value,
            fontSize: parseInt(document.getElementById('tile-font-size').value, 10),
            opacity: parseFloat(document.getElementById('tile-opacity').value),
            rotation: parseInt(document.getElementById('tile-rotation').value, 10),
        }
    };
}

function toggleControlGroups() {
    document.getElementById('text-controls').style.display = document.getElementById('text-enable').checked ? 'grid' : 'none';
    document.getElementById('logo-controls').style.display = document.getElementById('logo-enable').checked ? 'grid' : 'none';
    document.getElementById('tile-controls').style.display = document.getElementById('tile-enable').checked ? 'grid' : 'none';
}

function updateStartButtonState() {
    const startBtn = document.getElementById('start-btn');
    startBtn.disabled = !(AppState.images.length > 0 && AppState.outputDir);
}

async function processImages() {
    const startBtn = document.getElementById('start-btn');
    const btnText = startBtn.querySelector('.btn-text');
    const btnSpinner = startBtn.querySelector('.btn-spinner');
    const progressContainer = document.getElementById('progress-container');
    const progressText = document.getElementById('progress-text');
    const progressBarInner = document.getElementById('progress-bar-inner');
    
    startBtn.disabled = true;
    btnText.textContent = 'Processing...';
    btnSpinner.classList.remove('hidden');
    progressContainer.classList.remove('hidden');

    const total = AppState.images.length;
    let processedCount = 0;

    for (const image of AppState.images) {
        processedCount++;
        progressText.textContent = `Processing ${processedCount} of ${total}: ${image.name}`;
        progressBarInner.style.width = `${(processedCount / total) * 100}%`;
        
        const dataUrl = await applyWatermarksToImage(image.path);
        if (dataUrl) {
            await window.api.saveFile({
                dataUrl,
                directory: AppState.outputDir,
                originalName: image.name,
            });
        }
    }
    
    progressText.textContent = 'Done!';
    setTimeout(() => {
        startBtn.disabled = false;
        btnText.textContent = 'Start Processing';
        btnSpinner.classList.add('hidden');
        progressContainer.classList.add('hidden');
        progressBarInner.style.width = '0%';
    }, 2000);
}


async function applyWatermarksToImage(imagePath) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = async () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Apply watermarks
            if (AppState.settings.tile.enabled) applyTileWatermark(ctx, canvas.width, canvas.height);
            if (AppState.settings.text.enabled) applyTextWatermark(ctx, canvas.width, canvas.height);
            if (AppState.settings.logo.enabled && AppState.logoFile) {
                await applyLogoWatermark(ctx, canvas.width, canvas.height);
            }
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = imagePath;
    });
}

function getPositionCoords(pos, w, h, margin = 20) {
    const positions = {
        'top-left': { x: margin, y: margin, textAlign: 'left', textBaseline: 'top' },
        'top-center': { x: w / 2, y: margin, textAlign: 'center', textBaseline: 'top' },
        'top-right': { x: w - margin, y: margin, textAlign: 'right', textBaseline: 'top' },
        'center-left': { x: margin, y: h / 2, textAlign: 'left', textBaseline: 'middle' },
        'center': { x: w / 2, y: h / 2, textAlign: 'center', textBaseline: 'middle' },
        'center-right': { x: w - margin, y: h / 2, textAlign: 'right', textBaseline: 'middle' },
        'bottom-left': { x: margin, y: h - margin, textAlign: 'left', textBaseline: 'bottom' },
        'bottom-center': { x: w / 2, y: h - margin, textAlign: 'center', textBaseline: 'bottom' },
        'bottom-right': { x: w - margin, y: h - margin, textAlign: 'right', textBaseline: 'bottom' },
    };
    return positions[pos];
}

function applyTextWatermark(ctx, width, height) {
    const { content, fontSize, color, opacity, position } = AppState.settings.text;
    const coords = getPositionCoords(position, width, height, fontSize);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = coords.textAlign;
    ctx.textBaseline = coords.textBaseline;
    ctx.fillText(content, coords.x, coords.y);
    ctx.globalAlpha = 1.0;
}

async function applyLogoWatermark(ctx, width, height) {
    return new Promise(resolve => {
        const { size, opacity, position } = AppState.settings.logo;
        const logoImg = new Image();
        logoImg.crossOrigin = "Anonymous";
        logoImg.onload = () => {
            const logoWidth = width * (size / 100);
            const logoHeight = logoImg.height * (logoWidth / logoImg.width);
            const coords = getPositionCoords(position, width, height, 0); // use custom logic for logo coords

            let x = coords.x;
            let y = coords.y;
            const margin = 20;

            if (position.includes('left')) x = margin;
            if (position.includes('center')) x = (width - logoWidth) / 2;
            if (position.includes('right')) x = width - logoWidth - margin;
            if (position.includes('top')) y = margin;
            if (position.includes('middle')) y = (height - logoHeight) / 2;
            if (position.includes('bottom')) y = height - logoHeight - margin;

            ctx.globalAlpha = opacity;
            ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
            ctx.globalAlpha = 1.0;
            resolve();
        };
        logoImg.onerror = () => resolve();
        logoImg.src = AppState.logoFile.path;
    });
}

function applyTileWatermark(ctx, width, height) {
    const { content, fontSize, opacity, rotation } = AppState.settings.tile;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#fff';
    ctx.font = `${fontSize}px sans-serif`;

    const textMetrics = ctx.measureText(content);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    const canvas = document.createElement('canvas');
    const patternCtx = canvas.getContext('2d');
    
    const patternSize = Math.max(textWidth, textHeight) * 2;
    canvas.width = patternSize;
    canvas.height = patternSize;

    patternCtx.fillStyle = '#fff';
    patternCtx.font = `${fontSize}px sans-serif`;
    patternCtx.textAlign = 'center';
    patternCtx.textBaseline = 'middle';
    
    patternCtx.translate(patternSize / 2, patternSize / 2);
    patternCtx.rotate(rotation * Math.PI / 180);
    patternCtx.fillText(content, 0, 0);

    const pattern = ctx.createPattern(canvas, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1.0;
}
