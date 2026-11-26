// The shell's parts: the title bar with its scope path, lens box and command palette, the trail and switcher every
// drill uses, resizable borders, the window's history and its arrows, the window controls and the appearance
// settings. Routing, storage and the native window come in through adapters and props.
export * from "./AppearanceSettings"
export * from "./appearance"
export * from "./CommandPalette"
export * from "./HistoryArrows"
export * from "./history"
export * from "./LensSwitch"
export * from "./ResizeHandle"
export * from "./ScopeBox"
export * from "./ScopePath"
export * from "./Switcher"
export * from "./storage"
export * from "./TitleBar"
export * from "./Trail"
export type { Lens, LensHue, LensPrefs, ShellMark } from "./types"
export * from "./WindowControls"
