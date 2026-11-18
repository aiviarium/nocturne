import { For, type JSX, Show, splitProps } from "solid-js"
import { cx } from "../lib/cx"
import { ICON_PATHS as CORE_PATHS, type IconName as CoreIconName } from "./icon-data"
import { LUCIDE, type LucideName } from "./lucide-data"

/** A Nocturne core icon, or one of the Lucide icons `@aiviarium/nocturne` carries for what the core set lacks. */
export type IconName = CoreIconName | LucideName

/** Every icon name the components know: path data for the core icons, nodes for the Lucide extras. */
export const ICON_PATHS: Readonly<Record<IconName, string | LucideNode>> = { ...CORE_PATHS, ...LUCIDE }
export { LUCIDE }

/**
 * A Lucide icon in the `lucide` package's own format: a list of `[tag, attributes]` pairs.
 * Import one (`import { Camera } from "lucide"`) and pass it as `node`.
 */
export type LucideNode = ReadonlyArray<
  readonly [tag: string, attrs: Record<string, string | number | undefined>]
>

export interface IconProps extends Omit<JSX.SvgSVGAttributes<SVGSVGElement>, "children" | "name"> {
  /** One of the 48 Nocturne core icons. */
  name?: IconName
  /** Any Lucide icon, the fallback set for what the core icons lack. Used when `name` is not set. */
  node?: LucideNode
  /** 13px inside chips, menus and cells, 16px in buttons and navigation (default), 20px in empty states. */
  size?: "sm" | "md" | "lg"
  /** Accessible name. Without it the icon is decorative and hidden from assistive technology. */
  label?: string
}

/** A line icon drawn with `stroke: currentColor`, so it takes the surrounding text colour. */
export function Icon(props: IconProps): JSX.Element {
  const [local, rest] = splitProps(props, ["name", "node", "size", "label", "class"])
  const core = () => (local.name && local.name in CORE_PATHS ? (local.name as CoreIconName) : undefined)
  const node = () =>
    core() ? undefined : ((local.name ? LUCIDE[local.name as LucideName] : undefined) ?? local.node)
  const a11y = () =>
    local.label ? { role: "img" as const, "aria-label": local.label } : { "aria-hidden": true as const }
  return (
    <svg
      data-part="icon"
      data-icon={local.name}
      viewBox={core() || !node() ? "0 0 16 16" : "0 0 24 24"}
      class={cx(
        "nc-icon",
        !core() && node() && "nc-icon--lucide",
        local.size === "sm" && "nc-icon--sm",
        local.size === "lg" && "nc-icon--lg",
        local.class,
      )}
      {...a11y()}
      {...rest}
    >
      <Show
        when={core()}
        fallback={<For each={node() ?? []}>{([tag, attrs]) => <LucideShape tag={tag} attrs={attrs} />}</For>}
      >
        <path d={CORE_PATHS[core()!]} />
      </Show>
    </svg>
  )
}

function LucideShape(props: {
  tag: string
  attrs: Record<string, string | number | undefined>
}): JSX.Element {
  const el = document.createElementNS("http://www.w3.org/2000/svg", props.tag)
  for (const [key, value] of Object.entries(props.attrs)) {
    if (value !== undefined && key !== "key") el.setAttribute(key, String(value))
  }
  return el as unknown as JSX.Element
}

/** The filled stop square used by the composer's Stop button. */
export function StopGlyph(props: { class?: string }): JSX.Element {
  return (
    <svg data-part="icon" class={cx("nc-glyph", props.class)} viewBox="0 0 12 12" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
    </svg>
  )
}
