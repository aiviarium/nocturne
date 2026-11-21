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
  /**
   * Show at once. By default a skeleton fades in only after 400ms, so a load that finishes sooner never flashes
   * placeholders; pass this where the wait is known to be long.
   */
  immediate?: boolean
}

/**
 * A placeholder block for content that is loading. It fades in after 400ms, so fast loads show no placeholders at
 * all. The shimmer stops under `prefers-reduced-motion`.
 */
export function Skeleton(props: SkeletonProps): JSX.Element {
  const rest = omit(props, "width", "height", "circle", "immediate", "class", "style")
  return (
    <span
      data-part="skeleton"
      aria-hidden="true"
      data-immediate={props.immediate ? "" : undefined}
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
