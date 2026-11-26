import { CommandPalette, ScopeBox } from "@aiviarium/nocturne"
import { createSignal } from "solid-js"
import { LENSES, projectActions, projectSearch } from "../_kit/shell"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The command palette",
  note: "Opened from the box and laid over it: the scope's chips, then the field. Typing searches the scope; “:” lists its lenses, “>” its actions. ↑/↓ move, Enter runs, Esc clears and then closes, and Backspace in an empty field drops the last chip to search wider.",
  surface: "well",
}

export default function CommandPaletteBox() {
  const [open, setOpen] = createSignal(false)
  const [lens, setLens] = createSignal("build")
  const [last, setLast] = createSignal("Nothing run yet")
  const [box, setBox] = createSignal<HTMLElement>()
  const on = () => LENSES.find((l) => l.id === lens())!
  return (
    <div class="ex-col">
      <div class="ex-row">
        <ScopeBox
          ref={setBox}
          scope="Atlas web"
          lenses={LENSES}
          lens={lens()}
          onLensChange={setLens}
          onSearch={() => setOpen(true)}
          keys={false}
        />
      </div>
      <span class="nc-meta">{last()}</span>
      <CommandPalette
        open={open()}
        onClose={() => setOpen(false)}
        anchor={box()}
        chips={[
          { id: "atlas", label: "Atlas web", mark: { name: "Atlas web", hue: "sky" } },
          { id: `lens:${on().id}`, label: on().label, icon: on().icon, hue: on().hue },
        ]}
        search={projectSearch("atlas", lens(), (what) => setLast(`Opened ${what}`))}
        lenses={LENSES.map((l, i) => ({
          id: l.id,
          label: l.label,
          hint: l.id === lens() ? "On" : l.purpose,
          icon: l.icon,
          hue: l.hue,
          shortcut: `⌘ ${i + 1}`,
          run: () => setLens(l.id),
        }))}
        actions={projectActions((what) => setLast(`Ran ${what}`))}
        workspace="Acme"
      />
    </div>
  )
}
