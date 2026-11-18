import { Avatar, Badge, BoardCard } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The card's slot",
  note: "One height for every card: the top row, a title of at most two lines, and the meta row on the bottom edge, so a short title leaves its space above the meta, not under it.",
  surface: "well",
}

export default function Cards() {
  return (
    <div class="ex-board-cards">
      <BoardCard
        top={
          <>
            <span class="nc-meta mono">WEB-139</span>
            <Avatar size="sm" name="Sarah Chen" />
          </>
        }
        title="Sign-in loops behind a path-prefixed proxy when the cookie path is the proxy's own prefix"
        meta={
          <>
            <Badge tone="danger">Bug</Badge>
            <Badge tone="info">Auth</Badge>
          </>
        }
      />
      <BoardCard
        top={<span class="nc-meta mono">WEB-137</span>}
        title="Contrast of muted labels"
        meta={<Badge>Design</Badge>}
      />
      <BoardCard selected top={<span class="nc-meta mono">WEB-130</span>} title="Selected" />
    </div>
  )
}
