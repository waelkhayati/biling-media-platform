import { useState } from "react";
import { Action, Copy, Status } from "./ui";
import { useResource } from "./resource";
import type { ReactNode } from "react";

export function Catalog<T extends { id: string }>({
  load,
  render,
  empty,
}: {
  load: (page: number) => Promise<{ items: T[]; hasMore: boolean }>;
  render: (item: T) => ReactNode;
  empty: string;
}) {
  const first = useResource("first", () => load(1));
  const [extra, setExtra] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function next() {
    setBusy(true);
    setError(undefined);
    try {
      const result = await load(page + 1);
      setExtra((items) => [...items, ...result.items]);
      setMore(result.hasMore);
      setPage(page + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more.");
    } finally {
      setBusy(false);
    }
  }
  const items = [
    ...new Map([...(first.data?.items ?? []), ...extra].map((item) => [item.id, item])).values(),
  ];
  return (
    <>
      <Status
        skeleton="rows"
        loading={first.loading && first.data === undefined}
        error={first.error}
        retry={first.refresh}
      />
      {first.data && !items.length && <Copy muted>{empty}</Copy>}
      {items.map(render)}
      <Status error={error} />
      {(more ?? first.data?.hasMore) && (
        <Action quiet disabled={busy} label={busy ? "Loading…" : "Load more"} onPress={next} />
      )}
    </>
  );
}
