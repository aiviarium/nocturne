import type { JSX } from "@solidjs/web"
import { For, omit } from "solid-js"
import { cx } from "../lib/cx"
import { ICON_NODES, type IconName } from "./icon-data"

export type { IconName }

/**
 * Every icon by name, each a Lucide icon in the `lucide` package's own format. A name is a key here, so
 * `name in ICON_PATHS` says whether the components know it.
 */
export const ICON_PATHS: Readonly<Record<IconName, LucideNode>> = ICON_NODES

/**
 * A Lucide icon in the `lucide` package's own format: a list of `[tag, attributes]` pairs.
 * Import one (`import { Camera } from "lucide"`) and pass it as `node`.
 */
export type LucideNode = ReadonlyArray<
  readonly [tag: string, attrs: Readonly<Record<string, string | number | undefined>>]
>

export interface IconProps extends Omit<JSX.SvgSVGAttributes<SVGSVGElement>, "children" | "name"> {
  /** One of the icons Nocturne carries, by name. */
  name?: IconName
  /** Any other Lucide icon. Used when `name` is not set. */
  node?: LucideNode
  /** 13px inside chips, menus and cells, 16px in buttons and navigation (default), 20px in empty states. */
  size?: "sm" | "md" | "lg"
  /** Accessible name. Without it the icon is decorative and hidden from assistive technology. */
  label?: string
  /**
   * A status colour for an icon that carries one (an issue's state: blocked, in review). `quiet` is text-3.
   * Without it the icon takes the surrounding text colour.
   */
  tone?: IconTone
}

export type IconTone = "success" | "warning" | "danger" | "info" | "quiet"

/** A Lucide line icon drawn with `stroke: currentColor`, so it takes the surrounding text colour. */
export function Icon(props: IconProps): JSX.Element {
  const rest = omit(props, "name", "node", "size", "label", "tone", "class")
  const node = () => (props.name ? ICON_NODES[props.name] : undefined) ?? props.node ?? []
  const a11y = () =>
    props.label ? { role: "img" as const, "aria-label": props.label } : { "aria-hidden": "true" as const }
  return (
    <svg
      data-part="icon"
      data-icon={props.name}
      data-tone={props.tone}
      viewBox="0 0 24 24"
      class={cx(
        "nc-icon",
        props.size === "sm" && "nc-icon--sm",
        props.size === "lg" && "nc-icon--lg",
        props.class,
      )}
      {...a11y()}
      {...rest}
    >
      <For each={node()}>{([tag, attrs]) => <IconShape tag={tag} attrs={attrs} />}</For>
    </svg>
  )
}

/** iconElement draws an icon outside Solid, such as in an editor's DOM. */
export function iconElement(name: IconName, doc: Document = document, className = "nc-icon"): SVGSVGElement {
  const svg = doc.createElementNS(SVG, "svg")
  svg.setAttribute("class", className)
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  for (const [tag, attrs] of ICON_NODES[name]) svg.append(shape(tag, attrs, doc))
  return svg
}

const SVG = "http://www.w3.org/2000/svg"

function shape(
  tag: string,
  attrs: Readonly<Record<string, string | number | undefined>>,
  doc: Document,
): Element {
  const el = doc.createElementNS(SVG, tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && key !== "key") el.setAttribute(key, String(value))
  }
  return el
}

function IconShape(props: {
  tag: string
  attrs: Readonly<Record<string, string | number | undefined>>
}): JSX.Element {
  return shape(props.tag, props.attrs, document) as unknown as JSX.Element
}

/** The filled stop square used by the composer's Stop button. */
export function StopGlyph(props: { class?: string }): JSX.Element {
  return (
    <svg data-part="icon" class={cx("nc-glyph", props.class)} viewBox="0 0 12 12" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
    </svg>
  )
}
