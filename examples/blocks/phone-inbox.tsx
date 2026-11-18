import {
  ApprovalCard,
  Avatar,
  InsetGroup,
  InsetList,
  InsetRow,
  NavigationScreen,
  NavigationStack,
  TabBar,
} from "@aiviarium/nocturne"
import { createSignal, For, Show } from "solid-js"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "The inbox on a phone, answering an approval",
  note: "Tap the approval: it pushes a screen whose bar names the session; Allow answers it and the stack pops back. Swipe a row to archive it.",
  phone: true,
  screen: true,
  height: 780,
}

interface Item {
  id: string
  who: string
  text: string
  kind: string
  when: string
  approval?: boolean
}

const TODAY: Item[] = [
  {
    id: "1",
    who: "Coding agent",
    text: "Edit 2 files in src/auth",
    kind: "Approval · Fix the sign-in redirect loop",
    when: "2m",
    approval: true,
  },
  { id: "2", who: "Bo", text: "Bo mentioned you in Launch plan", kind: "Mention", when: "18m" },
  { id: "3", who: "Ann", text: "Ann assigned you WEB-141", kind: "Assignment", when: "1h" },
]
const EARLIER: Item[] = [
  { id: "4", who: "Jobs", text: "Nightly backup failed", kind: "Job · build-01", when: "Yesterday" },
]

export default function PhoneInbox() {
  const [stack, setStack] = createSignal<Item[]>([])
  const [items, setItems] = createSignal([...TODAY, ...EARLIER])
  const [answered, setAnswered] = createSignal<string[]>([])
  const back = () => setStack((s) => s.slice(0, -1))
  const open = (item: Item) => setStack([item])
  const row = (item: Item) => (
    <InsetRow
      label={item.text}
      detail={item.kind}
      value={item.when}
      leading={
        <Avatar
          kind={item.approval ? "agent" : "person"}
          name={item.who}
          size="sm"
          hue={item.approval ? "amber" : undefined}
        />
      }
      onClick={() => open(item)}
      trailingActions={[
        {
          id: "archive",
          label: "Archive",
          icon: "archive",
          tone: "accent",
          onAction: () => setItems(items().filter((x) => x.id !== item.id)),
        },
      ]}
    />
  )
  const pending = () => items().filter((i) => i.approval && !answered().includes(i.id)).length
  return (
    <div class="ex-phone-app">
      <NavigationStack items={[null, ...stack()]} getKey={(s) => s?.id ?? "root"} onBack={back} label="Inbox">
        {(screen, i) => (
          <Show
            when={screen()}
            fallback={
              <NavigationScreen
                title="Inbox"
                largeTitle
                level="index"
                actions={[{ id: "read", label: "Mark all as read", icon: "check", onClick: () => {} }]}
              >
                <InsetList>
                  <InsetGroup title="Today">
                    <For each={items().filter((x) => TODAY.some((t) => t.id === x.id))}>{row}</For>
                  </InsetGroup>
                  <Show when={items().some((x) => EARLIER.some((t) => t.id === x.id))}>
                    <InsetGroup title="Earlier">
                      <For each={items().filter((x) => EARLIER.some((t) => t.id === x.id))}>{row}</For>
                    </InsetGroup>
                  </Show>
                </InsetList>
              </NavigationScreen>
            }
          >
            {(item) => (
              <NavigationScreen
                title={item().approval ? "Fix the sign-in redirect loop" : item().kind}
                level="main"
                back={{ label: "Inbox", onClick: back }}
                actions={[{ id: "archive", label: "Archive", icon: "archive", onClick: back }]}
              >
                <div class="ex-phone-body ex-col">
                  <Show when={item().approval} fallback={<p>{item().text}</p>}>
                    <span class="nc-meta">Coding agent · local · {i() > 0 ? "2m ago" : ""}</span>
                    <ApprovalCard
                      summary="Edit 2 files"
                      items={["src/auth/callback.ts", "src/auth/callback.test.ts"]}
                      decision={answered().includes(item().id) ? "allowed" : "pending"}
                      onAllow={() => {
                        setAnswered([...answered(), item().id])
                        setTimeout(back, 600)
                      }}
                      onDeny={back}
                    />
                  </Show>
                </div>
              </NavigationScreen>
            )}
          </Show>
        )}
      </NavigationStack>
      <TabBar
        active="inbox"
        onSelect={() => {}}
        onReselect={() => setStack([])}
        items={[
          { id: "home", label: "Home", icon: "home" },
          { id: "inbox", label: "Inbox", icon: "inbox", badge: pending() || undefined },
          { id: "agents", label: "Agents", icon: "agent" },
          { id: "search", label: "Search", icon: "search" },
          { id: "more", label: "More", icon: "more" },
        ]}
      />
    </div>
  )
}
