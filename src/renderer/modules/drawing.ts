import { AppState } from './state';

export function getResizedDimensions(originalWidth: number, originalHeight: number, resizeSettings: any) {
    const { mode, width, height } = resizeSettings;
    if (mode === 'none' || !mode) {
        return { newWidth: originalWidth, newHeight: originalHeight };
    }

    const ratio = originalWidth / originalHeight;
    let newWidth = originalWidth, newHeight = originalHeight;

    switch (mode) {
        case 'width':
            newWidth = width;
            newHeight = newWidth / ratio;
            break;
        case 'height':
            newHeight = height;
            newWidth = newHeight * ratio;
            break;
        case 'fit':
            if (ratio > (width / height)) {
                newWidth = width;
                newHeight = newWidth / ratio;
            } else {
                newHeight = height;
                newWidth = newHeight * ratio;
            }
            break;
    }
    return { newWidth: Math.round(newWidth), newHeight: Math.round(newHeight) };
}

export function getPositionCoords(pos: { x: number, y: number }, w: number, h: number, elementWidth: number, elementHeight: number, padding = 20, freePlacement = false) {
    if (freePlacement) {
        // In free placement, pos is the normalized TOP-LEFT coordinate.
        return { x: pos.x * w, y: pos.y * h };
    }
    // In grid mode, pos is an anchor point (0, 0.5, or 1 for each axis).
    // We calculate the top-left coordinate (x,y) to place the element according to the anchor.
    const x = pos.x * (w - elementWidth) - (elementWidth/2 * (pos.x * 2 - 1)) + (pos.x * -2 + 1) * padding ;
    const y = pos.y * (h - elementHeight) - (elementHeight/2 * (pos.y * 2 - 1)) + (pos.y * -2 + 1) * padding;
    return { x, y };
}

export async function applyWatermarksToImage(image: { path: string }) {
    return new Promise<string | null>((resolve) => {
        const drawingCanvas = document.createElement('canvas');
        const drawingCtx = drawingCanvas.getContext('2d', { willReadFrequently: true })!;
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = async () => {
            const originalWidth = img.width;
            const originalHeight = img.height;
            drawingCanvas.width = originalWidth;
            drawingCanvas.height = originalHeight;
            
            // Draw original image and all watermarks/effects onto the full-size canvas
            drawingCtx.drawImage(img, 0, 0, originalWidth, originalHeight);
            
            if (AppState.settings.effectsEnabled) drawImageEffects(drawingCtx, originalWidth, originalHeight);
            if (AppState.settings.frame.enabled) drawFrameWatermark(drawingCtx, originalWidth, originalHeight); 
            if (AppState.settings.pattern.enabled) drawPatternWatermark(drawingCtx, originalWidth, originalHeight); 
            if (AppState.settings.tile.enabled) drawTileWatermark(drawingCtx, originalWidth, originalHeight);
            
            if (AppState.settings.textsEnabled) AppState.settings.texts?.forEach(t => { if(t.enabled) drawSingleTextWatermark(drawingCtx, originalWidth, originalHeight, t) });
            if (AppState.settings.logosEnabled) AppState.settings.logos?.forEach(l => { if(l.enabled && l.element) drawSingleLogoWatermark(drawingCtx, originalWidth, originalHeight, l) });
            if (AppState.settings.iconsEnabled) AppState.settings.icons?.forEach(i => { if(i.enabled) drawSingleIconWatermark(drawingCtx, originalWidth, originalHeight, i) });

            // Now, handle resizing as the final step
            const { newWidth, newHeight } = getResizedDimensions(originalWidth, originalHeight, AppState.settings.output.resize);
            
            // If no resize is necessary, resolve with the current canvas
            if (newWidth === originalWidth && newHeight === originalHeight) {
                resolve(drawingCanvas.toDataURL(`image/${AppState.settings.output.format}`, AppState.settings.output.quality));
                return;
            }

            // Create a new canvas for the final resized output
            const outputCanvas = document.createElement('canvas');
            const outputCtx = outputCanvas.getContext('2d')!;
            outputCanvas.width = newWidth;
            outputCanvas.height = newHeight;
            
            // Draw the watermarked canvas onto the output canvas, which performs the scaling
            outputCtx.drawImage(drawingCanvas, 0, 0, newWidth, newHeight);
            
            resolve(outputCanvas.toDataURL(`image/${AppState.settings.output.format}`, AppState.settings.output.quality));
        };
        img.onerror = () => resolve(null); img.src = image.path;
    });
}

