"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import type { ArticleBlock, StudioArticle } from "@biling/contracts";
import { youtubeIdFromInput } from "@biling/schemas";
import { saveStudioArticle } from "@/app/admin/actions";

export type ArticleOptions = {
  authors: string[];
  categories: string[];
  shows: { id: string; title: string }[];
  episodes: { id: string; title: string; showTitle: string }[];
};
type BlockType = ArticleBlock["type"];
const blockLabels: Record<BlockType, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  quote: "Blockquote",
  ordered: "Numbered list",
  unordered: "Bulleted list",
  image: "Image",
  youtube: "YouTube",
};
type Entry = { key: number; block: ArticleBlock };

function emptyBlock(type: BlockType): ArticleBlock {
  switch (type) {
    case "image":
      return { type, url: "", alt: "", credit: null };
    case "youtube":
      return { type, videoId: "" };
    case "ordered":
    case "unordered":
      return { type, items: [""] };
    default:
      return { type, text: "" };
  }
}

function FormattedText({
  value,
  update,
  list,
}: {
  value: string;
  update: (value: string) => void;
  list: boolean;
}) {
  const field = useRef<HTMLTextAreaElement>(null);

  function format(prefix: string, suffix: string, example: string) {
    const area = field.current;
    if (!area) return;
    const { selectionStart, selectionEnd } = area;
    const selected = value.slice(selectionStart, selectionEnd) || example;
    update(value.slice(0, selectionStart) + prefix + selected + suffix + value.slice(selectionEnd));
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(
        selectionStart + prefix.length,
        selectionStart + prefix.length + selected.length,
      );
    });
  }

  return (
    <>
      <div role="group" aria-label="Text formatting" className="studio-article-tools">
        <button type="button" onClick={() => format("**", "**", "bold text")}>
          Bold
        </button>
        <button type="button" onClick={() => format("*", "*", "italic text")}>
          Italic
        </button>
        <button type="button" onClick={() => format("[", "](https://example.com)", "link text")}>
          Link
        </button>
      </div>
      <label>
        {list ? "One list item per line" : "Text"}
        <textarea
          ref={field}
          dir="auto"
          rows={list ? 3 : 4}
          value={value}
          onChange={(event) => update(event.target.value)}
        />
      </label>
    </>
  );
}

function BlockEditor({
  block,
  update,
}: {
  block: ArticleBlock;
  update: (block: ArticleBlock) => void;
}) {
  switch (block.type) {
    case "image":
      return (
        <>
          <label>
            Image URL
            <input
              type="url"
              value={block.url}
              onChange={(event) => update({ ...block, url: event.target.value })}
            />
          </label>
          <label>
            Alternative text
            <input
              maxLength={250}
              value={block.alt}
              onChange={(event) => update({ ...block, alt: event.target.value })}
            />
          </label>
          <label>
            Image credit
            <input
              maxLength={200}
              value={block.credit ?? ""}
              onChange={(event) => update({ ...block, credit: event.target.value || null })}
            />
          </label>
        </>
      );
    case "youtube":
      return (
        <label>
          YouTube URL or video ID
          <input
            value={block.videoId}
            onChange={(event) => update({ ...block, videoId: event.target.value })}
          />
        </label>
      );
    case "ordered":
    case "unordered":
      return (
        <FormattedText
          list
          value={block.items.join("\n")}
          update={(value) => update({ ...block, items: value.split("\n") })}
        />
      );
    default:
      return (
        <FormattedText
          list={false}
          value={block.text}
          update={(value) => update({ ...block, text: value })}
        />
      );
  }
}

