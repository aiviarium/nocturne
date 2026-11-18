import { type JSX, splitProps } from "solid-js"
import { cx } from "../lib/cx"

export interface SkeletonProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** CSS width, such as `60%` or `96px`. Default 100%. */
  width?: string
  /** CSS height. Default one text line. */
  height?: string
  /** A circle, for avatars. */
  circle?: boolean
}

/** A placeholder block for content that is loading. The shimmer stops under `prefers-reduced-motion`. */
export function Skeleton(props: SkeletonProps): JSX.Element {
  const [local, rest] = splitProps(props, ["width", "height", "circle", "class", "style"])
  return (
    <span
      data-part="skeleton"
      aria-hidden="true"
      class={cx("nc-skeleton", local.circle && "nc-skeleton--circle", local.class)}
      style={{
        width: local.width,
        height: local.height,
        ...(typeof local.style === "object" ? local.style : {}),
      }}
      {...rest}
    />
  )
}
