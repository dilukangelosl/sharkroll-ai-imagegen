/**
 * Downloads an image from a URL and returns it as a Base64 string.
 * Note: Requires the image server to support CORS or be same-origin.
 */
export const urlToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = (e) => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

/**
 * loads a base64 string into an HTMLImageElement
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Calculates the dominant/average color of the bottom part of the image
 * to ensure the overlay blends well.
 */
const getDominantColor = (ctx: CanvasRenderingContext2D, width: number, height: number): string => {
  // Sample the bottom 20% of the image
  const sampleHeight = Math.floor(height * 0.2);
  const startY = height - sampleHeight;
  
  const imageData = ctx.getImageData(0, startY, width, sampleHeight);
  const data = imageData.data;
  
  let r = 0, g = 0, b = 0;
  const count = data.length / 4;

  for (let i = 0; i < count; i += 10) { // optimize by skipping pixels
    const offset = i * 4;
    r += data[offset];
    g += data[offset + 1];
    b += data[offset + 2];
  }

  // Adjust count because we skipped pixels
  const actualCount = count / 10;

  r = Math.floor(r / actualCount);
  g = Math.floor(g / actualCount);
  b = Math.floor(b / actualCount);

  return `rgb(${r},${g},${b})`;
};

/**
 * Composites the final image:
 * 1. Resizes generated image to target dimensions.
 * 2. Extracts theme color.
 * 3. Adds gradient overlay.
 * 4. Adds Game Name and Provider text.
 */
export const compositeFinalImage = async (
  base64Image: string,
  gameName: string,
  providerName: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> => {
  const img = await loadImage(base64Image);
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error("Canvas context missing");

  // 1. Draw Image (Cover fit)
  // Calculate aspect ratios
  const imgAspect = img.width / img.height;
  const targetAspect = targetWidth / targetHeight;
  
  let drawWidth, drawHeight, offsetX, offsetY;

  if (imgAspect > targetAspect) {
    // Image is wider than target
    drawHeight = targetHeight;
    drawWidth = img.width * (targetHeight / img.height);
    offsetX = (targetWidth - drawWidth) / 2;
    offsetY = 0;
  } else {
    // Image is taller than target
    drawWidth = targetWidth;
    drawHeight = img.height * (targetWidth / img.width);
    offsetX = 0;
    offsetY = (targetHeight - drawHeight) / 2;
  }

  // Draw background black first
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0, targetWidth, targetHeight);
  
  // Draw the AI generated image
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  // 2. Extract Color Theme from the rendered image
  const themeColor = getDominantColor(ctx, targetWidth, targetHeight);

  // 3. Add Gradient Overlay
  // We want a gradient that goes from Transparent -> Theme Color (Darkened) -> Blackish
  const gradient = ctx.createLinearGradient(0, targetHeight * 0.5, 0, targetHeight);
  
  // Parse RGB to add opacity
  const rgbMatch = themeColor.match(/\d+/g);
  const [r,g,b] = rgbMatch ? rgbMatch.map(Number) : [0,0,0];

  gradient.addColorStop(0, `rgba(${r},${g},${b}, 0)`);
  gradient.addColorStop(0.6, `rgba(${r*0.5},${g*0.5},${b*0.5}, 0.8)`);
  gradient.addColorStop(1, `rgba(${r*0.2},${g*0.2},${b*0.2}, 1)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, targetHeight * 0.4, targetWidth, targetHeight * 0.6);

  // 4. Add Text
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Game Name
  const fontSizeName = Math.floor(targetWidth * 0.12); // Responsive font size
  ctx.font = `900 ${fontSizeName}px "Inter", sans-serif`; // Extra Bold
  ctx.fillStyle = '#FFFFFF';
  
  // Simple word wrap for game name
  const words = gameName.toUpperCase().split(' ');
  let line = '';
  let y = targetHeight - (targetHeight * 0.18);
  const lineHeight = fontSizeName * 1.1;

  // Check if name is too long, move up slightly
  if (gameName.length > 15) {
     y -= lineHeight;
  }

  // Draw text name
  const maxWidth = targetWidth * 0.9;
  
  // A simple multi-line approach for very long names
  const lines = [];
  for(let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Adjust Y based on number of lines to keep it anchored at bottom
  y = targetHeight - (targetHeight * 0.15) - ((lines.length - 1) * lineHeight);

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i].trim(), targetWidth / 2, y + (i * lineHeight));
  }

  // Provider Name
  const fontSizeProvider = Math.floor(targetWidth * 0.05);
  ctx.font = `500 ${fontSizeProvider}px "Inter", sans-serif`; // Medium
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Slightly transparent
  ctx.shadowBlur = 0; // Remove shadow for small text
  
  const providerY = targetHeight - (targetHeight * 0.05);
  ctx.fillText(providerName.toUpperCase(), targetWidth / 2, providerY);

  return canvas.toDataURL('image/png');
};