export function StudioArticleEditor({
  article,
  options,
  admin,
}: {
  article: StudioArticle | null;
  options: ArticleOptions;
  admin: boolean;
}) {
  const [blocks, setBlocks] = useState<Entry[]>(() =>
    (article?.body ?? []).map((block, key) => ({ key, block })),
  );
  const nextKey = useRef(blocks.length);
  const [type, setType] = useState<BlockType>("paragraph");
  const [state, submit, pending] = useActionState(
    saveStudioArticle.bind(null, article?.id ?? null),
    {},
  );
  const [fields, setFields] = useState(() => ({
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    author: article?.author ?? "",
    category: article?.category ?? "",
    language: article?.language ?? "en",
    tags: article?.tags.join(", ") ?? "",
    imageUrl: article?.imageUrl ?? "",
    imageAlt: article?.imageAlt ?? "",
    imageCaption: article?.imageCaption ?? "",
    imageCredit: article?.imageCredit ?? "",
    seoTitle: article?.seoTitle ?? "",
    seoDescription: article?.seoDescription ?? "",
    status: article?.status ?? "DRAFT",
  }));
  const [featured, setFeatured] = useState(article?.featured ?? false);
  const [showIds, setShowIds] = useState(article?.showIds ?? []);
  const [episodeIds, setEpisodeIds] = useState(article?.episodeIds ?? []);
  const editable = admin || article?.status !== "ARCHIVED";

  function field(name: keyof typeof fields) {
    return {
      name,
      value: fields[name],
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => {
        const value = event.target.value;
        setFields((current) => ({ ...current, [name]: value }));
      },
    };
  }

  function addBlock() {
    const entry = { key: nextKey.current++, block: emptyBlock(type) };
    setBlocks((current) => [...current, entry]);
  }

  function moveBlock(index: number, offset: number) {
    setBlocks((current) => {
      const reordered = current.slice();
      [reordered[index], reordered[index + offset]] = [reordered[index + offset], reordered[index]];
      return reordered;
    });
  }

  const body = blocks.map(({ block }) =>
    block.type === "youtube"
      ? { ...block, videoId: youtubeIdFromInput(block.videoId.trim()) ?? block.videoId }
      : block.type === "ordered" || block.type === "unordered"
        ? { ...block, items: block.items.filter((item) => item.trim()) }
        : block,
  );

  return (
    <form
      className="studio-form studio-article-form"
      action={submit}
      onSubmit={(event) => {
        const archive = fields.status === "ARCHIVED" && article?.status !== "ARCHIVED";
        const unpublish = article?.status === "PUBLISHED" && fields.status === "DRAFT";
        if (
          (archive || unpublish) &&
          !window.confirm(archive ? "Archive this article?" : "Unpublish this article?")
        )
          event.preventDefault();
      }}
    >
      <input type="hidden" name="revision" value={article?.updatedAt ?? ""} />
      <input type="hidden" name="body" value={JSON.stringify(body)} />
      {!editable && <p role="status">Only administrators can change archived articles.</p>}
      <fieldset disabled={!editable || pending}>
        <legend>Article details</legend>
        <label>
          Title
          <input {...field("title")} required maxLength={160} />
        </label>
        <label>
          Slug
          <input
            {...field("slug")}
            required
            maxLength={140}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            readOnly={!!article?.firstPublishedAt}
          />
          {article?.firstPublishedAt ? (
            <small>The slug is locked after first publication.</small>
          ) : (
            <small>Use lowercase letters, numbers and hyphens.</small>
          )}
        </label>
        <label>
          Excerpt
          <textarea {...field("excerpt")} maxLength={500} rows={3} />
        </label>
        <div className="studio-article-row">
          <label>
            Byline
            <input {...field("author")} list="article-authors" required maxLength={80} dir="auto" />
            <datalist id="article-authors">
              {options.authors.map((author) => (
                <option key={author} value={author} />
              ))}
            </datalist>
          </label>
          <label>
            Category
            <input
              {...field("category")}
              list="article-categories"
              required
              maxLength={80}
              dir="auto"
            />
            <datalist id="article-categories">
              {options.categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>
          <label>
            Language
            <select {...field("language")}>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="ar">Arabic</option>
            </select>
          </label>
        </div>
        <label>
          Tags (comma-separated)
          <input {...field("tags")} maxLength={500} />
        </label>
        <label>
          Featured image URL
          <input {...field("imageUrl")} type="url" />
        </label>
        <div className="studio-article-row">
          <label>
            Featured image alternative text
            <input {...field("imageAlt")} maxLength={250} />
          </label>
          <label>
            Caption
            <input {...field("imageCaption")} maxLength={300} />
          </label>
          <label>
            Image credit
            <input {...field("imageCredit")} maxLength={200} />
          </label>
        </div>
        <label className="studio-checkbox">
          <input
            name="featured"
            type="checkbox"
            checked={featured}
            onChange={(event) => setFeatured(event.target.checked)}
          />{" "}
          Feature in editorial discovery
        </label>
      </fieldset>
      <fieldset disabled={!editable || pending}>
        <legend>Body</legend>
        {blocks.map(({ key, block }, index) => (
          <fieldset className="studio-article-block" key={key}>
            <legend>
              {index + 1}. {blockLabels[block.type]}
            </legend>
            <BlockEditor
              block={block}
              update={(updated) =>
                setBlocks((current) =>
                  current.map((entry) => (entry.key === key ? { key, block: updated } : entry)),
                )
              }
            />
            <div className="studio-article-tools">
              <button type="button" disabled={index === 0} onClick={() => moveBlock(index, -1)}>
                Move up
              </button>
              <button
                type="button"
                disabled={index === blocks.length - 1}
                onClick={() => moveBlock(index, 1)}
              >
                Move down
              </button>
              <button
                type="button"
                onClick={() => setBlocks((current) => current.filter((entry) => entry.key !== key))}
              >
                Remove {blockLabels[block.type].toLowerCase()}
              </button>
            </div>
          </fieldset>
        ))}
        <div className="studio-article-tools">
          <label>
            Block type
            <select value={type} onChange={(event) => setType(event.target.value as BlockType)}>
              {Object.entries(blockLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={blocks.length >= 100} onClick={addBlock}>
            Add block
          </button>
        </div>
      </fieldset>
      <fieldset disabled={!editable || pending}>
        <legend>Related content and search metadata</legend>
        <div className="studio-article-row">
          <label>
            Productions
            <select
              name="showIds"
              multiple
              size={5}
              value={showIds}
              onChange={(event) =>
                setShowIds(Array.from(event.target.selectedOptions, (option) => option.value))
              }
            >
              {options.shows.map(({ id, title }) => (
                <option value={id} key={id}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Episodes
            <select
              name="episodeIds"
              multiple
              size={5}
              value={episodeIds}
              onChange={(event) =>
                setEpisodeIds(Array.from(event.target.selectedOptions, (option) => option.value))
              }
            >
              {options.episodes.map(({ id, title, showTitle }) => (
                <option value={id} key={id}>
                  {showTitle} · {title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <small>Select up to 10 of each. Use Ctrl or Cmd to select multiple items on desktop.</small>
        <label>
          SEO title
          <input {...field("seoTitle")} maxLength={70} />
        </label>
        <label>
          SEO description
          <textarea {...field("seoDescription")} rows={3} maxLength={160} />
        </label>
      </fieldset>
      <div className="studio-actions">
        {editable && (
          <>
            <label>
              Publication status
              <select {...field("status")}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                {admin && <option value="ARCHIVED">Archived</option>}
              </select>
            </label>
            <button className="studio-button" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save article"}
            </button>
          </>
        )}
        {article && (
          <Link href={"/admin/articles/" + article.id + "/preview"} prefetch={false}>
            Preview saved article
          </Link>
        )}
      </div>
      {state.error && (
        <p className="studio-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