export function getWatermarkBBox(type: 'texts' | 'logos' | 'icons', layer: any, imgWidth: number, imgHeight: number) {
    if (type === 'texts') {
        const s = layer; const tempCtx = document.createElement('canvas').getContext('2d')!; tempCtx.font = `${s.italic ? 'italic ' : ''}${s.bold ? 'bold ' : ''}${s.fontSize}px ${s.fontFamily}`;
        const lines = String(s.content).split('\n'); const metrics = lines.map(line => tempCtx.measureText(line)); const w = Math.max(...metrics.map(m => m.width)); const h = lines.length * s.fontSize * s.lineHeight;
        const {x, y} = getPositionCoords(s.position, imgWidth, imgHeight, w, h, s.padding, s.freePlacement); return { x, y, w, h };
    }
    if (type === 'logos' && layer.element) {
        const s = layer; const logo = s.element; const w = imgWidth * (s.size / 100); const h = logo.height * (w / logo.width);
        const {x, y} = getPositionCoords(s.position, imgWidth, imgHeight, w, h, s.padding, s.freePlacement); return { x, y, w, h };
    }
    if(type === 'icons') {
        const s = layer; const tempCtx = document.createElement('canvas').getContext('2d')!; tempCtx.font = `900 ${s.size}px "Font Awesome 6 Free"`; const metrics = tempCtx.measureText(s.icon.unicode);
        const {x, y} = getPositionCoords(s.position, imgWidth, imgHeight, metrics.width, s.size, s.padding, s.freePlacement); return { x, y, w: metrics.width, h: s.size };
    }
    return null;
}

export function drawSingleTextWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, s: any) {
    const lines = String(s.content).split('\n');
    ctx.font = `${s.italic ? 'italic ' : ''}${s.bold ? 'bold ' : ''}${s.fontSize}px ${s.fontFamily}`;
    const lineHeight = s.fontSize * s.lineHeight; const totalTextHeight = lines.length * lineHeight - (s.fontSize * (s.lineHeight - 1));
    const metrics = lines.map(line => ctx.measureText(line)); const maxTextWidth = Math.max(...metrics.map(m => m.width));
    
    let { x, y } = getPositionCoords(s.position, width, height, maxTextWidth, totalTextHeight, s.padding, s.freePlacement);

    ctx.globalAlpha = s.opacity; ctx.textBaseline = 'top';
    if (s.shadow.enabled) { ctx.shadowColor = s.shadow.color; ctx.shadowBlur = s.shadow.blur; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; }
    
    lines.forEach((line, i) => {
        let lineX = x;
        if (s.align === 'center') { lineX = x + (maxTextWidth - metrics[i].width) / 2; }
        else if (s.align === 'right') { lineX = x + (maxTextWidth - metrics[i].width); }
        const lineY = y + (i * lineHeight);

        if (s.gradient.enabled) {
            const gradient = s.gradient.direction === 'vertical' ? ctx.createLinearGradient(0, lineY, 0, lineY + s.fontSize) : ctx.createLinearGradient(lineX, 0, lineX + metrics[i].width, 0);
            gradient.addColorStop(0, s.color); gradient.addColorStop(1, s.gradient.color); ctx.fillStyle = gradient;
        } else { ctx.fillStyle = s.color; }
        
        ctx.fillText(line, lineX, lineY);
        if (s.stroke.enabled) { ctx.strokeStyle = s.stroke.color; ctx.lineWidth = s.stroke.width; ctx.strokeText(line, lineX, lineY); }
    });
    
    ctx.globalAlpha = 1.0; ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
}

export function drawSingleLogoWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, s: any) {
    const logo = s.element;
    const logoWidth = width * (s.size / 100); const logoHeight = logo.height * (logoWidth / logo.width);
    const { x, y } = getPositionCoords(s.position, width, height, logoWidth, logoHeight, s.padding, s.freePlacement);
    ctx.globalAlpha = s.opacity; ctx.drawImage(logo, x, y, logoWidth, logoHeight); ctx.globalAlpha = 1.0;
}

export function drawSingleIconWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, s: any) {
    ctx.font = `900 ${s.size}px "Font Awesome 6 Free"`;
    const metrics = ctx.measureText(s.icon.unicode);
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const { x, y } = getPositionCoords(s.position, width, height, metrics.width, textHeight, s.padding, s.freePlacement);
    ctx.globalAlpha = s.opacity; ctx.fillStyle = s.color; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(s.icon.unicode, x, y); ctx.globalAlpha = 1.0;
}

