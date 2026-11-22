import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type CSSProperties, type DragEvent, type FormEvent, type SyntheticEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { imageUrl, lens, type OriginFilter, type Photograph, type SearchResult, unwrap } from "../../api/lens";
import { AppShell } from "../shared/AppShell";
import "./lens.css";

const EXAMPLES = ["selancar di ombak", "yellow sports car", "planet Mars", "menara tertinggi di dunia"];
const ORIGINS: { value: OriginFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "met", label: "Archive" },
  { value: "upload", label: "Visitor uploads" },
];
const ROW_HEIGHT = 168;
// Enough for the whole archive (239) and recent uploads in one listing
const ALL_PICTURES_LIMIT = 250;
const SIMILAR_COUNT = 6;

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" strokeWidth="2.5" />
      <circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

const SEARCH_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <circle cx="7" cy="7" r="4.5" />
    <path d="m10.5 10.5 3 3" />
  </svg>
);

const DATABASE_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <ellipse cx="8" cy="4" rx="5.5" ry="2" />
    <path d="M2.5 4v8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V4" />
    <path d="M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" />
  </svg>
);

const GRID_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);

const UPLOADS = "Visitor uploads";

/** The curated archive first, visitor uploads after it. No group headings: the page shows pictures, never labels. */
function archiveFirst(result: SearchResult): SearchResult {
  const archive = result.hits.filter((hit) => hit.photograph.origin !== "upload");
  const uploads = result.hits.filter((hit) => hit.photograph.origin === "upload");
  return { ...result, hits: [...archive, ...uploads] };
}

const RETRY_AFTER_MS = 1500;

/** A picture that failed on a shaky connection asks once more, so a dropped request does not leave a broken icon. */
function retryOnce(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.dataset.retried) return;
  img.dataset.retried = "1";
  const again = `${img.src}${img.src.includes("?") ? "&" : "?"}retry=1`;
  window.setTimeout(() => {
    img.src = again;
  }, RETRY_AFTER_MS);
}

