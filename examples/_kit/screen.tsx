import { NavigationScreen } from "@aiviarium/nocturne"
import type { JSX } from "solid-js"
import type { ExampleMeta } from "./types"

/** A short screen title for an example shown on a phone: its part's name ("text-field/states" is "Text field"). */
export function screenTitle(id: string): string {
  const part = (id.split("/")[0] ?? id).replaceAll("-", " ")
  return part.charAt(0).toUpperCase() + part.slice(1)
}

/**
 * Whether a phone example is shown as the content of a screen. Every phone example is, unless its meta says it
 * draws a whole screen of its own (`screen: true`): then nothing is put around it. A part that is not a phone
 * screen (no `phone` in its meta) is wrapped whenever it is shown on a phone, which is what the site's device
 * frames do.
 */
export function needsScreen(meta: ExampleMeta, onPhone: boolean): boolean {
  return Boolean(meta.phone || onPhone) && !meta.screen
}

/**
 * A part shown as the content of a phone screen, as an app shows a view: under a navigation bar titled with
 * the part's name (which takes the status bar and the Dynamic Island), with the screen's gutter around it and
 * its scroller taking the home indicator and the sides. The examples shown on a phone never stand on the bare
 * device, where their first line would sit under the status bar.
 */
export function ExampleScreen(props: { id: string; children: JSX.Element }): JSX.Element {
  return (
    <NavigationScreen title={screenTitle(props.id)}>
      <div class="ex-screen-body">{props.children}</div>
    </NavigationScreen>
  )
}
