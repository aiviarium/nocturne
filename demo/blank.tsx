// A place whose view is still to come. The areas replace it with their own views.
import { EmptyState, ShellViewHeader, type ShellViewProps, ViewLayout } from "@aiviarium/nocturne"

export function Blank(props: ShellViewProps) {
  return (
    <ViewLayout id="demo.blank" header={<ShellViewHeader />}>
      <EmptyState title={`${props.shell.loc().place?.label ?? "This place"} is empty`} />
    </ViewLayout>
  )
}
