import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type DragEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  imageUrl,
  lens,
  type Mode,
  type OriginFilter,
  type Photograph,
  type SearchResult,
  unwrap,
} from "../../api/lens";
import { AppShell } from "../shared/AppShell";
import "./lens.css";

const DEFAULT_QUERY = "anjing";
const EXAMPLES = ["anjing", "a kitten curled up on a cushion", "kereta api", "Brooklyn Bridge"];
const MODES: { value: Mode; label: string }[] = [
  { value: "picture", label: "Semantic" },
  { value: "hybrid", label: "Hybrid" },
  { value: "caption", label: "Caption" },
];
const ORIGINS: { value: OriginFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upload", label: "My uploads" },
  { value: "met", label: "Met archive" },
];
const ROW_HEIGHT = 168;
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

function finding(
  result: SearchResult | undefined,
  query: string,
  picture: boolean,
  uploadsView: boolean,
  activeTag: string | null,
): string {
  if (!result) return uploadsView || activeTag ? "Loading pictures." : "Searching Typesense.";
  const count = result.hits.length;
  if (activeTag) {
    return count === 0
      ? `No pictures in "${activeTag}" yet. Upload an image without tags to place it in Untagged.`
      : `${count} ${count === 1 ? "picture" : "pictures"} in category "${activeTag}", shown directly without search.`;
  }
  if (uploadsView) {
    return count === 0
      ? "No user uploads in the database yet. Click Add to database to index your own images."
      : `${count} ${count === 1 ? "picture" : "pictures"} uploaded to your local Typesense database.`;
  }
  if (picture) return `${count} photographs that look like your picture.`;
  if (result.mode === "caption") {
    return count === 0
      ? `No caption contains a word of “${query}”. Try Semantic or Hybrid.`
      : `${count} captions contain a word of “${query}”.`;
  }
  const inCaption = result.hits.filter((hit) => hit.in_caption).length;
  if (inCaption === 0)
    return `${count} photographs for “${query}”. None names it in its caption: each was found from the picture.`;
  return `${count} photographs for “${query}”. ${inCaption} name it in the caption, ${count - inCaption} were found from the picture alone.`;
}

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
      {result.hits.map(({ photograph, in_caption }) => {
        const ratio = photograph.width / photograph.height;
        const isUpload = photograph.origin === "upload";
        return (
          <li key={photograph.id} style={{ flex: `${ratio} 1 ${Math.round(ratio * ROW_HEIGHT)}px` }}>
            <button
              type="button"
              className="lens-card"
              aria-pressed={selected === photograph.id}
              onClick={() => onSelect(photograph)}
            >
              <img
                src={imageUrl(photograph)}
                alt={photograph.title}
                loading="lazy"
                style={{ aspectRatio: `${ratio}` }}
              />
              <span className="lens-card-title">{photograph.title}</span>
              <span className="lens-card-meta">
                {photograph.date || "Undated"}
                {isUpload && <b className="lens-origin-badge">uploaded</b>}
                {in_caption && <b className="lens-in-caption">in caption</b>}
              </span>
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
    <aside className="panel lens-detail" aria-label="Selected photograph">
      <header>
        <h2>{photograph.title}</h2>
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
      </header>
      <img src={imageUrl(photograph)} alt={photograph.title} className="lens-detail-image" />
      <dl className="facts">
        <div>
          <dt>{isUpload ? "Source" : "Photographer"}</dt>
          <dd>{photograph.artist || (isUpload ? "Uploaded to lab" : "Unknown")}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{photograph.date || "Undated"}</dd>
        </div>
        <div>
          <dt>Medium</dt>
          <dd>{photograph.medium}</dd>
        </div>
        <div>
          <dt>{isUpload ? "Tags" : "The Met's subjects"}</dt>
          <dd>{photograph.tags.length > 0 ? photograph.tags.join(", ") : "Untagged"}</dd>
        </div>
      </dl>
      {isUpload ? (
        <div className="lens-detail-actions">
          <span className="pill pos">Stored in Typesense</span>
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
          At The Met, CC0
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
                title={`${neighbour.title}, similarity ${score.toFixed(2)}`}
              >
                <img src={imageUrl(neighbour)} alt={neighbour.title} loading="lazy" />
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
  const activeTag = params.get("tag");
  const query = params.get("q") ?? DEFAULT_QUERY;
  const mode = (MODES.find((option) => option.value === params.get("mode"))?.value ?? "picture") as Mode;
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
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestTags, setIngestTags] = useState("");
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
    queryKey: ["lens", "browse", uploadsView ? "upload" : origin, activeTag],
    queryFn: async () =>
      unwrap(
        await lens.GET("/v1/photographs", {
          params: {
            query: {
              origin: uploadsView ? "upload" : origin,
              tag: activeTag ?? undefined,
              limit: 48,
            },
          },
        }),
      ),
    enabled: (uploadsView || activeTag !== null) && upload === null,
  });
  const textSearch = useQuery({
    queryKey: ["lens", "search", query, mode, origin],
    queryFn: async () => unwrap(await lens.GET("/v1/search", { params: { query: { q: query, mode, origin } } })),
    enabled: !uploadsView && activeTag === null && upload === null,
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
  const search = upload ? pictureSearch : uploadsView || activeTag !== null ? browseQuery : textSearch;

  useEffect(() => {
    const hits = search.data?.hits ?? [];
    if (hits.length === 0) return;
    setKnown((previous) => {
      const next = new Map(previous);
      for (const { photograph } of hits) next.set(photograph.id, photograph);
      return next;
    });
  }, [search.data]);

  const sidebarSubjects = useMemo(() => {
    const raw = collection.data?.subjects ?? [];
    const untaggedEntry = raw.find((item) => item.subject === "Untagged") ?? { subject: "Untagged", photographs: 0 };
    const others = raw.filter((item) => item.subject !== "Untagged").slice(0, 14);
    return [untaggedEntry, ...others];
  }, [collection.data?.subjects]);

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
    if (!trimmed) return;
    setUpload(null);
    update({ q: trimmed, view: null, tag: null, photo: null });
  }

  function browseCategory(tag: string) {
    setUpload(null);
    update({ tag, view: null, photo: null });
  }

  function takePicture(file: File | undefined) {
    if (!file) return;
    setUpload(file);
    update({ view: null, tag: null, photo: null });
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
    const hadCustomTags = ingestTags.trim().length > 0;
    setIngesting(true);
    setIngestError(null);
    try {
      const result = unwrap(
        await lens.POST("/v1/photographs", {
          body: { files: [], tags: "" },
          bodySerializer: () => {
            const form = new FormData();
            for (const file of ingestFiles) form.append("files", file);
            if (ingestTitle.trim()) form.append("title", ingestTitle.trim());
            if (ingestTags.trim()) form.append("tags", ingestTags.trim());
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
      setIngestTitle("");
      setIngestTags("");
      setIngestOpen(false);
      setUpload(null);
      setIngestNote(
        `Indexed ${result.added.length} ${result.added.length === 1 ? "picture" : "pictures"} into Typesense in ${Math.round(result.took_ms)} ms.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["lens"] });
      const firstAdded = result.added[0];
      if (!hadCustomTags) {
        update({ tag: "Untagged", view: null, origin: null, photo: firstAdded ? firstAdded.id : null });
      } else {
        update({ view: "uploads", tag: null, photo: firstAdded ? firstAdded.id : null });
      }
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
      setIngestNote(`Removed "${photograph.title}" from Typesense.`);
      await queryClient.invalidateQueries({ queryKey: ["lens"] });
    } catch (failure) {
      setIngestError(failure instanceof Error ? failure.message : "Could not remove the image.");
    } finally {
      setDeletingId(null);
    }
  }

  const offline = collection.isError && search.isError;
  const selected = selectedId ? known.get(selectedId) : undefined;
  const isBrowsing = (uploadsView || activeTag !== null) && upload === null;
  const sub = offline
    ? "Lens is not running on port 8030."
    : search.isError
      ? "The search failed. Try again."
      : finding(search.data, query, upload !== null, uploadsView && upload === null, upload ? null : activeTag);

  const storeName = collection.data?.vector_store || "Typesense 27.1";
  const scopeDetail = collection.data
    ? `${collection.data.archive ?? collection.data.photographs} archive + ${collection.data.uploaded ?? 0} uploaded`
    : "EmbeddingGemma 2 · 768-dim";
  const emptyCopy = activeTag
    ? `No pictures in "${activeTag}" yet. Upload an image without tags to place it in Untagged.`
    : uploadsView && upload === null
      ? "No user uploads yet. Click Add to database above to index your own pictures into Typesense."
      : "Nothing found. Try other words or switch source filter.";
  const pageTitle = upload ? "Your picture" : activeTag ? activeTag : uploadsView ? "Database uploads" : `“${query}”`;

  return (
    <AppShell
      product="Lens"
      mark={<Mark size={20} />}
      scope={{
        line: `${storeName} · semantic DB`,
        detail: scopeDetail,
      }}
      nav={[
        { label: "Search", to: "/lens", icon: SEARCH_ICON, current: !uploadsView && activeTag === null },
        {
          label: "Database uploads",
          to: "/lens?view=uploads",
          icon: DATABASE_ICON,
          count: collection.data?.uploaded,
          current: uploadsView,
        },
      ]}
      className={selected ? "show-detail" : undefined}
      sidebarFooter={
        <div className="lens-subjects">
          <p className="group-label">Subjects</p>
          {sidebarSubjects.map((subject) => (
            <button
              key={subject.subject}
              type="button"
              className="nav-item"
              aria-current={activeTag === subject.subject ? "page" : undefined}
              onClick={() => browseCategory(subject.subject)}
            >
              {subject.subject}
              <span className="count">{subject.photographs}</span>
            </button>
          ))}
        </div>
      }
      topbar={
        <form className="search" onSubmit={(event) => searchFor(draft, event)}>
          {SEARCH_ICON}
          <input
            type="search"
            placeholder="Describe any image in English or Indonesian"
            aria-label="Describe a photograph"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </form>
      }
    >
      <div className="title-row">
        <div className="lens-title">
          {uploadPreview && <img className="lens-query-picture" src={uploadPreview} alt="Your query" />}
          <div>
            <h1>{pageTitle}</h1>
            <p className="sub">{sub}</p>
          </div>
        </div>
        <div className="title-actions">
          {search.data && <span className="stamp">{Math.round(search.data.took_ms)} ms</span>}
          {upload || activeTag ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setUpload(null);
                update({ tag: null, photo: null });
              }}
            >
              Back to search
            </button>
          ) : (
            !uploadsView && (
              <fieldset className="segmented lens-modes">
                <legend className="visually-hidden">Search mode</legend>
                {MODES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={mode === option.value}
                    onClick={() => update({ mode: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </fieldset>
            )
          )}
          <button
            type="button"
            className={`btn${ingestOpen ? " is-selected" : ""}`}
            aria-expanded={ingestOpen}
            onClick={() => {
              setIngestOpen((previous) => !previous);
              setIngestError(null);
            }}
          >
            Add to database
          </button>
          <label className="btn primary lens-upload">
            Search by picture
            <input
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={(event) => takePicture(event.target.files?.[0])}
            />
          </label>
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
              <h2>Add images to Typesense</h2>
              <p className="meta">
                Images uploaded without tags are placed under Untagged and shown directly in the gallery.
              </p>
            </div>
            <button type="button" className="btn ghost" onClick={() => setIngestOpen(false)}>
              Cancel
            </button>
          </header>

          <div className="lens-ingest-grid">
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
              <span>PNG, JPEG, or WebP up to 12 MB each</span>
            </label>

            <div className="lens-ingest-fields">
              <div className="field">
                <label htmlFor="lens-ingest-title">Title (optional)</label>
                <input
                  id="lens-ingest-title"
                  type="text"
                  className="input"
                  maxLength={200}
                  placeholder="Defaults to filename when left blank"
                  value={ingestTitle}
                  onChange={(event) => setIngestTitle(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="lens-ingest-tags">Tags (optional)</label>
                <input
                  id="lens-ingest-tags"
                  type="text"
                  className="input"
                  maxLength={300}
                  placeholder="Leave blank for Untagged, or enter comma-separated labels"
                  value={ingestTags}
                  onChange={(event) => setIngestTags(event.target.value)}
                />
              </div>
            </div>
          </div>

          {ingestPreviews.length > 0 && (
            <ul className="lens-ingest-previews">
              {ingestPreviews.map((url, index) => (
                <li key={url}>
                  <img src={url} alt={ingestFiles[index]?.name ?? "Preview"} />
                  <span>{ingestFiles[index]?.name}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="lens-ingest-actions">
            <button type="submit" className="btn primary" disabled={ingesting}>
              {ingesting ? "Embedding and indexing..." : "Save to Typesense"}
            </button>
            {ingestError && (
              <span className="lens-ingest-error" role="alert">
                {ingestError}
              </span>
            )}
          </div>
        </form>
      )}

      {!isBrowsing && (
        <div className="filters lens-toolbar">
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
          <div className="lens-examples">
            <span>Try</span>
            {EXAMPLES.map((example) => (
              <button key={example} type="button" className="btn ghost" onClick={() => searchFor(example)}>
                {example}
              </button>
            ))}
          </div>
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
          {search.isPending && !offline ? (
            <ul className="lens-gallery" aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
                <li key={index} style={{ flex: `1 1 ${ROW_HEIGHT}px` }}>
                  <span className="skeleton" style={{ height: ROW_HEIGHT }} />
                </li>
              ))}
            </ul>
          ) : search.data ? (
            <Gallery result={search.data} selected={selectedId} emptyCopy={emptyCopy} onSelect={select} />
          ) : (
            <p className="empty">{sub}</p>
          )}
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
    </AppShell>
  );
}
