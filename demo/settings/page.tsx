// The frame of a settings page: the view header with the page's actions, then its sections in one centred column.
import { ShellViewHeader, type ViewAction, ViewLayout } from "@aiviarium/nocturne"
import type { JSX } from "@solidjs/web"

export function SettingsPage(props: {
  id: string
  actions?: ViewAction[]
  middle?: JSX.Element
  scroll?: boolean
  children: JSX.Element
}) {
  return (
    <ViewLayout
      id={`demo.settings.${props.id}`}
      scroll={props.scroll}
      // Settings are a centred column: a form reads well at a width, and the page doesn't hang off the left edge.
      reading={808}
      header={
        <ShellViewHeader noPin actions={props.actions}>
          {props.middle}
        </ShellViewHeader>
      }
    >
      <div class="dm-settings">{props.children}</div>
    </ViewLayout>
  )
}
