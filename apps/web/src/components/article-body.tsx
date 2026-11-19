import Image from "next/image";
import type { ArticleBlock } from "@biling/contracts";
import { YouTubePlayer } from "./youtube-player";
import { articleInline } from "@/lib/article-inline";

function inline(text: string) {
  return articleInline(text).map((part, index) => {
    switch (part.type) {
      case "bold":
        return <strong key={index}>{part.text}</strong>;
      case "italic":
        return <em key={index}>{part.text}</em>;
      case "link":
        return (
          <a key={index} href={part.href} rel="noopener noreferrer">
            {part.text}
          </a>
        );
      default:
        return part.text;
    }
  });
}

export function ArticleBody({ blocks, title }: { blocks: ArticleBlock[]; title: string }) {
  return (
    <div className="article-prose">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return <p key={index}>{inline(block.text)}</p>;
          case "heading":
            return <h2 key={index}>{inline(block.text)}</h2>;
          case "quote":
            return (
              <blockquote key={index}>
                <p>{inline(block.text)}</p>
              </blockquote>
            );
          case "ordered":
          case "unordered": {
            const List = block.type === "ordered" ? "ol" : "ul";
            return (
              <List key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{inline(item)}</li>
                ))}
              </List>
            );
          }
          case "image":
            return (
              <figure key={index}>
                <Image
                  src={block.url}
                  alt={block.alt}
                  width={900}
                  height={600}
                  unoptimized
                  referrerPolicy="no-referrer"
                />
                {block.credit && <figcaption>{block.credit}</figcaption>}
              </figure>
            );
          case "youtube":
            return (
              <div key={index} className="article-embed">
                <YouTubePlayer videoId={block.videoId} title={title} lazy />
              </div>
            );
        }
      })}
    </div>
  );
}
