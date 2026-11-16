import path from 'node:path';

export const PORT = Number(process.env.PORT || 3000);
export const PHOTO_DIR = path.resolve(process.env.PHOTO_DIR || '/app/photos');
export const CACHE_DIR = path.resolve(process.env.CACHE_DIR || '/app/cache');

export const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.tif',
  '.tiff',
  '.gif',
]);
