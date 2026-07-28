const path = require('path');
const Jimp = require('jimp-compact');

const OUT = path.resolve(__dirname, '..', 'assets', 'images');
const SIZE = 2048;
const COLORS = {
  transparent: [0, 0, 0, 0],
  mist: [243, 251, 246, 255],
  green: [47, 143, 91, 255],
  red: [232, 76, 91, 255],
  white: [255, 255, 255, 255],
};

function rgba([r, g, b, a]) {
  return Jimp.rgbaToInt(r, g, b, a);
}

function setPixel(data, index, color) {
  data[index] = color[0];
  data[index + 1] = color[1];
  data[index + 2] = color[2];
  data[index + 3] = color[3];
}

function insideRoundedSquare(x, y, left, top, size, radius) {
  const right = left + size;
  const bottom = top + size;
  const cx = Math.max(left + radius, Math.min(x, right - radius));
  const cy = Math.max(top + radius, Math.min(y, bottom - radius));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function insideHeart(x, y) {
  const nx = (x - SIZE / 2) / 430;
  const ny = -(y - 1055) / 430;
  const base = nx * nx + ny * ny - 1;
  return base * base * base - nx * nx * ny * ny * ny <= 0;
}

function drawIcon({ background, includeSquare = true, heartOnly = false }) {
  const image = new Jimp(SIZE, SIZE, rgba(background));
  const data = image.bitmap.data;
  const squareLeft = 272;
  const squareTop = 272;
  const squareSize = 1504;
  const squareRadius = 390;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = (y * SIZE + x) * 4;
      if (heartOnly) {
        if (insideHeart(x, y)) setPixel(data, index, COLORS.white);
        continue;
      }
      if (includeSquare && insideRoundedSquare(x, y, squareLeft, squareTop, squareSize, squareRadius)) {
        setPixel(data, index, COLORS.green);
      }
      if (insideHeart(x, y)) setPixel(data, index, COLORS.red);
    }
  }

  return image;
}

function write(image, fileName, size) {
  return new Promise((resolve, reject) => {
    image.clone().resize(size, size, Jimp.RESIZE_BICUBIC).write(path.join(OUT, fileName), (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function main() {
  const fullIcon = drawIcon({ background: COLORS.mist });
  const foreground = drawIcon({ background: COLORS.transparent });
  const background = new Jimp(SIZE, SIZE, rgba(COLORS.mist));
  const monochrome = drawIcon({ background: COLORS.transparent, includeSquare: false, heartOnly: true });

  await Promise.all([
    write(fullIcon, 'icon.png', 1024),
    write(fullIcon, 'favicon.png', 128),
    write(fullIcon, 'pwa-icon-180.png', 180),
    write(fullIcon, 'pwa-icon-192.png', 192),
    write(fullIcon, 'pwa-icon-512.png', 512),
    write(foreground, 'splash-icon.png', 512),
    write(foreground, 'android-icon-foreground.png', 1024),
    write(background, 'android-icon-background.png', 1024),
    write(monochrome, 'android-icon-monochrome.png', 1024),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
