import { Fragment, useEffect, useRef } from "react";
import type { SeatMap as SeatMapData } from "../../api/tiketa";

interface SeatMapProps {
  map: SeatMapData;
  selected: string[];
  heldByChat: string[];
  full: boolean;
  zoomed: boolean;
  onToggle: (seatId: string) => void;
}

const seatNumber = (seatId: string) => Number(seatId.slice(1));

/**
 * The room as the backend describes it: rows front to back, the aisle after seat 9, the walkway before row L.
 * Every seat is a button, so the map works with a keyboard and a screen reader as well as a pointer.
 */
export function SeatMap({ map, selected, heldByChat, full, zoomed, onToggle }: SeatMapProps) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = frame.current;
    if (zoomed && element) element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2; // open on the aisle
  }, [zoomed]);
  return (
    <div className="tk-room-frame" ref={frame} data-zoomed={zoomed}>
      <fieldset className="tk-room">
        <legend className="visually-hidden">Seats in studio {map.showtime.studio_number}</legend>
        <div className="tk-screen" aria-hidden="true">
          <span>Screen</span>
        </div>
        {map.rows.map((row) => (
          <Fragment key={row.row}>
            {row.row === map.walkway_before_row && <div className="tk-walkway" aria-hidden="true" />}
            <div className="tk-row">
              <span className="tk-row-label" aria-hidden="true">
                {row.row}
              </span>
              {row.seats.map((seat) => {
                const isMine = selected.includes(seat.id);
                const isHeld = heldByChat.includes(seat.id);
                const state = seat.is_taken ? "taken" : isMine ? "mine" : isHeld ? "held" : "free";
                const words = { taken: "taken", mine: "selected", held: "in the chat's summary", free: "free" }[state];
                return (
                  <Fragment key={seat.id}>
                    <button
                      type="button"
                      className="tk-seat"
                      data-state={state}
                      disabled={seat.is_taken || (full && !isMine)}
                      aria-pressed={isMine}
                      aria-label={`${seat.id}, ${words}`}
                      onClick={() => onToggle(seat.id)}
                    >
                      {seatNumber(seat.id)}
                    </button>
                    {seatNumber(seat.id) === map.aisle_after_seat && <span className="tk-aisle" aria-hidden="true" />}
                  </Fragment>
                );
              })}
              <span className="tk-row-label" aria-hidden="true">
                {row.row}
              </span>
            </div>
          </Fragment>
        ))}
      </fieldset>
    </div>
  );
}

/** The room's shape before its seats arrive, so nothing moves when they do. */
export function SeatMapPlaceholder() {
  return (
    <div className="tk-room tk-room-loading" role="status">
      <span className="visually-hidden">Loading seats</span>
    </div>
  );
}
