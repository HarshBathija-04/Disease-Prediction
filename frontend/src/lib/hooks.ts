import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";

type FetchState<T> = { data?: T; error?: ApiError; loading: boolean };

/** GET `path` (skipped when null); returns data/error/loading plus reload and a local setter. */
export function useFetch<T>(path: string | null) {
  const [state, setState] = useState<FetchState<T>>({ loading: Boolean(path) });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    api<T>(path)
      .then((data) => alive && setState({ data, loading: false }))
      .catch((error: ApiError) => alive && setState({ error, loading: false }));
    return () => {
      alive = false;
    };
  }, [path, nonce]);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: undefined }));
    setNonce((n) => n + 1);
  }, []);
  const setData = useCallback((data: T) => setState({ data, loading: false }), []);
  return { ...state, reload, setData };
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Symptra` : "Symptra · Symptom checker & doctor consultations";
  }, [title]);
}