/** Pictures only: no title, date or tag is shown, because the search never reads them either. */
function Gallery({
  result,
  selected,
  emptyCopy,
  onSelect,
}: {
  result: SearchResult;
  selected: string | null;
  emptyCopy: string;
  onSelect: (photograph: Photograph) => void;
}) {
  if (result.hits.length === 0) return <p className="empty">{emptyCopy}</p>;
  return (
    <ul className="lens-gallery">
      {result.hits.map(({ photograph, score }, index) => {
        const ratio = photograph.width / photograph.height;
        const label =
          result.mode === "browse" ? `Picture ${index + 1}` : `Result ${index + 1}, similarity ${score.toFixed(2)}`;
        return (
          <li key={photograph.id} style={{ flex: `${ratio} 1 ${Math.round(ratio * ROW_HEIGHT)}px` }}>
            <button
              type="button"
              className="lens-card"
              aria-pressed={selected === photograph.id}
              aria-label={label}
              title={label}
              onClick={() => onSelect(photograph)}
            >
              <img
                src={imageUrl(photograph)}
                alt=""
                loading="lazy"
                onError={retryOnce}
                style={{ "--ratio": ratio } as CSSProperties}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Detail({
  photograph,
  deleting,
  onSelect,
  onDelete,
  onClose,
}: {
  photograph: Photograph;
  deleting: boolean;
  onSelect: (photograph: Photograph) => void;
  onDelete: (photograph: Photograph) => void;
  onClose: () => void;
}) {
  const similar = useQuery({
    queryKey: ["lens", "similar", photograph.id],
    queryFn: async () =>
      unwrap(
        await lens.GET("/v1/photographs/{photograph_id}/similar", {
          params: { path: { photograph_id: photograph.id }, query: { limit: SIMILAR_COUNT } },
        }),
      ),
  });
  const isUpload = photograph.origin === "upload";
  return (
    <aside className="panel lens-detail" aria-label="Selected picture">
      <header>
        <h2>Selected picture</h2>
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
      </header>
      <img src={imageUrl(photograph)} alt="" className="lens-detail-image" onError={retryOnce} />
      {isUpload ? (
        <div className="lens-detail-actions">
          <span className="pill">Visitor upload</span>
          <button
            type="button"
            className="btn lens-delete-btn"
            disabled={deleting}
            onClick={() => onDelete(photograph)}
          >
            {deleting ? "Removing..." : "Remove from database"}
          </button>
        </div>
      ) : (
        <a className="card-link" href={photograph.source_url} target="_blank" rel="noreferrer">
          Source and licence
        </a>
      )}
      <h3>Looks like this</h3>
      {similar.isError ? (
        <p className="meta">The neighbours could not be read.</p>
      ) : (
        <ul className="lens-similar">
          {(similar.data?.hits ?? []).map(({ photograph: neighbour, score }) => (
            <li key={neighbour.id}>
              <button
                type="button"
                onClick={() => onSelect(neighbour)}
                aria-label={`Similar picture, similarity ${score.toFixed(2)}`}
                title={`Similarity ${score.toFixed(2)}`}
              >
                <img src={imageUrl(neighbour)} alt="" loading="lazy" onError={retryOnce} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export function LensSearch() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const uploadsView = params.get("view") === "uploads";
  const query = params.get("q") ?? "";
  // With nothing typed, Lens shows the whole database so a visitor sees what is there before searching
  const allView = params.get("view") === "all" || (!uploadsView && !query);
  const origin = (ORIGINS.find((option) => option.value === params.get("origin"))?.value ?? "all") as OriginFilter;
  const selectedId = params.get("photo");

  const [draft, setDraft] = useState(query);
  const [upload, setUpload] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [known, setKnown] = useState<Map<string, Photograph>>(new Map());

  const [ingestOpen, setIngestOpen] = useState(false);
  const [ingestFiles, setIngestFiles] = useState<File[]>([]);
  const [ingestPreviews, setIngestPreviews] = useState<string[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const [ingestNote, setIngestNote] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => setDraft(query), [query]);
  useEffect(() => {
    if (!upload) return setUploadPreview(null);
    const url = URL.createObjectURL(upload);
    setUploadPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [upload]);

  useEffect(() => {
    if (ingestFiles.length === 0) {
      setIngestPreviews([]);
      return;
    }
    const urls = ingestFiles.map((file) => URL.createObjectURL(file));
    setIngestPreviews(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [ingestFiles]);

  const collection = useQuery({
    queryKey: ["lens", "collection"],
    queryFn: async () => unwrap(await lens.GET("/v1/collection")),
  });
  const browseQuery = useQuery({
    queryKey: ["lens", "browse"],
    queryFn: async () =>
      unwrap(await lens.GET("/v1/photographs", { params: { query: { origin: "upload", limit: 48 } } })),
    enabled: uploadsView && upload === null,
  });
  const allQuery = useQuery({
    queryKey: ["lens", "all"],
    queryFn: async () =>
      unwrap(await lens.GET("/v1/photographs", { params: { query: { origin: "all", limit: ALL_PICTURES_LIMIT } } })),
    enabled: allView && upload === null,
  });
  const textSearch = useQuery({
    queryKey: ["lens", "search", query, origin],
    queryFn: async () => unwrap(await lens.GET("/v1/search", { params: { query: { q: query, origin } } })),
    enabled: !uploadsView && !allView && upload === null,
  });
  const pictureSearch = useQuery({
    queryKey: ["lens", "picture", upload?.name, upload?.size, upload?.lastModified, origin],
    queryFn: async () =>
      unwrap(
        await lens.POST("/v1/search/image", {
          params: { query: { origin } },
          body: { file: "" },
          bodySerializer: () => {
            const form = new FormData();
            form.append("file", upload as File);
            return form;
          },
        }),
      ),
    enabled: upload !== null,
  });
  const search = upload ? pictureSearch : uploadsView ? browseQuery : allView ? allQuery : textSearch;

  useEffect(() => {
    const hits = search.data?.hits ?? [];
    if (hits.length === 0) return;
    setKnown((previous) => {
      const next = new Map(previous);
      for (const { photograph } of hits) next.set(photograph.id, photograph);
      return next;
    });
  }, [search.data]);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: changes.photo !== undefined && Object.keys(changes).length === 1 });
  }

  function select(photograph: Photograph) {
    setKnown((previous) => new Map(previous).set(photograph.id, photograph));
    update({ photo: photograph.id });
  }

  function searchFor(text: string, event?: FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    setUpload(null);
    if (!trimmed) return update({ q: null, view: null, photo: null });
    update({ q: trimmed, view: null, photo: null });
  }

  function takePicture(file: File | undefined) {
    if (!file) return;
    setUpload(file);
    update({ view: null, photo: null });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (ingestOpen) {
      const dropped = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
      if (dropped.length > 0) setIngestFiles(dropped);
      return;
    }
    takePicture(event.dataTransfer.files[0]);
  }

  async function submitIngest(event: FormEvent) {
    event.preventDefault();
    if (ingestFiles.length === 0) {
      setIngestError("Choose at least one image file to add to the database.");
      return;
    }
    setIngesting(true);
    setIngestError(null);
    try {
      const result = unwrap(
        await lens.POST("/v1/photographs", {
          body: { files: [] },
          bodySerializer: () => {
            const form = new FormData();
            for (const file of ingestFiles) form.append("files", file);
            return form;
          },
        }),
      );
      setKnown((previous) => {
        const next = new Map(previous);
        for (const item of result.added) next.set(item.id, item);
        return next;
      });
      setIngestFiles([]);
      setIngestOpen(false);
      setUpload(null);
      setIngestNote(
        `Added ${result.added.length} ${result.added.length === 1 ? "picture" : "pictures"} in ${Math.round(result.took_ms)} ms. Search for what they show.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["lens"] });
      update({ view: "uploads", photo: result.added[0]?.id ?? null });
    } catch (failure) {
      setIngestError(failure instanceof Error ? failure.message : "Could not index the image.");
    } finally {
      setIngesting(false);
    }
  }

  async function handleDelete(photograph: Photograph) {
    setDeletingId(photograph.id);
    try {
      unwrap(
        await lens.DELETE("/v1/photographs/{photograph_id}", {
          params: { path: { photograph_id: photograph.id } },
        }),
      );
      setKnown((previous) => {
        const next = new Map(previous);
        next.delete(photograph.id);
        return next;
      });
      update({ photo: null });
      setIngestNote("Removed the picture from the database.");
      await queryClient.invalidateQueries({ queryKey: ["lens"] });
    } catch (failure) {
      setIngestError(failure instanceof Error ? failure.message : "Could not remove the image.");
    } finally {
      setDeletingId(null);
    }
  }

  const offline = collection.isError && search.isError;
  const selected = selectedId ? known.get(selectedId) : undefined;
  const browsing = uploadsView && upload === null;
  const browsingAll = allView && upload === null;
  const problem = offline ? "Lens is not responding." : search.isError ? "The search failed. Try again." : null;
  const emptyCopy = browsing
    ? "No uploads yet. Use Add pictures above to put your own in the database."
    : upload
      ? "No picture in the collection looks close enough to yours."
      : `Nothing in the collection is close enough to “${query}”. Try other words or a picture.`;

  return (
    <AppShell
      product="Lens"
      mark={<Mark size={20} />}
      guide="lens"
      nav={[
        {
          label: "All pictures",
          to: "/lens",
          icon: GRID_ICON,
          count: collection.data?.photographs,
          current: allView,
        },
        {
          label: UPLOADS,
          to: "/lens?view=uploads",
          icon: DATABASE_ICON,
          count: collection.data?.uploaded,
          current: uploadsView,
        },
      ]}
      className={selected ? "show-detail" : undefined}
    >
      <div className="lens-hero">
        <h1>Search pictures by what they show</h1>
        <div className="lens-search-row">
          <form className="lens-search" onSubmit={(event) => searchFor(draft, event)}>
            {SEARCH_ICON}
            <input
              type="search"
              placeholder="Describe a picture in English or Indonesian"
              aria-label="Describe a picture"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="btn primary">
              Search
            </button>
          </form>
          <label className="btn lens-upload">
            Search by picture
            <input
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={(event) => takePicture(event.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            className={`btn ghost${ingestOpen ? " is-selected" : ""}`}
            aria-expanded={ingestOpen}
            onClick={() => {
              setIngestOpen((previous) => !previous);
              setIngestError(null);
            }}
          >
            Add pictures
          </button>
        </div>
        <div className="lens-examples">
          <span>Try</span>
          {EXAMPLES.map((example) => (
            <button key={example} type="button" className="btn ghost" onClick={() => searchFor(example)}>
              {example}
            </button>
          ))}
        </div>
      </div>

      {ingestNote && (
        <div className="lens-banner" role="status">
          <span>{ingestNote}</span>
          <button type="button" className="btn ghost" onClick={() => setIngestNote(null)}>
            Dismiss
          </button>
        </div>
      )}

      {ingestOpen && (
        <form className="panel lens-ingest" onSubmit={submitIngest} aria-label="Add images to database">
          <header>
            <div>
              <h2>Add pictures to the database</h2>
              <p className="meta">
                Only the picture is stored, with no title or tag. It is sent to Google to be embedded.
              </p>
            </div>
            <button type="button" className="btn ghost" onClick={() => setIngestOpen(false)}>
              Cancel
            </button>
          </header>

          <label className="lens-dropzone">
            <input
              type="file"
              accept="image/*"
              multiple
              aria-label="Choose images to index"
              className="visually-hidden"
              onChange={(event) => {
                const chosen = Array.from(event.target.files ?? []);
                if (chosen.length > 0) setIngestFiles(chosen);
              }}
            />
            <strong>
              {ingestFiles.length > 0
                ? `${ingestFiles.length} ${ingestFiles.length === 1 ? "image" : "images"} selected`
                : "Choose or drop images here"}
            </strong>
            <span>PNG, JPEG, or WebP up to 8 MB each</span>
          </label>

          {ingestPreviews.length > 0 && (
            <ul className="lens-ingest-previews">
              {ingestPreviews.map((url) => (
                <li key={url}>
                  <img src={url} alt="" />
                </li>
              ))}
            </ul>
          )}

          <div className="lens-ingest-actions">
            <button type="submit" className="btn primary" disabled={ingesting}>
              {ingesting ? "Adding..." : "Add to the database"}
            </button>
            {ingestError && (
              <span className="lens-ingest-error" role="alert">
                {ingestError}
              </span>
            )}
          </div>
        </form>
      )}

      {!browsingAll && (
        <div className="lens-results-head">
          <div className="lens-title">
            {uploadPreview && <img className="lens-query-picture" src={uploadPreview} alt="Your query" />}
            <h2>{upload ? "Pictures like yours" : browsing ? UPLOADS : `Results for “${query}”`}</h2>
            {upload && (
              <button type="button" className="btn ghost" onClick={() => setUpload(null)}>
                Clear
              </button>
            )}
          </div>
          {!browsing && (
            <fieldset className="segmented lens-origins">
              <legend className="visually-hidden">Source filter</legend>
              {ORIGINS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={origin === option.value}
                  onClick={() => update({ origin: option.value === "all" ? null : option.value, photo: null })}
                >
                  {option.label}
                </button>
              ))}
            </fieldset>
          )}
        </div>
      )}

      {/* biome-ignore lint/a11y/noStaticElementInteractions: dropping a picture is a shortcut, file inputs are the accessible controls */}
      <div
        className={`lens-layout${dragging ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <section className="lens-results" aria-label="Results">
          {problem ? (
            <p className="empty">{problem}</p>
          ) : search.isPending ? (
            <ul className="lens-gallery" aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
                <li key={index} style={{ flex: `1 1 ${ROW_HEIGHT}px` }}>
                  <span className="skeleton" style={{ height: ROW_HEIGHT }} />
                </li>
              ))}
            </ul>
          ) : search.data && browsingAll ? (
            <div className="lens-all">
              <Gallery result={archiveFirst(search.data)} selected={selectedId} emptyCopy="" onSelect={select} />
            </div>
          ) : search.data ? (
            <Gallery result={search.data} selected={selectedId} emptyCopy={emptyCopy} onSelect={select} />
          ) : null}
        </section>
        {selected && (
          <Detail
            photograph={selected}
            deleting={deletingId === selected.id}
            onSelect={select}
            onDelete={handleDelete}
            onClose={() => update({ photo: null })}
          />
        )}
      </div>
      <p className="meta lens-privacy">
        Picture searches and uploads use Google AI Studio's free tier and are sent to Google.
      </p>
    </AppShell>
  );
}
