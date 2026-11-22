import { useCallback, useEffect, useRef, useState } from "react";

export function useResource<T>(key: string, load: () => Promise<T>) {
  const loader = useRef(load);
  loader.current = load;
  const sequence = useRef(0);
  const [state, setState] = useState<{ key: string; data?: T; error?: string; loading: boolean }>({
    key,
    loading: true,
  });
  const refresh = useCallback(async () => {
    const id = ++sequence.current;
    setState((previous) => ({
      key,
      data: previous.key === key ? previous.data : undefined,
      loading: true,
    }));
    try {
      const data = await loader.current();
      if (id === sequence.current) setState({ key, data, loading: false });
    } catch (error) {
      if (id === sequence.current)
        setState((previous) => ({
          ...previous,
          loading: false,
          error: error instanceof Error ? error.message : "Something went wrong.",
        }));
    }
  }, [key]);
  useEffect(() => {
    void refresh();
    return () => {
      sequence.current++;
    };
  }, [refresh]);
  return {
    ...(state.key === key ? state : { data: undefined, error: undefined, loading: true }),
    refresh,
  };
}
