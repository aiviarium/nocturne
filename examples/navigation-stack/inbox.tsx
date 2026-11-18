import {
  Avatar,
  InsetGroup,
  InsetList,
  InsetRow,
  NavigationScreen,
  NavigationStack,
  TabBar,
} from "@aiviarium/nocturne"
import { createSignal, For } from "solid-js"
import { MAIL } from "../_kit/data"
import type { ExampleMeta } from "../_kit/types"

export const meta: ExampleMeta = {
  title: "Stack, bar and tab bar",
  note: "Tap a row to push; the back control or a swipe from the left edge pops. Swipe a row left to archive, right to mark it read; long-press for its menu.",
  phone: true,
  screen: true,
  height: 760,
}

export default function PhoneInbox() {
  type S = { id: string; title: string }
  const [tab, setTab] = createSignal("inbox")
  const [stack, setStack] = createSignal<S[]>([{ id: "root", title: "Inbox" }])
  const push = (title: string) => setStack((s) => [...s, { id: `${s.length}-${title}`, title }])
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  const [items, setItems] = createSignal(MAIL)
  return (
    <div class="ex-phone-app">
      <NavigationStack items={stack()} getKey={(s) => s.id} onBack={back} label="Inbox">
        {(s, i) => (
          <NavigationScreen
            title={s().title}
            largeTitle={i() === 0}
            level={i() === 0 ? "index" : "main"}
            back={i() > 0 ? { label: stack()[i() - 1]!.title, onClick: back } : undefined}
            actions={
              i() === 0
                ? [{ id: "read", label: "Mark all as read", icon: "check", onClick: () => {} }]
                : [
                    { id: "open", label: "Open", icon: "arrow-up-right", onClick: () => {} },
                    { id: "archive", label: "Archive", icon: "archive", onClick: back },
                    { id: "unread", label: "Mark as unread", onClick: () => {} },
                  ]
            }
          >
            {i() === 0 ? (
              <InsetList>
                <InsetGroup label="Notifications">
                  <For each={items()}>
                    {(m) => (
                      <InsetRow
                        data-row={m.id}
                        label={m.text}
                        detail={m.kind}
                        value="2m"
                        leading={<Avatar name={m.who} size="sm" />}
                        onClick={() => push(m.kind)}
                        trailingActions={[
                          {
                            id: "archive",
                            label: "Archive",
                            icon: "archive",
                            tone: "accent",
                            onAction: () => setItems(items().filter((x) => x.id !== m.id)),
                          },
                        ]}
                        leadingActions={[{ id: "read", label: "Read", icon: "eye", onAction: () => {} }]}
                        menu={[
                          { id: "open", label: "Open", icon: "arrow-up-right" },
                          { id: "archive", label: "Archive", icon: "archive" },
                        ]}
                      />
                    )}
                  </For>
                </InsetGroup>
              </InsetList>
            ) : (
              <p class="ex-phone-body">The item, pushed. Swipe from the left edge or use the back control.</p>
            )}
          </NavigationScreen>
        )}
      </NavigationStack>
      <TabBar
        active={tab()}
        onSelect={setTab}
        onReselect={() => setStack((s) => s.slice(0, 1))}
        items={[
          { id: "home", label: "Home", icon: "home" },
          { id: "inbox", label: "Inbox", icon: "inbox", badge: items().length },
          { id: "agents", label: "Agents", icon: "agent" },
          { id: "search", label: "Search", icon: "search" },
          { id: "more", label: "More", icon: "more" },
        ]}
      />
    </div>
  )
}
