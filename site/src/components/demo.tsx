'use client';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { asset } from '@/lib/site';

// Nocturne's demo app is SolidJS. scripts/demo.ts builds it into public/demo/,
// and the site shows it in an iframe. Its address is the part after the hash,
// such as #/projects/atlas/build/issues/WEB-142. The theme of the page goes in
// the query when the frame opens; after that a change of theme is posted to the
// frame as a message, so the demo keeps its place instead of reloading.

type Theme = 'dark' | 'light';

const noop = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

function usePageTheme(): Theme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'light' ? 'light' : 'dark';
}

/** The demo at an address, such as `projects/atlas/build/issues/WEB-142`. */
export function demoUrl(to = '', theme?: Theme) {
  const path = to.replace(/^[#/]+/, '');
  return asset(`/demo/index.html${theme ? `?theme=${theme}` : ''}#/${path}`);
}

/** The demo, large, in the theme of the page, with a link that opens it full screen where it is. */
export function DemoFrame({ to = '', height = 760 }: { to?: string; height?: number }) {
  const mounted = useMounted();
  const theme = usePageTheme();
  const frame = useRef<HTMLIFrameElement>(null);

  /** Opens the demo full screen at the address it shows now. */
  const openFull = (e: React.MouseEvent<HTMLAnchorElement>) => {
    let hash = '';
    try {
      hash = frame.current?.contentWindow?.location.hash ?? '';
    } catch {}
    if (hash) e.currentTarget.href = demoUrl(hash, theme);
  };

  return (
    <figure className="demo not-prose" data-part="demo">
      <div className="demo-stage" style={{ height }}>
        {mounted ? (
          <DemoIframe frame={frame} to={to} theme={theme} />
        ) : (
          <div className="ex-placeholder" style={{ height }} />
        )}
      </div>
      <a
        className="ex-open"
        href={demoUrl(to, mounted ? theme : 'dark')}
        onClick={openFull}
        target="_blank"
        rel="noreferrer"
      >
        Open it full screen ↗
      </a>
    </figure>
  );
}

/** The frame opens once, in the theme of the page then; later themes go to it as messages. */
function DemoIframe({
  frame,
  to,
  theme,
}: {
  frame: React.RefObject<HTMLIFrameElement | null>;
  to: string;
  theme: Theme;
}) {
  const [src] = useState(() => demoUrl(to, theme));
  const post = () =>
    frame.current?.contentWindow?.postMessage({ type: 'nocturne-demo:theme', theme }, window.location.origin);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'nocturne-demo:theme', theme }, window.location.origin);
  }, [frame, theme]);
  return <iframe ref={frame} className="demo-frame" src={src} title="The Nocturne demo" onLoad={post} />;
}

/** A link into the demo at an address, such as `projects/atlas/build/issues/WEB-142`, in a new tab. */
export function DemoLink({ to, children }: { to: string; children?: ReactNode }) {
  const mounted = useMounted();
  const theme = usePageTheme();
  return (
    <a href={demoUrl(to, mounted ? theme : undefined)} target="_blank" rel="noreferrer" data-demo-link={to}>
      {children ?? 'Try it in the demo'} ↗
    </a>
  );
}
