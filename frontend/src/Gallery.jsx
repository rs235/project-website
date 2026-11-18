import { useCallback, useEffect, useState } from 'react';
import Lightbox from './Lightbox.jsx';

function preloadThumbnail(url) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    image.onload = async () => {
      try {
        if (typeof image.decode === 'function') await image.decode();
      } catch {
        // A failed decode should not prevent the rest of the gallery from appearing.
      }
      finish();
    };
    image.onerror = finish;
    image.src = url;

    // Handle images served from the browser cache, for which load may have fired already.
    if (image.complete) {
      if (image.naturalWidth === 0) {
        finish();
      } else if (typeof image.decode === 'function') {
        image.decode().catch(() => {}).finally(finish);
      } else {
        finish();
      }
    }
  });
}

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPhotos = useCallback(async () => {
    try {
      const response = await fetch('/api/photos', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json();
      const sortedPhotos = data.photos || [];

      // Keep the gallery hidden until every thumbnail has loaded and decoded.
      // The API supplies the photos in their final alphabetical order.
      await Promise.all(sortedPhotos.map((photo) => preloadThumbnail(photo.thumbnailUrl)));
      setPhotos(sortedPhotos);
      setError('');
    } catch (loadError) {
      setError('Photographs could not be loaded. Please refresh the page.');
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
    const interval = window.setInterval(loadPhotos, 30000);
    return () => window.clearInterval(interval);
  }, [loadPhotos]);

  const closeViewer = () => setSelectedIndex(null);
  const showPrevious = () => setSelectedIndex((index) => (index - 1 + photos.length) % photos.length);
  const showNext = () => setSelectedIndex((index) => (index + 1) % photos.length);

  if (loading) return <main className="gallery-page gallery-loading" aria-busy="true" />;
  if (error) return <main className="gallery-message">{error}</main>;

  return (
    <main className="gallery-page">
      {photos.length === 0 ? (
        <div className="gallery-message empty-state">
          No photographs yet. Add image files to the photos directory.
        </div>
      ) : (
        <div className="photo-wall">
          {photos.map((photo, index) => (
            <button
              className="photo-tile"
              key={photo.filename}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Open photograph: ${photo.alt}`}
            >
              <img
                src={photo.thumbnailUrl}
                alt={photo.alt}
                loading="eager"
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}

      {selectedIndex !== null && photos[selectedIndex] && (
        <Lightbox
          photos={photos}
          index={selectedIndex}
          onClose={closeViewer}
          onPrevious={showPrevious}
          onNext={showNext}
        />
      )}
    </main>
  );
}
