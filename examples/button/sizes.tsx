import { Button, type ButtonVariant } from "@aiviarium/nocturne"
import { For } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Sizes",
  note: "Small 24 for toolbars and table bars, default 28 for forms, large 32 for empty states.",
}

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "accent", "danger"]

export default function ButtonSizes() {
  return (
    <div class="nc-row">
      <Button size="sm">Small 24</Button>
      <Button>Default 28</Button>
      <Button size="lg">Large 32</Button>
      <For each={VARIANTS}>
        {(v) => (
          <Button variant={v} size="sm">
            {v}
          </Button>
        )}
      </For>
    </div>
  )
}