export function drawTileWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.tile;
    ctx.save();
    ctx.globalAlpha = s.opacity;
    ctx.font = `${s.fontSize}px Arial`;
    ctx.fillStyle = '#fff'; // Assuming white text for tiles, can be customized
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let logoToUse = null;
    if (s.useLogo) {
        // Prefer active logo layer, otherwise find first enabled logo
        logoToUse = AppState.settings.logos.find(l => l.id === AppState.activeLayer?.id && AppState.activeLayer?.type === 'logos' && l.enabled && l.element)
                    || AppState.settings.logos.find(l => l.enabled && l.element);
    }

    if (s.useLogo && !logoToUse) {
        ctx.restore();
        return; // Don't draw anything if logo is requested but not found
    }
    
    const text = logoToUse ? ' ' : s.content;
    const metrics = ctx.measureText(text);
    const textWidth = logoToUse ? (logoToUse.element.width * (s.fontSize / logoToUse.element.height)) : metrics.width;
    const textHeight = s.fontSize;

    const canvas = document.createElement('canvas');
    const tileCtx = canvas.getContext('2d')!;
    
    const diag = Math.max(1, Math.sqrt(textWidth*textWidth + textHeight*textHeight) + s.spacing);
    canvas.width = diag;
    canvas.height = diag;
    
    tileCtx.font = ctx.font;
    tileCtx.fillStyle = ctx.fillStyle;
    tileCtx.textAlign = 'center';
    tileCtx.textBaseline = 'middle';
    
    tileCtx.translate(diag / 2, diag / 2);
    tileCtx.rotate(s.rotation * Math.PI / 180);
    
    if (logoToUse) {
        const logo = logoToUse.element;
        const logoHeight = s.fontSize;
        const logoWidth = logo.width * (logoHeight / logo.height);
        tileCtx.drawImage(logo, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
    } else {
        tileCtx.fillText(s.content, 0, 0);
    }
    
    const pattern = ctx.createPattern(canvas, 'repeat')!;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

export function drawPatternWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.pattern;
    const pCanvas = document.createElement('canvas');
    const pCtx = pCanvas.getContext('2d')!;
    const size = s.size;
    
    pCtx.strokeStyle = s.color1;
    pCtx.fillStyle = s.color1;
    pCtx.lineWidth = Math.max(1, size / 10);

    switch(s.type) {
        case 'checker':
            pCanvas.width = size * 2; pCanvas.height = size * 2;
            pCtx.fillStyle = s.color1;
            pCtx.fillRect(0,0,size,size); pCtx.fillRect(size,size,size,size);
            pCtx.fillStyle = s.color2;
            pCtx.fillRect(size,0,size,size); pCtx.fillRect(0,size,size,size);
            break;
        case 'lines':
            pCanvas.width=size; pCanvas.height=size;
            pCtx.strokeStyle = s.color1; pCtx.lineWidth = Math.max(1, size / 5);
            pCtx.beginPath(); pCtx.moveTo(0,size); pCtx.lineTo(size,0); pCtx.stroke();
            break;
        case 'dots':
             pCanvas.width=size*2; pCanvas.height=size*2;
             pCtx.fillStyle = s.color1;
             pCtx.beginPath(); pCtx.arc(size/2,size/2,size/3,0,2*Math.PI); pCtx.fill();
             pCtx.beginPath(); pCtx.arc(size*1.5,size*1.5,size/3,0,2*Math.PI); pCtx.fill();
            break;
        case 'cross':
             pCanvas.width=size; pCanvas.height=size;
             pCtx.strokeStyle = s.color1; pCtx.lineWidth = Math.max(1, size / 5);
             pCtx.beginPath(); pCtx.moveTo(0,size); pCtx.lineTo(size,0); pCtx.moveTo(0,0); pCtx.lineTo(size,size); pCtx.stroke();
            break;
        case 'honeycomb':
            pCanvas.width = size * 3; pCanvas.height = size * 1.732;
            pCtx.strokeStyle = s.color1; pCtx.lineWidth = Math.max(1, size/10);
            for(let i=0; i<2; i++){
                for(let j=0; j<2; j++){
                    let x = (i*1.5 + j*1.5) * size;
                    let y = j * size * 1.732 / 2;
                    pCtx.beginPath();
                    for(let k=0; k<=6; k++){
                        let angle = k * Math.PI / 3;
                        pCtx.lineTo(x + size * Math.cos(angle), y + size * Math.sin(angle));
                    }
                    pCtx.stroke();
                }
            }
            break;
        case 'zigzag':
            pCanvas.width = size * 2; pCanvas.height = size;
            pCtx.strokeStyle = s.color1; pCtx.lineWidth = Math.max(1, size/8);
            pCtx.beginPath(); pCtx.moveTo(0, size/2); pCtx.lineTo(size/2, 0); pCtx.lineTo(size, size/2); pCtx.lineTo(size*1.5, 0); pCtx.lineTo(size*2, size/2); pCtx.stroke();
            break;
        case 'vlines':
            pCanvas.width = size; pCanvas.height = size;
            pCtx.strokeStyle = s.color1; pCtx.lineWidth = Math.max(1, size / 5);
            pCtx.beginPath(); pCtx.moveTo(size/2, 0); pCtx.lineTo(size/2, size); pCtx.stroke();
            break;
        case 'hlines':
            pCanvas.width = size; pCanvas.height = size;
            pCtx.strokeStyle = s.color1; pCtx.lineWidth = Math.max(1, size / 5);
            pCtx.beginPath(); pCtx.moveTo(0, size/2); pCtx.lineTo(size, size/2); pCtx.stroke();
            break;
        case 'bricks':
            pCanvas.width = size * 2; pCanvas.height = size;
            pCtx.strokeStyle = s.color1; pCtx.lineWidth = Math.max(1, size/10);
            pCtx.strokeRect(0.5, 0.5, size-1, size/2-1);
            pCtx.strokeRect(size + 0.5, size/2 + 0.5, size-1, size/2-1);
            break;
        case 'triangles':
            pCanvas.width = size; pCanvas.height = size;
            pCtx.strokeStyle = s.color1; pCtx.lineWidth = Math.max(1, size/10);
            pCtx.beginPath(); pCtx.moveTo(0,0); pCtx.lineTo(size,0); pCtx.lineTo(size/2, size); pCtx.closePath(); pCtx.stroke();
            break;
        case 'waves':
            pCanvas.width = size * 2; pCanvas.height = size;
            pCtx.strokeStyle = s.color1; pCtx.lineWidth = Math.max(1, size/8);
            pCtx.beginPath();
            pCtx.moveTo(0, size / 2);
            pCtx.bezierCurveTo(size / 2, 0, size / 2, size, size, size / 2);
            pCtx.bezierCurveTo(size * 1.5, 0, size * 1.5, size, size * 2, size / 2);
            pCtx.stroke();
            break;
    }

    ctx.save();
    ctx.globalAlpha = s.opacity;
    const pattern = ctx.createPattern(pCanvas, 'repeat')!;
    if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
}

