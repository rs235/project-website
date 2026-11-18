import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import chokidar from 'chokidar';
import sharp from 'sharp';
import { ALLOWED_EXTENSIONS, CACHE_DIR, PHOTO_DIR } from './config.js';

// The catalogue is deliberately in memory and is rebuilt from the source files.
const photos = new Map();
const inFlight = new Map();

function filenameToAlt(filename) {
  const stem = path.parse(filename).name;
  const readable = stem
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return readable || 'Photograph';
}

function validImageName(filename) {
  return ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

function cachePaths(cacheKey) {
  return {
    thumbnailPath: path.join(CACHE_DIR, `${cacheKey}-thumb.webp`),
    largePath: path.join(CACHE_DIR, `${cacheKey}-large.webp`),
  };
}

async function removeCachedFiles(cacheKey) {
  if (!cacheKey) return;
  const { thumbnailPath, largePath } = cachePaths(cacheKey);
  await Promise.all([
    fs.rm(thumbnailPath, { force: true }),
    fs.rm(largePath, { force: true }),
  ]);
}

async function cachedVariantsExist(cacheKey) {
  const { thumbnailPath, largePath } = cachePaths(cacheKey);
  try {
    await Promise.all([fs.access(thumbnailPath), fs.access(largePath)]);
    return true;
  } catch {
    return false;
  }
}

async function createPhotoVariants(sourcePath, cacheKey) {
  const { thumbnailPath, largePath } = cachePaths(cacheKey);
  try {
    await Promise.all([
      sharp(sourcePath, { failOn: 'none' })
        .rotate()
        .resize({ width: 760, height: 760, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(thumbnailPath),
      sharp(sourcePath, { failOn: 'none' })
        .rotate()
        .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90, effort: 4 })
        .toFile(largePath),
    ]);
  } catch (error) {
    await removeCachedFiles(cacheKey);
    throw error;
  }

}

async function processPhoto(filePath) {
  const filename = path.basename(filePath);
  if (!validImageName(filename)) return;

  let stat;
  try {
    stat = await fs.lstat(filePath);
    if (!stat.isFile()) {
      await removePhoto(filePath);
      return;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await removePhoto(filePath);
      return;
    }
    throw error;
  }

  // Include file identity and timestamps so changed files get fresh derivatives.
  const cacheKey = createHash('sha256')
    .update(`${filename}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.ino}`)
    .digest('hex')
    .slice(0, 32);

  const previous = photos.get(filename);
  if (previous?.cacheKey === cacheKey && await cachedVariantsExist(cacheKey)) return;

  if (!(await cachedVariantsExist(cacheKey))) {
    await createPhotoVariants(filePath, cacheKey);
  }

  const photo = {
    filename,
    alt: filenameToAlt(filename),
    thumbnailUrl: `/media/${cacheKey}-thumb.webp`,
    largeUrl: `/media/${cacheKey}-large.webp`,
    cacheKey,
  };

  photos.set(filename, photo);

  if (previous?.cacheKey && previous.cacheKey !== cacheKey) {
    await removeCachedFiles(previous.cacheKey);
  }

  console.log(`Added photograph: ${filename}`);
}

export function indexPhoto(filePath) {
  const filename = path.basename(filePath);
  if (inFlight.has(filename)) return inFlight.get(filename);

  const task = processPhoto(filePath)
    .catch((error) => {
      console.error(`Could not process photograph ${filename}:`, error);
    })
    .finally(() => inFlight.delete(filename));

  inFlight.set(filename, task);
  return task;
}

export async function removePhoto(filePath) {
  const filename = path.basename(filePath);
  const existing = photos.get(filename);
  photos.delete(filename);

  if (existing?.cacheKey) {
    await removeCachedFiles(existing.cacheKey);
  }

  if (existing) console.log(`Removed photograph: ${filename}`);
}

export async function scanPhotoDirectory() {
  await fs.mkdir(PHOTO_DIR, { recursive: true });
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const entries = await fs.readdir(PHOTO_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && validImageName(entry.name))
    .map((entry) => path.join(PHOTO_DIR, entry.name));
  const currentNames = new Set(files.map((filePath) => path.basename(filePath)));

  // Remove files deleted while the API was stopped.
  for (const filename of photos.keys()) {
    if (!currentNames.has(filename)) await removePhoto(path.join(PHOTO_DIR, filename));
  }

  for (const filePath of files) await indexPhoto(filePath);

  // Remove orphaned derivatives left by a previous process or changed source file.
  const expectedCacheFiles = new Set();
  for (const photo of photos.values()) {
    expectedCacheFiles.add(`${photo.cacheKey}-thumb.webp`);
    expectedCacheFiles.add(`${photo.cacheKey}-large.webp`);
  }

  const cacheEntries = await fs.readdir(CACHE_DIR, { withFileTypes: true });
  await Promise.all(
    cacheEntries
      .filter((entry) => entry.isFile() && !expectedCacheFiles.has(entry.name))
      .map((entry) => fs.rm(path.join(CACHE_DIR, entry.name), { force: true })),
  );

  console.log(`Initial photo scan complete: ${photos.size} photograph(s) available`);
}

export function listPhotos() {
  return [...photos.values()]
    .sort((first, second) => first.filename.localeCompare(second.filename, undefined, {
      numeric: true,
      sensitivity: 'base',
    }))
    .map(({ cacheKey: _cacheKey, ...photo }) => photo);
}

export function watchPhotoDirectory() {
  const watcher = chokidar.watch(PHOTO_DIR, {
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: {
      stabilityThreshold: 1200,
      pollInterval: 100,
    },
    ignored: (filePath, stats) => {
      if (stats?.isFile()) return !validImageName(path.basename(filePath));
      return false;
    },
  });

  watcher.on('add', (filePath) => void indexPhoto(filePath));
  watcher.on('change', (filePath) => void indexPhoto(filePath));
  watcher.on('unlink', (filePath) => void removePhoto(filePath));
  watcher.on('error', (error) => console.error('Photo directory watcher error:', error));

  return watcher;
}
