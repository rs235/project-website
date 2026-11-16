# Minimal Photography Portfolio

A small React + Node.js photography site. The public UI has only two pages: **Photos** and **About**. There is no database, admin interface, authentication, or EXIF extraction.

## What it does

- Displays photographs from a host directory mounted read-only into the API container.
- Uses a responsive row-based photo grid that fills left-to-right, then continues on the next row.
- Opens a full-window viewer when a photo is clicked.
- Opens photographs in a full-window viewer with keyboard navigation and previous/next controls. Images are displayed fitted to the available window; zooming and panning are not supported.
- Keeps the Photos and About pages mounted between tab switches to avoid recreating the gallery and reloading its image elements. The Photos scroll position is restored when returning from About.
- Reserves side gutters for the lightbox navigation controls on mobile so they do not cover the displayed photograph.
- Serves generated WebP thumbnails and large display images instead of exposing original files.
- Scans the photo directory on startup and watches it for added, changed, and removed files.
- Keeps a lightweight in-memory catalogue of filenames, alt text, and generated image URLs. It is rebuilt from the photo directory whenever the API starts.
- Does not read or display EXIF metadata. It does not require MongoDB or any other database.

## Run with Docker Compose

Requirements: Docker Engine and the Docker Compose plugin.

For reproducible dependency installation, generate and commit lockfiles on a machine with npm registry access before building: `npm install` in both `frontend/` and `backend/`. The Dockerfiles use `npm ci` when a lockfile is present.

1. Optionally copy the environment template:

   ```bash
   cp .env.example .env
   ```

   The defaults work without an `.env` file. Edit `PHOTO_DIR` if your photographs live somewhere other than `./photos`.

2. Put image files directly in the configured photo directory. Supported formats are JPEG, PNG, WebP, AVIF, TIFF, and GIF (animated GIFs are converted from their first frame). Subdirectories are not scanned. Ensure the host directory and image files are readable by the container user (UID 1000), for example directories `0755` and files `0644`.

3. Build and start the application:

   ```bash
   docker compose up -d --build
   ```

4. Open `http://localhost:8080` (or the port configured by `WEB_PORT`). By default, the published port binds to `127.0.0.1` only, which is suitable for a host-level reverse proxy such as Caddy. Set `WEB_BIND_ADDRESS=0.0.0.0` only when you deliberately want to expose the site directly on all host interfaces.

Check service status and logs:

```bash
docker compose ps
docker compose logs -f api
```

New files copied into the photo directory are detected automatically. The browser refreshes its photo list every 30 seconds; a manual page refresh also works. Removed and changed files are handled by the API watcher.

## Customize the site

- Change the displayed name and browser title in `frontend/src/App.jsx` and `frontend/index.html`.
- Edit the About text and contact address in `frontend/src/About.jsx`.
- The font is a system sans-serif stack. No remote fonts, icon libraries, or third-party runtime services are used.
- Adjust spacing, gallery grid columns, and typography in `frontend/src/styles.css`.

After changing frontend or backend source code, rebuild the relevant image:

```bash
docker compose up -d --build
```

## Storage and ordering

| Data | Storage | Persistence |
|---|---|---|
| Original photographs | Host bind mount (`./photos`) | Managed by you on the host |
| Generated WebP images | `photo_cache` named volume | Persistent; can be regenerated from originals |
| Photo catalogue | Node.js process memory | Rebuilt automatically from the photo directory on startup |

Photos are displayed left-to-right in natural filename order, then continue on the next row (for example, `photo2.jpg` comes before `photo10.jpg`). Use filename prefixes such as `001-`, `002-`, and `003-` when you want to control the order. Alt text is derived from the filename by replacing underscores, dots, and hyphens with spaces. Use descriptive filenames for better default alt text.

The API container runs as an unprivileged user with a read-only root filesystem. The original photo bind mount is also read-only. Only the generated-image cache volume is writable by the API.

## Useful commands

```bash
# Stop containers; preserve generated image cache
docker compose down

# Start again
docker compose up -d

# Follow all service logs
docker compose logs -f

# Remove containers and generated image cache
# Original photos in ./photos are not removed.
docker compose down -v
```

## Notes

- Original image files are never served directly. Sharp creates WebP variants and applies image orientation during conversion.
- Generated WebP files do not retain EXIF metadata.
- The image cache can be deleted safely; the API regenerates variants from the original photos during its next scan.
- This is a deliberately small single-site application, not a multi-user photo-management system. There is no upload endpoint, admin area, authentication, tagging UI, or blog.
