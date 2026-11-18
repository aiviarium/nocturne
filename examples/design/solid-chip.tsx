import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Saturated pills",
  note: "Full-strength fills with white text: each label is louder than the title it belongs to.",
}

export default function SolidChip() {
  return (
    <div class="nc-row">
      <span class="ex-solid-chip" style={{ "--hue": "var(--danger)" }}>
        Bug
      </span>
      <span class="ex-solid-chip" style={{ "--hue": "var(--label-orchid)" }}>
        Design
      </span>
      <span class="ex-solid-chip" style={{ "--hue": "var(--accent)" }}>
        AI
      </span>
      <span class="ex-solid-chip" style={{ "--hue": "var(--text-3)" }}>
        Draft
      </span>
      <span class="ex-solid-chip" style={{ "--hue": "var(--label-sky)" }}>
        Sarah Chen
      </span>
    </div>
  )
}
