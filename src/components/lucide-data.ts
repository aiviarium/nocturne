// Lucide icons (ISC licence, lucide.dev) that the shell and the core plugins use where the 48 Nocturne core icons
// have nothing that fits, in the `lucide` package's own node format. Name them like core icons: `icon="panel-left"`.
// Plugins may also pass any other Lucide icon as a node.
import type { LucideNode } from "./Icon"

const rect = (x: number, y: number, width: number, height: number, rx = 2) =>
  ["rect", { x, y, width, height, rx }] as const
const path = (d: string) => ["path", { d }] as const
const circle = (cx: number, cy: number, r: number) => ["circle", { cx, cy, r }] as const

export const LUCIDE = {
  copy: [rect(8, 8, 14, 14), path("M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2")],
  info: [circle(12, 12, 10), path("M12 16v-4"), path("M12 8h.01")],
  upload: [path("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"), path("m17 8-5-5-5 5"), path("M12 3v12")],
  "triangle-alert": [
    path("m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"),
    path("M12 9v4"),
    path("M12 17h.01"),
  ],
  "refresh-cw": [
    path("M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"),
    path("M21 3v5h-5"),
    path("M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"),
    path("M8 16H3v5"),
  ],
  "arrow-right-left": [path("m16 3 4 4-4 4"), path("M20 7H4"), path("m8 21-4-4 4-4"), path("M4 17h16")],
  "book-open": [
    path("M12 7v14"),
    path(
      "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
    ),
  ],
  "building-2": [
    path("M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"),
    path("M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"),
    path("M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"),
    path("M10 6h4"),
    path("M10 10h4"),
    path("M10 14h4"),
    path("M10 18h4"),
  ],
  "chevron-left": [path("m15 18-6-6 6-6")],
  "circle-dot": [circle(12, 12, 10), circle(12, 12, 1)],
  "columns-2": [rect(3, 3, 18, 18), path("M12 3v18")],
  "eye-off": [
    path("M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"),
    path("M14.084 14.158a3 3 0 0 1-4.242-4.242"),
    path("M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"),
    path("m2 2 20 20"),
  ],
  "git-pull-request": [circle(18, 18, 3), circle(6, 6, 3), path("M13 6h3a2 2 0 0 1 2 2v7"), path("M6 9v12")],
  github: [
    path(
      "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
    ),
    path("M9 18c-4.51 2-5-2-7-2"),
  ],
  "grip-vertical": [
    circle(9, 12, 1),
    circle(9, 5, 1),
    circle(9, 19, 1),
    circle(15, 12, 1),
    circle(15, 5, 1),
    circle(15, 19, 1),
  ],
  handshake: [
    path("m11 17 2 2a1 1 0 1 0 3-3"),
    path(
      "m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4",
    ),
    path("m21 3 1 11h-2"),
    path("M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"),
    path("M3 4h8"),
  ],
  keyboard: [
    rect(2, 4, 20, 16),
    path("M10 8h.01"),
    path("M12 12h.01"),
    path("M14 8h.01"),
    path("M16 12h.01"),
    path("M18 8h.01"),
    path("M6 8h.01"),
    path("M7 16h10"),
    path("M8 12h.01"),
  ],
  minus: [path("M5 12h14")],
  "layout-dashboard": [
    rect(3, 3, 7, 9, 1),
    rect(14, 3, 7, 5, 1),
    rect(14, 12, 7, 9, 1),
    rect(3, 16, 7, 5, 1),
  ],
  monitor: [rect(2, 3, 20, 14), path("M8 21h8"), path("M12 17v4")],
  package: [
    path(
      "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",
    ),
    path("M12 22V12"),
    path("m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"),
    path("m7.5 4.27 9 5.15"),
  ],
  "panel-bottom": [rect(3, 3, 18, 18), path("M3 15h18")],
  "panel-left": [rect(3, 3, 18, 18), path("M9 3v18")],
  "panel-right": [rect(3, 3, 18, 18), path("M15 3v18")],
  "sliders-horizontal": [
    path("M10 5H3"),
    path("M12 19H3"),
    path("M14 3v4"),
    path("M16 17v4"),
    path("M21 12h-9"),
    path("M21 19h-5"),
    path("M21 5h-7"),
    path("M8 10v4"),
    path("M8 12H3"),
  ],
  download: [path("M12 15V3"), path("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"), path("m7 10 5 5 5-5")],
  "rotate-ccw": [path("M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"), path("M3 3v5h5")],
  wrench: [
    path(
      "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
    ),
  ],
  anchor: [
    ["path", { d: "M12 6v16" }],
    ["path", { d: "m19 13 2-1a9 9 0 0 1-18 0l2 1" }],
    ["path", { d: "M9 11h6" }],
    ["circle", { cx: "12", cy: "4", r: "2" }],
  ],
  bot: [
    ["path", { d: "M12 8V4H8" }],
    ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2" }],
    ["path", { d: "M2 14h2" }],
    ["path", { d: "M20 14h2" }],
    ["path", { d: "M15 13v2" }],
    ["path", { d: "M9 13v2" }],
  ],
  "calendar-clock": [
    ["path", { d: "M16 14v2.2l1.6 1" }],
    ["path", { d: "M16 2v3" }],
    ["path", { d: "M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338" }],
    ["path", { d: "M3 9h5.859" }],
    ["path", { d: "M8 2v3" }],
    ["circle", { cx: "16", cy: "16", r: "6" }],
  ],
  cpu: [
    ["path", { d: "M12 20v2" }],
    ["path", { d: "M12 2v2" }],
    ["path", { d: "M17 20v2" }],
    ["path", { d: "M17 2v2" }],
    ["path", { d: "M2 12h2" }],
    ["path", { d: "M2 17h2" }],
    ["path", { d: "M2 7h2" }],
    ["path", { d: "M20 12h2" }],
    ["path", { d: "M20 17h2" }],
    ["path", { d: "M20 7h2" }],
    ["path", { d: "M7 20v2" }],
    ["path", { d: "M7 2v2" }],
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }],
    ["rect", { x: "8", y: "8", width: "8", height: "8", rx: "1" }],
  ],
  "hard-drive": [
    ["path", { d: "M10 16h.01" }],
    [
      "path",
      {
        d: "M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
      },
    ],
    ["path", { d: "M21.946 12.013H2.054" }],
    ["path", { d: "M6 16h.01" }],
  ],
  "key-round": [
    [
      "path",
      {
        d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      },
    ],
    ["circle", { cx: "16.5", cy: "7.5", r: ".5" }],
  ],
  "list-checks": [
    ["path", { d: "M13 5h8" }],
    ["path", { d: "M13 12h8" }],
    ["path", { d: "M13 19h8" }],
    ["path", { d: "m3 17 2 2 4-4" }],
    ["path", { d: "m3 7 2 2 4-4" }],
  ],
  logs: [
    ["path", { d: "M3 5h1" }],
    ["path", { d: "M3 12h1" }],
    ["path", { d: "M3 19h1" }],
    ["path", { d: "M8 5h1" }],
    ["path", { d: "M8 12h1" }],
    ["path", { d: "M8 19h1" }],
    ["path", { d: "M13 5h8" }],
    ["path", { d: "M13 12h8" }],
    ["path", { d: "M13 19h8" }],
  ],
  plug: [
    ["path", { d: "M12 22v-5" }],
    ["path", { d: "M15 8V2" }],
    ["path", { d: "M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z" }],
    ["path", { d: "M9 8V2" }],
  ],
  puzzle: [
    [
      "path",
      {
        d: "M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z",
      },
    ],
  ],
  "scroll-text": [
    ["path", { d: "M15 12h-5" }],
    ["path", { d: "M15 8h-5" }],
    ["path", { d: "M19 17V5a2 2 0 0 0-2-2H4" }],
    [
      "path",
      {
        d: "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",
      },
    ],
  ],
  shield: [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      },
    ],
  ],
  "user-round": [
    ["circle", { cx: "12", cy: "8", r: "5" }],
    ["path", { d: "M20 21a8 8 0 0 0-16 0" }],
  ],
  webhook: [
    ["path", { d: "M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" }],
    ["path", { d: "m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" }],
    ["path", { d: "m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" }],
  ],
} satisfies Record<string, LucideNode>

export type LucideName = keyof typeof LUCIDE
