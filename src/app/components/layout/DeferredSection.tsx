import React from 'react';
import { registerSectionPreloader, unregisterSectionPreloader } from '../../utils/sectionPreload';

type LazyComponentWithPreload<T extends React.ComponentType<any>> = React.LazyExoticComponent<T> & {
  preload?: () => Promise<unknown>;
};

export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyComponentWithPreload<T> {
  const Component = React.lazy(factory) as LazyComponentWithPreload<T>;
  Component.preload = factory;
  return Component;
}

export function DeferredSection<T extends React.ComponentType<any>>({
  anchorId,
  component: Component,
  rootMargin = '1200px 0px',
  fallback = null,
}: {
  anchorId?: string;
  component: LazyComponentWithPreload<T>;
  rootMargin?: string;
  fallback?: React.ReactNode;
}) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = React.useState(false);

  const preload = React.useCallback(() => Component.preload?.(), [Component]);

  React.useEffect(() => {
    if (!anchorId) return;
    registerSectionPreloader(anchorId, preload);
    return () => unregisterSectionPreloader(anchorId, preload);
  }, [anchorId, preload]);

  React.useEffect(() => {
    if (shouldRender) return;

    if (!('IntersectionObserver' in window)) {
      preload();
      setShouldRender(true);
      return;
    }

    const node = wrapperRef.current;
    if (!node) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          preload();
          setShouldRender(true);
          obs.disconnect();
        }
      },
      {
        rootMargin,
        threshold: 0.01,
      },
    );

    obs.observe(node);
    return () => obs.disconnect();
  }, [preload, rootMargin, shouldRender]);

  return (
    <div id={anchorId} ref={wrapperRef}>
      {shouldRender ? (
        <React.Suspense fallback={fallback}>
          <Component />
        </React.Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}
