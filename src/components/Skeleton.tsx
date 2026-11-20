import type { JSX } from "@solidjs/web"
import { omit } from "solid-js"
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
  const rest = omit(props, "width", "height", "circle", "class", "style")
  return (
    <span
      data-part="skeleton"
      aria-hidden="true"
      class={cx("nc-skeleton", props.circle && "nc-skeleton--circle", props.class)}
      style={{
        width: props.width,
        height: props.height,
        ...(typeof props.style === "object" ? props.style : {}),
      }}
      {...rest}
    />
  )
}
