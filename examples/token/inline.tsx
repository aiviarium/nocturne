import { Token } from "@aiviarium/nocturne"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Token chips in text",
  note: "The mention chip's treatment: a slight tint with a stronger foreground of the same hue.",
}

export default function InlineTokens() {
  return (
    <div class="ex-tokens">
      <Token kind="cmd">/review</Token> the changes in{" "}
      <Token kind="ref" icon="file">
        useTasks.ts
      </Token>{" "}
      with{" "}
      <Token kind="person" name="Sarah Chen">
        Sarah Chen
      </Token>
      , then <Token kind="skill">$release-notes</Token>
    </div>
  )
}
