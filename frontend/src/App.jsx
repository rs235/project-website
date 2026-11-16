import { useCallback, useEffect, useRef, useState } from 'react';
import Gallery from './Gallery.jsx';
import About from './About.jsx';

const SITE_NAME = 'RAFAŁ S';

export default function App() {
  const [page, setPage] = useState(window.location.pathname === '/about' ? 'about' : 'photos');
  const pageRef = useRef(page);
  const galleryScrollY = useRef(0);

  useEffect(() => {
    document.title = `${SITE_NAME} — ${page === 'about' ? 'About' : 'Photography'}`;
  }, [page]);

  const changePage = useCallback((nextPage) => {
    if (pageRef.current === nextPage) {
      // Clicking the wordmark while already on Photos returns to the top.
      if (nextPage === 'photos') {
        galleryScrollY.current = 0;
        window.scrollTo(0, 0);
      }
      return;
    }

    if (pageRef.current === 'photos') {
      galleryScrollY.current = window.scrollY;
    }

    pageRef.current = nextPage;
    setPage(nextPage);

    // Wait until the selected page is visible before restoring its scroll position.
    window.requestAnimationFrame(() => {
      window.scrollTo(0, nextPage === 'photos' ? galleryScrollY.current : 0);
    });
  }, []);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const onPopState = () => {
      changePage(window.location.pathname === '/about' ? 'about' : 'photos');
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [changePage]);

  function navigate(event, nextPage) {
    event.preventDefault();
    const destination = nextPage === 'about' ? '/about' : '/';
    if (window.location.pathname !== destination) {
      window.history.pushState({}, '', destination);
    }
    changePage(nextPage);
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="/" onClick={(event) => navigate(event, 'photos')}>
          {SITE_NAME}
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a
            href="/"
            className={page === 'photos' ? 'active' : ''}
            aria-current={page === 'photos' ? 'page' : undefined}
            onClick={(event) => navigate(event, 'photos')}
          >
            PHOTOS
          </a>
          <a
            href="/about"
            className={page === 'about' ? 'active' : ''}
            aria-current={page === 'about' ? 'page' : undefined}
            onClick={(event) => navigate(event, 'about')}
          >
            ABOUT
          </a>
        </nav>
      </header>

      {/* Keep both pages mounted. Hiding a page preserves the gallery DOM, image
          requests, decoded images and component state when switching tabs. */}
      <div className="page-panel" hidden={page !== 'photos'} inert={page !== 'photos'}>
        <Gallery />
      </div>
      <div className="page-panel" hidden={page !== 'about'} inert={page !== 'about'}>
        <About />
      </div>
    </div>
  );
}
