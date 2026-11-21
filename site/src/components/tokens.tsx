import type { CSSProperties } from 'react';
import data from '@/generated/nocturne.json';

// Tables of Nocturne's tokens, drawn from src/generated/nocturne.json, which
// scripts/nocturne-data.ts reads from the library's tokens.css at build time.

type Theme = 'dark' | 'light';
const colours = data.colours as Record<Theme, Record<string, string>>;
const scale = data.scale as Record<string, string>;
const THEMES: Theme[] = ['dark', 'light'];

/** A colour painted over its theme's card surface, so tints and glows show as they do in use. */
function Swatch({ value, theme }: { value: string; theme: Theme }) {
  const base = colours[theme]['bg-1'];
  const style: CSSProperties = {
    background: `linear-gradient(${value}, ${value}), ${base}`,
    borderColor: colours[theme]['line-strong'],
  };
  return <span className="tk-swatch" style={style} aria-hidden />;
}

/** The tokens whose names start with one of `prefix`, or the names in `names`. */
function select(prefix?: string[], names?: string[]): string[] {
  const all = Object.keys(colours.dark);
  if (names) return names.filter((name) => all.includes(name));
  return all.filter((name) => prefix?.some((p) => name === p || name.startsWith(`${p}-`)));
}

/** Colour tokens with their dark and light values. */
export function ColourTable({ prefix, names }: { prefix?: string[]; names?: string[] }) {
  const tokens = select(prefix, names);
  return (
    <div className="tk-table-wrap not-prose">
      <table className="tk-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Dark</th>
            <th>Light</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((name) => (
            <tr key={name}>
              <td>
                <code>--{name}</code>
              </td>
              {THEMES.map((theme) => (
                <td key={theme}>
                  <span className="tk-value">
                    <Swatch value={colours[theme][name]} theme={theme} />
                    <code>{colours[theme][name]}</code>
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The six accent presets of `ACCENTS`. */
export function AccentTable() {
  return (
    <div className="tk-table-wrap not-prose">
      <table className="tk-table">
        <thead>
          <tr>
            <th>Preset</th>
            <th>Dark</th>
            <th>Light</th>
          </tr>
        </thead>
        <tbody>
          {data.accents.map((accent) => (
            <tr key={accent.id}>
              <td>
                {accent.name} <code>{accent.id}</code>
              </td>
              {THEMES.map((theme) => (
                <td key={theme}>
                  <span className="tk-value">
                    <Swatch value={accent[theme]} theme={theme} />
                    <code>{accent[theme]}</code>
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The type classes of tokens.css, each drawn at its size. */
export function TypeScale() {
  return (
    <div className="tk-type not-prose">
      {data.type.map((style) => {
        const css: CSSProperties = {
          fontFamily: style.family === 'mono' ? 'var(--font-mono)' : 'var(--font-sans)',
          fontSize: style.size,
          lineHeight: style.lineHeight,
          fontWeight: Number(style.weight),
          letterSpacing: style.letterSpacing ?? undefined,
        };
        const spec = [
          `${style.size.replace('px', '')}/${style.lineHeight.replace('px', '')}`,
          style.weight,
          style.family === 'mono' ? 'JetBrains Mono' : 'Inter',
          style.letterSpacing,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <div key={style.name} className="tk-type-row">
            <div className="tk-type-name">
              <code>.{style.name}</code>
              <span>{spec}</span>
            </div>
            <div className="tk-type-sample" style={css}>
              {style.name === 'display' || style.name === 'figure-xl' ? '1,284' : 'Review the open issues'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const byPrefix = (prefix: string) => Object.keys(scale).filter((name) => name.startsWith(`${prefix}-`));

/** A scale of lengths: spacing as bars, radii as corners, sizes as heights. */
export function LengthScale({ prefix, names, kind }: { prefix?: string; names?: string[]; kind: 'space' | 'radius' | 'height' }) {
  const tokens = names ?? (prefix ? byPrefix(prefix) : []);
  return (
    <div className="tk-table-wrap not-prose">
      <table className="tk-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Value</th>
            <th aria-label="Preview" />
          </tr>
        </thead>
        <tbody>
          {tokens.map((name) => {
            const value = scale[name];
            const preview =
              kind === 'space' ? (
                <span className="tk-bar" style={{ width: value }} />
              ) : kind === 'radius' ? (
                <span className="tk-corner" style={{ borderRadius: value }} />
              ) : (
                <span className="tk-height" style={{ height: value }} />
              );
            return (
              <tr key={name}>
                <td>
                  <code>--{name}</code>
                </td>
                <td>
                  <code>{value}</code>
                </td>
                <td className="tk-preview">{preview}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The font stacks. */
export function FontTable() {
  return (
    <div className="tk-table-wrap not-prose">
      <table className="tk-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {byPrefix('font').map((name) => (
            <tr key={name}>
              <td>
                <code>--{name}</code>
              </td>
              <td>
                <code>{scale[name]}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SHADOWS = ['shadow-overlay', 'focus-ring', 'focus-ring-inset', 'glow-live', 'glow-ai'];

/** Shadows, rings and glows, each on a tile of its theme. */
export function ShadowTable() {
  return (
    <div className="tk-shadows not-prose">
      {SHADOWS.map((name) => (
        <div key={name} className="tk-shadow-row">
          <code className="tk-shadow-name">--{name}</code>
          <div className="tk-shadow-tiles">
            {THEMES.map((theme) => {
              const c = colours[theme];
              const glow = name.startsWith('glow');
              const tile: CSSProperties = { background: c['bg-0'], borderColor: c['line-soft'] };
              const sample: CSSProperties = glow
                ? { background: name === 'glow-live' ? c.success : c['accent-strong'], boxShadow: c[name] }
                : { background: c['bg-1'], borderColor: c['line'], boxShadow: c[name] };
              return (
                <div key={theme} className="tk-shadow-tile" style={tile}>
                  <span className={glow ? 'tk-glow' : 'tk-shadow-box'} style={sample} />
                  <code style={{ color: c['text-3'] }}>{c[name]}</code>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Every icon Nocturne carries by name, in the text colour. */
export function IconGrid() {
  return (
    <div className="tk-icons not-prose">
      {data.icons.map((icon) => (
        <div key={icon.name} className="tk-icon">
          <span className="tk-icon-glyph" aria-hidden dangerouslySetInnerHTML={{ __html: icon.svg }} />
          <code>{icon.name}</code>
        </div>
      ))}
    </div>
  );
}
