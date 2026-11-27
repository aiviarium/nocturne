// The frame of a settings page: the view header with the page's actions, then its sections in one column.
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
