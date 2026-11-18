import {
  BottomArea,
  InsetGroup,
  InsetList,
  InsetRow,
  NavigationBar,
  PullToRefresh,
} from "@aiviarium/nocturne"
import { For } from "solid-js"
import { MAIL } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Pull to refresh and the bottom area",
  note: "Pull the list down; the bottom area rides above the on-screen keyboard.",
  phone: true,
  screen: true,
  height: 600,
}

export default function PullList() {
  return (
    <div class="ex-phone-app">
      <NavigationBar title="Mail" />
      <PullToRefresh onRefresh={() => new Promise((r) => setTimeout(r, 800))} class="ex-phone-fill">
        <InsetList>
          <InsetGroup>
            <For each={MAIL}>{(m) => <InsetRow label={m.text} detail={m.kind} />}</For>
          </InsetGroup>
        </InsetList>
      </PullToRefresh>
      <BottomArea class="ex-phone-bottom">
        <p class="ex-phone-bottom__content nc-meta">A composer sits here.</p>
      </BottomArea>
    </div>
  )
}
