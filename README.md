# Minimal Photography Portfolio

A simple React + Node.js photography portfolio site.

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

## Storage

| Data | Storage | Persistence |
|---|---|---|
| Original photographs | Host bind mount (`./photos`) | Managed by you on the host |
| Generated WebP images | `photo_cache` named volume | Persistent; can be regenerated from originals |
| Photo catalogue | Node.js process memory | Rebuilt automatically from the photo directory on startup |

The API container runs as an unprivileged user with a read-only root filesystem. The original photo bind mount is also read-only. Only the generated-image cache volume is writable by the API.

## Notes

- Original image files are never served directly. Sharp creates WebP variants and applies image orientation during conversion.
- Generated WebP files do not retain EXIF metadata.
- The image cache can be deleted safely; the API regenerates variants from the original photos during its next scan.

