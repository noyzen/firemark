import { getAppState } from './state';

// --- Image Processing & Resizing ---
export function getResizedDimensions(originalWidth: number, originalHeight: number, resizeSettings: any) {
    const { mode, width, height } = resizeSettings;
    if (mode === 'none' || !mode) {
        return { newWidth: originalWidth, newHeight: originalHeight };
    }
    const ratio = originalWidth / originalHeight;
    let newWidth = originalWidth, newHeight = originalHeight;
    switch (mode) {
        case 'width':
            if (originalWidth > width) { newWidth = width; newHeight = newWidth / ratio; }
            break;
        case 'height':
            if (originalHeight > height) { newHeight = height; newWidth = newHeight * ratio; }
            break;
        case 'fit':
            if (originalWidth > width || originalHeight > height) {
                if (ratio > (width / height)) {
                    newWidth = width; newHeight = newWidth / ratio;
                } else {
                    newHeight = height; newWidth = newHeight * ratio;
                }
            }
            break;
    }
    return { newWidth: Math.round(newWidth), newHeight: Math.round(newHeight) };
}

export function getPositionCoords(pos: { x: number, y: number }, w: number, h: number, elementWidth: number, elementHeight: number, padding = 20) {
    let x = pos.x * (w - elementWidth) + (pos.x * -2 + 1) * padding;
    let y = pos.y * (h - elementHeight) + (pos.y * -2 + 1) * padding;
    return { x, y };
}

// --- Main Drawing Orchestrator ---
export function applyWatermarksToImage(image: { path: string }) {
    return new Promise<string | null>((resolve) => {
        const AppState = getAppState();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = async () => {
            const { newWidth, newHeight } = getResizedDimensions(img.width, img.height, AppState.settings.output.resize);
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            drawImageEffects(ctx, newWidth, newHeight);
            if (AppState.settings.frame.enabled) drawFrameWatermark(ctx, newWidth, newHeight);
            if (AppState.settings.pattern.enabled) drawPatternWatermark(ctx, newWidth, newHeight);
            if (AppState.settings.tile.enabled) drawTileWatermark(ctx, newWidth, newHeight);
            if (AppState.settings.text.enabled) drawTextWatermark(ctx, newWidth, newHeight);
            if (AppState.settings.logo.enabled && AppState.logoFile) drawLogoWatermark(ctx, newWidth, newHeight);
            if (AppState.settings.icon.enabled) drawIconWatermark(ctx, newWidth, newHeight);

            resolve(canvas.toDataURL(`image/${AppState.settings.output.format}`, AppState.settings.output.quality));
        };
        img.onerror = () => resolve(null);
        img.src = image.path;
    });
}

// --- Specific Watermark Drawing Functions ---
export function drawTextWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = getAppState().settings.text;
    const lines = String(s.content).split('\n');
    ctx.font = `${s.italic ? 'italic ' : ''}${s.bold ? 'bold ' : ''}${s.fontSize}px ${s.fontFamily}`;

    const lineHeight = s.fontSize * s.lineHeight;
    const metrics = lines.map(line => ctx.measureText(line));
    const maxTextWidth = Math.max(...metrics.map(m => m.width));
    const totalTextHeight = lines.length * lineHeight;
    
    let { x, y } = getPositionCoords(s.position, width, height, maxTextWidth, totalTextHeight, s.padding);

    ctx.globalAlpha = s.opacity;
    ctx.textBaseline = 'top';

    if (s.shadow.enabled) {
        ctx.shadowColor = s.shadow.color;
        ctx.shadowBlur = s.shadow.blur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
    }
    
    lines.forEach((line, i) => {
        let lineX = x;
        if (s.align === 'center') lineX = x + (maxTextWidth - metrics[i].width) / 2;
        else if (s.align === 'right') lineX = x + (maxTextWidth - metrics[i].width);
        
        const lineY = y + (i * lineHeight);

        if (s.gradient.enabled) {
            const gradient = s.gradient.direction === 'vertical' 
                ? ctx.createLinearGradient(0, lineY, 0, lineY + s.fontSize) 
                : ctx.createLinearGradient(lineX, 0, lineX + metrics[i].width, 0);
            gradient.addColorStop(0, s.color);
            gradient.addColorStop(1, s.gradient.color);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = s.color;
        }
        
        ctx.fillText(line, lineX, lineY);
        if (s.stroke.enabled) {
            ctx.strokeStyle = s.stroke.color;
            ctx.lineWidth = s.stroke.width;
            ctx.strokeText(line, lineX, lineY);
        }
    });
    
    ctx.globalAlpha = 1.0;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

export function drawLogoWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const AppState = getAppState();
    const s = AppState.settings.logo;
    const logo = AppState.logoFile!.element;
    const logoWidth = width * (s.size / 100);
    const logoHeight = logo.height * (logoWidth / logo.width);
    const { x, y } = getPositionCoords(s.position, width, height, logoWidth, logoHeight, s.padding);
    ctx.globalAlpha = s.opacity;
    ctx.drawImage(logo, x, y, logoWidth, logoHeight);
    ctx.globalAlpha = 1.0;
}

