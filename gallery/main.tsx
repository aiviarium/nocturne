import { render } from "solid-js/web"
import "@aiviarium/nocturne/styles/index.css"
import "./gallery.css"
import { App, frameId, mountFrame } from "./App"

const root = document.getElementById("root") as HTMLElement
const frame = frameId()
if (frame) mountFrame(frame, root)
else render(() => <App />, root)
