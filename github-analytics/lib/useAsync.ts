'use client';

import { useEffect, useState } from 'react';
import type { AsyncState } from './types';

/** Runs `load` once (and again if `dep` changes). Pass `enabled=false` to hold in loading state. */
export function useAsync<T>(load: () => Promise<T>, dep: unknown = null, enabled = true): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'loading' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    load().then(
      (data) => !cancelled && setState({ status: 'ready', data }),
      (e: unknown) =>
        !cancelled && setState({ status: 'error', error: e instanceof Error ? e.message : 'Unknown error' }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep, enabled]);

  return state;
}