export function drawIconWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const AppState = getAppState();
    const s = AppState.settings.icon;
    ctx.font = `900 ${s.size}px "Font Awesome 6 Free"`;
    const metrics = ctx.measureText(AppState.selectedIcon.unicode);
    const { x, y } = getPositionCoords(s.position, width, height, metrics.width, s.size, s.padding);
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = s.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(AppState.selectedIcon.unicode, x, y);
    ctx.globalAlpha = 1.0;
}

export function drawTileWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const AppState = getAppState();
    const s = AppState.settings.tile;
    const patternCanvas = document.createElement('canvas');
    const patternCtx = patternCanvas.getContext('2d')!;
    ctx.globalAlpha = s.opacity;

    if (s.useLogo && AppState.logoFile) {
        const logo = AppState.logoFile.element;
        const logoWidth = s.spacing;
        const logoHeight = logo.height * (logoWidth / logo.width);
        const size = Math.max(logoWidth, logoHeight) + s.spacing;
        patternCanvas.width = size;
        patternCanvas.height = size;
        patternCtx.translate(size/2, size/2);
        patternCtx.rotate(s.rotation * Math.PI / 180);
        patternCtx.drawImage(logo, -logoWidth/2, -logoHeight/2, logoWidth, logoHeight);
    } else {
        patternCtx.font = `${s.fontSize}px ${AppState.settings.text.fontFamily || 'sans-serif'}`;
        const metrics = patternCtx.measureText(s.content);
        const size = Math.max(metrics.width, s.fontSize) + s.spacing;
        patternCanvas.width = size;
        patternCanvas.height = size;
        patternCtx.fillStyle = AppState.settings.text.color;
        patternCtx.font = `${s.fontSize}px ${AppState.settings.text.fontFamily || 'sans-serif'}`;
        patternCtx.textAlign = 'center';
        patternCtx.textBaseline = 'middle';
        patternCtx.translate(size / 2, size / 2);
        patternCtx.rotate(s.rotation * Math.PI / 180);
        patternCtx.fillText(s.content, 0, 0);
    }
    const pattern = ctx.createPattern(patternCanvas, 'repeat')!;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1.0;
}

export function drawPatternWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = getAppState().settings.pattern;
    ctx.globalAlpha = s.opacity;
    const size = s.size;
    switch(s.type) {
        case 'checker':
            for(let y = 0; y < height; y += size) {
                for(let x = 0; x < width; x += size) {
                    ctx.fillStyle = ((x/size + y/size) % 2 === 0) ? s.color1 : s.color2;
                    ctx.fillRect(x, y, size, size);
                }
            }
            break;
        case 'lines':
            ctx.strokeStyle = s.color1;
            ctx.lineWidth = size / 10;
            for(let i = -height; i < width; i += size) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + height, height);
                ctx.stroke();
            }
            break;
        case 'cross':
            ctx.strokeStyle = s.color1;
            ctx.lineWidth = size / 20;
            for(let i = 0; i < width; i += size) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, height);
                ctx.stroke();
            }
            for(let i = 0; i < height; i += size) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(width, i);
                ctx.stroke();
            }
            break;
    }
    ctx.globalAlpha = 1.0;
}

export function drawFrameWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = getAppState().settings.frame;
    const p = s.padding;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.strokeRect(p, p, width - p*2, height - p*2);
    if (s.style === 'double') {
        const p2 = p + s.width + 5;
        ctx.strokeRect(p2, p2, width - p2*2, height - p2*2);
    }
}

export function drawImageEffects(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = getAppState().settings.effects;
    let filterString = '';
    filterString += `brightness(${s.brightness}) contrast(${s.contrast}) grayscale(${s.grayscale})`;
    if (s.blur.enabled && s.blur.radius > 0) {
        filterString += ` blur(${s.blur.radius}px)`;
    }

    if (filterString.trim() !== '') {
        ctx.filter = filterString;
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';
    }

    if (s.noise.enabled && s.noise.amount > 0) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const amount = s.noise.amount;
        for(let i=0; i < data.length; i+=4) {
            const noise = (Math.random() - 0.5) * amount;
            data[i] += noise;
            data[i+1] += noise;
            data[i+2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);
    }
    if (s.sharpen.enabled && s.sharpen.amount > 0) {
        // This is a simplified sharpen effect and might have artifacts.
        // A proper convolution kernel would be better but more complex.
        ctx.globalAlpha = s.sharpen.amount * 0.5;
        ctx.filter = `blur(${Math.max(1, 20 - s.sharpen.amount * 10)}px)`;
        ctx.drawImage(ctx.canvas, 0, 0, width, height);
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'difference';
        ctx.drawImage(ctx.canvas, 0, 0, width, height);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 1;
    }
}
