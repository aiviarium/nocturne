'use client';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import data from '@/generated/nocturne.json';
import { asset } from '@/lib/site';

// Nocturne's examples are SolidJS. The site shows them in iframes of the
// gallery's #/frame/<example> route, which scripts/gallery.ts builds into
// public/gallery/. A frame takes the theme of the page; a change of theme only
// changes the hash, so the example restyles without reloading.

interface Meta {
  title: string;
  note?: string;
  verdict?: 'do' | 'dont';
  phone?: boolean;
  height?: number;
}
const examples = data.examples as Record<string, Meta>;

/** An iPhone 15 or 16 in CSS px, as the gallery's `device=iphone` emulates it. */
const IPHONE = { width: 393, height: 852 };

const noop = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

function useFrameTheme(): 'dark' | 'light' {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'light' ? 'light' : 'dark';
}

function frameUrl(id: string, theme: string, phone: boolean) {
  return asset(`/gallery/index.html#/frame/${id}?theme=${theme}&accent=iris${phone ? '&device=iphone' : ''}`);
}

/**
 * The height of the example inside a frame: the in-flow content of `.ex-root` and
 * its padding. The root itself is at least as tall as the frame, so it cannot be
 * measured directly.
 */
function contentHeight(doc: Document): number | null {
  const root = doc.querySelector<HTMLElement>('.ex-root');
  if (!root) return null;
  const top = root.getBoundingClientRect().top;
  let bottom = 0;
  for (const child of Array.from(root.children)) {
    const position = doc.defaultView?.getComputedStyle(child).position;
    if (position === 'fixed' || position === 'absolute') continue;
    bottom = Math.max(bottom, child.getBoundingClientRect().bottom - top);
  }
  const padding = Number.parseFloat(doc.defaultView?.getComputedStyle(root).paddingBottom ?? '0');
  return Math.ceil(bottom + padding);
}

/** A desktop example at the width of the column, as tall as its content. */
function DesktopFrame({ id, title, minHeight }: { id: string; title: string; minHeight: number }) {
  const theme = useFrameTheme();
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let observer: ResizeObserver | undefined;
    let mutations: MutationObserver | undefined;
    const attach = () => {
      const doc = element.contentDocument;
      const root = doc?.querySelector('.ex-root');
      if (!doc || !root) return false;
      const measure = () => {
        const h = contentHeight(doc);
        if (h !== null) setHeight(Math.max(minHeight, h));
      };
      observer = new ResizeObserver(measure);
      const watch = () => {
        observer?.disconnect();
        for (const child of Array.from(root.children)) observer?.observe(child);
        measure();
      };
      mutations = new MutationObserver(watch);
      mutations.observe(root, { childList: true });
      watch();
      return true;
    };
    // The example renders after the frame's script runs; try until its root is there.
    let tries = 0;
    const timer = window.setInterval(() => {
      if (attach() || ++tries > 100) window.clearInterval(timer);
    }, 100);
    return () => {
      window.clearInterval(timer);
      observer?.disconnect();
      mutations?.disconnect();
    };
  }, [id, minHeight]);

  return (
    <iframe
      ref={frame}
      className="ex-frame"
      src={frameUrl(id, theme, false)}
      title={title}
      loading="lazy"
      style={{ height }}
    />
  );
}

/** A phone example in an iPhone's frame, scaled down when the column is narrower. */
function PhoneFrame({ id, title, height }: { id: string; title: string; height: number }) {
  const theme = useFrameTheme();
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, element.clientWidth / (IPHONE.width + 20))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const src = frameUrl(id, theme, true);
  return (
    <div ref={box} className="ex-device-box" style={{ height: (height + 20) * scale }}>
      <div className="ex-device" style={{ transform: `scale(${scale})` }}>
        <iframe className="ex-device-screen" src={src} title={title} loading="lazy" style={{ width: IPHONE.width, height }} />
      </div>
    </div>
  );
}

interface ExampleProps {
  /** The example's id: `button/variants` is `examples/button/variants.tsx`. */
  id: string;
  /** The least height of the frame, for examples that open a menu or popover. */
  minHeight?: number;
  /** Show the title and note of the example above it. On by default. */
  caption?: boolean;
}

/** One of Nocturne's examples, live, in the theme of the page. */
export function Example({ id, minHeight = 0, caption = true }: ExampleProps) {
  const mounted = useMounted();
  const theme = useFrameTheme();
  const meta = examples[id];
  if (!meta) throw new Error(`No Nocturne example ${id}`);
  const phoneHeight = Math.min(IPHONE.height, Math.max(640, meta.height ?? IPHONE.height));
  return (
    <figure className="ex not-prose" data-example={id} data-verdict={meta.verdict}>
      {caption && (
        <figcaption className="ex-caption">
          <span className="ex-title">
            {meta.verdict && <span className="ex-verdict">{meta.verdict === 'do' ? 'Do' : "Don't"}</span>}
            {meta.title}
          </span>
          {meta.note && <span className="ex-note">{meta.note}</span>}
        </figcaption>
      )}
      <div className="ex-stage" data-phone={meta.phone ? '' : undefined}>
        {!mounted ? (
          <div className="ex-placeholder" style={{ height: meta.phone ? phoneHeight : Math.max(minHeight, 120) }} />
        ) : meta.phone ? (
          <PhoneFrame id={id} title={meta.title} height={phoneHeight} />
        ) : (
          <DesktopFrame id={id} title={meta.title} minHeight={minHeight} />
        )}
      </div>
      <a className="ex-open" href={frameUrl(id, mounted ? theme : 'dark', Boolean(meta.phone))} target="_blank" rel="noreferrer">
        Open the example ↗
      </a>
    </figure>
  );
}

/**
 * A design rule as one comparison: the right way, then the wrong way it replaces. Both are labelled, and the wrong
 * one has a danger edge, so neither reads as a pattern on its own.
 */
export function DoDont({ do: right, dont: wrong, minHeight }: { do: string; dont: string; minHeight?: number }) {
  for (const [id, verdict] of [
    [right, 'do'],
    [wrong, 'dont'],
  ] as const) {
    if (examples[id]?.verdict !== verdict) throw new Error(`DoDont: ${id} is not marked verdict "${verdict}"`);
  }
  return (
    <div className="ex-pair not-prose" data-part="do-dont">
      <Example id={right} minHeight={minHeight} />
      <Example id={wrong} minHeight={minHeight} />
    </div>
  );
}

/** A link to a page of the gallery, where every example of a part is shown. */
export function GalleryLink({ page, children }: { page: string; children?: React.ReactNode }) {
  const found = data.pages.find((p) => p.id === page);
  if (!found) throw new Error(`No gallery page ${page}`);
  return (
    <a href={asset(`/gallery/index.html#/${page}`)} target="_blank" rel="noreferrer">
      {children ?? `${found.title} in the gallery`} ↗
    </a>
  );
}
