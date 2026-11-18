import { useEffect } from 'react';

export default function Lightbox({ photos, index, onClose, onPrevious, onNext }) {
  const photo = photos[index];
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrevious();
      if (event.key === 'ArrowRight') onNext();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, onNext, onPrevious]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photograph viewer"
      onClick={onClose}
    >
      <button className="viewer-close" type="button" onClick={onClose} aria-label="Close viewer">
        ×
      </button>

      {photos.length > 1 && (
        <>
          <button
            className="viewer-nav viewer-previous"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPrevious();
            }}
            aria-label="Previous photograph"
          >
            ‹
          </button>
          <button
            className="viewer-nav viewer-next"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            aria-label="Next photograph"
          >
            ›
          </button>
        </>
      )}

      <div
        className="viewer-image-frame"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          className="viewer-image"
          src={photo.largeUrl}
          alt={photo.alt}
          draggable="false"
        />
      </div>

      <div className="viewer-footer" aria-live="polite">
        <span>
          {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
