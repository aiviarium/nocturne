import { Truncate } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Truncation",
  note: "Hover the cut text: its title is the full text.",
}

export default function Truncation() {
  return (
    <div class="ex-col">
      <div style={{ width: "220px" }}>
        <Truncate text="/home/agent/.t3/worktrees/atlas/t3-ec07/src/auth/callback.ts" mono />
      </div>
      <div style={{ width: "220px" }}>
        <Truncate
          lines={2}
          text="Fix the sign-in redirect loop behind a proxy: the callback URL is built from the request, so behind a path-prefixed proxy the prefix is lost."
        />
      </div>
    </div>
  )
}
