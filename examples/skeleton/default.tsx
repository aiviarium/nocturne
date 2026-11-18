import { Skeleton } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = { title: "Skeleton" }

export default function Skeletons() {
  return (
    <div class="ex-col">
      <div class="nc-row">
        <Skeleton circle width="32px" height="32px" />
        <div class="nc-stack ex-grow">
          <Skeleton width="40%" />
          <Skeleton width="80%" />
        </div>
      </div>
      <Skeleton height="64px" />
    </div>
  )
}
