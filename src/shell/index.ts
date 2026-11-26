// The shell: `createShell`, the registry every part of the window is derived from, and `Shell`, which draws it; the
// app shell's frame, the title bar with its scope path, lens box and command palette, the sidebar's header, the panel
// rail and its panels, the trail and switcher every drill uses, resizable borders, the window's history and its
// arrows, the window controls and the appearance settings. Routing, storage and the native window come in through
// adapters and props.

export * from "./AppearanceSettings"
export * from "./AppShell"
export * from "./appearance"
export * from "./CommandPalette"
export {
  type PanelSide,
  type ShellFrameState,
  type ShellSidebarState,
  useShellFrame,
  useShellSidebar,
} from "./context"
export * from "./createShell"
export * from "./HistoryArrows"
export * from "./history"
export * from "./LensSwitch"
export * from "./PanelRail"
export * from "./ResizeHandle"
export * from "./ScopeBox"
export * from "./ScopePath"
export * from "./Shell"
export * from "./ShellPanel"
export * from "./SidebarHeader"
export * from "./Switcher"
export * from "./storage"
export * from "./TitleBar"
export * from "./Trail"
export type { Lens, LensHue, LensPrefs, ShellMark } from "./types"
export * from "./WindowControls"
