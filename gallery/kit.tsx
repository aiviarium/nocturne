import { PhoneOverride } from "@aiviarium/nocturne"
import { For, type JSX } from "solid-js"
import { ExampleScreen, needsScreen } from "../examples/_kit/screen"
import { EXAMPLES } from "../examples/registry"
import { DeviceChrome } from "./device"

/** One example of examples/ as a titled section, on the surface its meta asks for. */
export function ExampleSection(props: { id: string }): JSX.Element {
  const example = EXAMPLES[props.id]
  if (!example) return <p class="nc-meta">No example {props.id}.</p>
  const { meta } = example
  const Example = example.default
  const body = () => {
    if (meta.phone)
      return (
        <Phone label={meta.title}>
          {needsScreen(meta, true) ? (
            <ExampleScreen id={props.id}>
              <Example />
            </ExampleScreen>
          ) : (
            <Example />
          )}
        </Phone>
      )
    if (meta.surface === "none") return <Example />
    return (
      <div class={meta.surface === "well" ? "g-well" : "g-card"}>
        <Example />
      </div>
    )
  }
  return (
    <section class="g-section ex-host" data-example={props.id}>
      <h2 class="g-section__title label">{meta.title}</h2>
      {meta.note ? <p class="g-section__note nc-meta">{meta.note}</p> : null}
      {body()}
    </section>
  )
}

/** A row of examples side by side, or one example. */
export function Sections(props: { sections: Array<string | string[]> }): JSX.Element {
  return (
    <For each={props.sections}>
      {(entry) =>
        Array.isArray(entry) ? (
          <div class={`g-grid g-grid--${entry.length}`}>
            <For each={entry}>{(id) => <ExampleSection id={id} />}</For>
          </div>
        ) : (
          <ExampleSection id={entry} />
        )
      }
    </For>
  )
}

/** A phone-sized frame: the pieces inside behave as on a phone. */
export function Phone(props: { children: JSX.Element; label: string }): JSX.Element {
  return (
    <PhoneOverride.Provider value={true}>
      <div class="g-phone" role="group" aria-label={props.label} data-part="gallery-phone">
        {props.children}
        <DeviceChrome />
      </div>
    </PhoneOverride.Provider>
  )
}
