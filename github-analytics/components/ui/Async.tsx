import type { ReactNode } from 'react';
import type { AsyncState } from '@/lib/types';

interface AsyncProps<T> {
  state: AsyncState<T>;
  /** Return true when the data loaded but has nothing to show. */
  isEmpty?: (data: T) => boolean;
  emptyText?: string;
  children: (data: T) => ReactNode;
}

/** Renders loading / error / empty / ready for a piece of async data. */
export function Async<T>({ state, isEmpty, emptyText = 'No data to show yet.', children }: AsyncProps<T>) {
  if (state.status === 'loading') {
    return <div className="skeleton" role="status" aria-label="Loading" />;
  }
  if (state.status === 'error') {
    return (
      <div className="state err" role="alert">
        {state.error}
      </div>
    );
  }
  if (isEmpty?.(state.data)) return <div className="state">{emptyText}</div>;
  return <>{children(state.data)}</>;
}
