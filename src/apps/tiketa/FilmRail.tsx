import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Movie } from "../../api/tiketa";

const GAP = 12;
const ITEM_WIDE = 78;
const ITEM_NARROW = 72;

interface FilmRailProps {
  movies: Movie[];
  selectedId: number | undefined;
  renderFilm: (movie: Movie, index: number) => ReactNode;
}

const PREVIOUS = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M10 3.5 5.5 8 10 12.5" />
  </svg>
);
const NEXT = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M6 3.5 10.5 8 6 12.5" />
  </svg>
);

/**
 * The films as pages of posters that fit the width, turned with buttons: a mouse cannot scroll a row sideways, and
 * nothing is drawn beyond the edge. The page follows the chosen film, also when the chat chose it.
 */
export function FilmRail({ movies, selectedId, renderFilm }: FilmRailProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState(8);
  const [page, setPage] = useState(0);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const width = element.clientWidth;
      const item = width < 600 ? ITEM_NARROW : ITEM_WIDE;
      setPerPage(Math.max(2, Math.floor((width + GAP) / (item + GAP))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const pages = Math.max(1, Math.ceil(movies.length / perPage));
  const selectedIndex = movies.findIndex((movie) => movie.id === selectedId);
  useEffect(() => {
    if (selectedIndex >= 0) setPage(Math.floor(selectedIndex / perPage));
  }, [selectedIndex, perPage]);
  const current = Math.min(page, pages - 1);
  const first = current * perPage;
  const shown = movies.slice(first, first + perPage);

  return (
    <>
      <div className="tk-rail-nav">
        <span className="num">
          {movies.length === 0 ? "" : `${first + 1}-${first + shown.length} of ${movies.length}`}
        </span>
        <button
          type="button"
          className="btn ghost tk-rail-turn"
          aria-label="Previous films"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          {PREVIOUS}
        </button>
        <button
          type="button"
          className="btn ghost tk-rail-turn"
          aria-label="Next films"
          disabled={current >= pages - 1}
          onClick={() => setPage(current + 1)}
        >
          {NEXT}
        </button>
      </div>
      <div className="tk-film-rail" ref={frame} style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}>
        {shown.map((movie, index) => renderFilm(movie, first + index))}
      </div>
    </>
  );
}
