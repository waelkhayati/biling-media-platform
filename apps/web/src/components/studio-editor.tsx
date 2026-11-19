"use client";

import Image from "next/image";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import type { StaffRole, StudioEpisode, StudioShow } from "@biling/contracts";
import { staffArtworkUrlSchema, youtubeIdFromInput } from "@biling/schemas";
import { saveStudioContent } from "@/app/admin/actions";
import { youtubeThumbnail } from "@/lib/content-paths";
import type { StudioShowOption } from "./studio-list";
import { YouTubePlayer } from "./youtube-player";

type EditorProps = { role: StaffRole } & (
  | { kind: "shows"; record?: StudioShow }
  | { kind: "episodes"; record?: StudioEpisode; shows: StudioShowOption[]; initialShow?: string }
);

export function StudioEditor(props: EditorProps) {
  const { kind, record, role } = props;
  const show = props.kind === "shows" ? props.record : undefined;
  const episode = props.kind === "episodes" ? props.record : undefined;
  const locked = !!record?.firstPublishedAt;
  const readOnly = role === "EDITOR" && record?.status === "ARCHIVED";
  const [artwork, setArtwork] = useState(show?.posterUrl ?? "");
  const [video, setVideo] = useState(episode?.youtubeVideoId ?? show?.trailerYoutubeVideoId ?? "");
  const [playingId, setPlayingId] = useState<string>();
  const videoId = youtubeIdFromInput(video.trim());
  const poster = staffArtworkUrlSchema.safeParse(artwork.trim()).data;
  const source = poster ?? (videoId ? youtubeThumbnail(videoId) : undefined);
  const [state, action, pending] = useActionState(
    saveStudioContent.bind(null, kind, record?.id ?? null),
    {},
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = form.get("status");
    if (
      status === "ARCHIVED" &&
      record?.status !== "ARCHIVED" &&
      !window.confirm("Archive this item? It will be removed from public discovery.")
    )
      return;
    if (
      record?.status === "PUBLISHED" &&
      status === "DRAFT" &&
      !window.confirm(
        "Unpublish this item and move it to drafts? Its public page will no longer be visible.",
      )
    )
      return;
    startTransition(() => action(form));
  }

  return (
    <div className="studio-edit-grid">
      <form action={action} onSubmit={submit} className="studio-form">
        {record && <input type="hidden" name="revision" value={record.updatedAt} />}
        {readOnly && (
          <p className="studio-notice">An administrator can edit or restore archived content.</p>
        )}
        <fieldset disabled={readOnly || pending}>
          <label>
            Title
            <input name="title" defaultValue={record?.title} maxLength={120} dir="auto" required />
          </label>
          <label>
            Slug
            <input
              name="slug"
              defaultValue={record?.slug}
              maxLength={140}
              readOnly={locked}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
            <small>
              {locked
                ? "Locked to preserve the public URL."
                : "Use lowercase letters, numbers and hyphens."}
            </small>
          </label>
          <label>
            Description
            <textarea
              name="description"
              rows={5}
              dir="auto"
              maxLength={5000}
              defaultValue={record?.description ?? ""}
            />
          </label>
          {props.kind === "shows" ? (
            <>
              <label>
                Artwork URL
                <input
                  name="posterUrl"
                  type="url"
                  maxLength={2048}
                  placeholder="https://"
                  value={artwork}
                  onChange={(event) => setArtwork(event.target.value)}
                />
                <small>Link to approved artwork on an HTTPS image host.</small>
              </label>
              <label>
                Trailer on YouTube
                <input
                  name="trailerYoutubeVideoId"
                  maxLength={500}
                  value={video}
                  onChange={(event) => setVideo(event.target.value)}
                />
              </label>
              <div className="studio-fields">
                <label>
                  Genre
                  <input name="genre" maxLength={80} defaultValue={show?.genre ?? ""} />
                </label>
                <label>
                  Release year
                  <input
                    name="releaseYear"
                    type="number"
                    min={1900}
                    max={9999}
                    defaultValue={show?.releaseYear ?? ""}
                  />
                </label>
              </div>
              <label className="studio-checkbox">
                <input name="featured" type="checkbox" defaultChecked={show?.featured} />
                Feature in discovery
              </label>
            </>
          ) : (
            <>
              {locked && <input type="hidden" name="showId" value={episode?.showId} />}
              <label>
                Production
                <select
                  name="showId"
                  defaultValue={episode?.showId ?? props.initialShow ?? ""}
                  disabled={locked}
                  required
                >
                  <option value="">Select a production</option>
                  {props.shows.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title} · {option.status.toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                YouTube video ID or URL
                <input
                  name="youtubeVideoId"
                  maxLength={500}
                  value={video}
                  onChange={(event) => setVideo(event.target.value)}
                />
              </label>
              <div className="studio-fields">
                <label>
                  Episode number
                  <input
                    name="episodeNumber"
                    type="number"
                    min={1}
                    max={2147483647}
                    defaultValue={episode?.episodeNumber ?? ""}
                  />
                </label>
                <label>
                  Duration in seconds
                  <input
                    name="durationSeconds"
                    type="number"
                    min={1}
                    max={2147483647}
                    defaultValue={episode?.durationSeconds ?? ""}
                  />
                </label>
              </div>
              <label>
                Publication date (UTC)
                <input
                  name="publishedAt"
                  type="datetime-local"
                  step="any"
                  defaultValue={episode?.publishedAt?.replace(/Z$/, "") ?? ""}
                />
                <small>
                  A published episode appears publicly when its production is published.
                </small>
              </label>
            </>
          )}
          <label>
            Publication status
            <select name="status" defaultValue={record?.status ?? "DRAFT"}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              {(role === "ADMIN" || readOnly) && <option value="ARCHIVED">Archived</option>}
            </select>
          </label>
        </fieldset>
        {state.error && (
          <p className="studio-error" role="alert">
            {state.error}
          </p>
        )}
        {!readOnly && (
          <button className="studio-button" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        )}
      </form>
      {(source || videoId) && (
        <aside aria-labelledby="studio-media-preview" className="studio-preview">
          <h2 id="studio-media-preview">Media preview</h2>
          {source && (
            <div className="studio-preview-image">
              <Image
                src={source}
                alt={poster ? "Selected artwork" : "YouTube thumbnail"}
                fill
                sizes="(max-width: 900px) 90vw, 32vw"
                unoptimized
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          {videoId &&
            (playingId === videoId ? (
              <YouTubePlayer title="Studio video preview" videoId={videoId} />
            ) : (
              <button
                className="studio-button studio-button-outline"
                type="button"
                onClick={() => setPlayingId(videoId)}
              >
                Preview playback
              </button>
            ))}
        </aside>
      )}
    </div>
  );
}
