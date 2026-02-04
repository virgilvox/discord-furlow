import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '..', 'public');

// Read the SVG
const svgPath = join(publicDir, 'og-image.svg');
const svgContent = readFileSync(svgPath, 'utf-8');

// Convert to PNG
sharp(Buffer.from(svgContent))
  .resize(1200, 630)
  .png()
  .toFile(join(publicDir, 'og-image.png'))
  .then(() => {
    console.log('Generated og-image.png');
  })
  .catch(err => {
    console.error('Error generating OG image:', err);
    process.exit(1);
  });