export function drawFrameWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.frame;
    ctx.save();
    const p = s.padding;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    if (s.style === 'dashed') ctx.setLineDash([15, 10]);
    if (s.style === 'dotted') ctx.setLineDash([s.width, s.width * 1.5]);

    ctx.strokeRect(p, p, width - p * 2, height - p * 2);
    if (s.style === 'double') {
        const p2 = p + s.width * 2;
        ctx.strokeRect(p2, p2, width - p2 * 2, height - p2 * 2);
    }
    ctx.restore();
}

export function drawImageEffects(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const s = AppState.settings.effects;
    let filterString = '';
    if (s.brightness !== 1) filterString += `brightness(${s.brightness}) `;
    if (s.contrast !== 1) filterString += `contrast(${s.contrast}) `;
    if (s.grayscale > 0) filterString += `grayscale(${s.grayscale}) `;
    if (s.blur.enabled && s.blur.radius > 0) filterString += `blur(${s.blur.radius}px) `;
    
    if (filterString.length > 0) {
        ctx.filter = filterString.trim();
        ctx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, width, height); // Re-draw image with filter
        ctx.filter = 'none'; // Reset filter
    }

    if (s.sharpen.enabled && s.sharpen.amount > 0) {
        // Sharpen is more complex, requires convolution matrix.
        // This is a basic implementation.
        const sharpenMatrix = [
            0, -1*s.sharpen.amount, 0,
            -1*s.sharpen.amount, 1 + 4*s.sharpen.amount, -1*s.sharpen.amount,
            0, -1*s.sharpen.amount, 0
        ];
        applyConvolution(ctx, width, height, sharpenMatrix);
    }

    if (s.noise.enabled && s.noise.amount > 0) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const random = (Math.random() - 0.5) * s.noise.amount;
            data[i] += random;
            data[i+1] += random;
            data[i+2] += random;
        }
        ctx.putImageData(imageData, 0, 0);
    }
}

function applyConvolution(ctx: CanvasRenderingContext2D, width: number, height: number, matrix: number[]) {
    const pixels = ctx.getImageData(0, 0, width, height);
    const src = pixels.data;
    const dst = new Uint8ClampedArray(src.length);
    const side = Math.round(Math.sqrt(matrix.length));
    const halfSide = Math.floor(side / 2);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;
            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    const scy = y + cy - halfSide;
                    const scx = x + cx - halfSide;
                    if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                        const srcOff = (scy * width + scx) * 4;
                        const wt = matrix[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                    }
                }
            }
            const dstOff = (y * width + x) * 4;
            dst[dstOff] = r;
            dst[dstOff + 1] = g;
            dst[dstOff + 2] = b;
            dst[dstOff + 3] = src[dstOff + 3];
        }
    }
    pixels.data.set(dst);
    ctx.putImageData(pixels, 0, 0);
}