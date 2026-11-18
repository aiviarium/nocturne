// Images for the media examples, drawn as inline SVG data URLs so the examples load nothing from the network.
// An image file has no access to the page's tokens, so the colours here are literals.

const url = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** A landscape of soft bands in one hue, `width` by `height`. */
export function picture(width: number, height: number, hue: number): string {
  const band = (i: number) => {
    const y = Math.round(height * (0.35 + i * 0.16))
    const l = 30 + i * 9
    return `<path d="M0 ${y} Q ${width * 0.3} ${y - height * 0.12} ${width * 0.6} ${y} T ${width} ${y} V ${height} H 0 Z" fill="hsl(${hue} 45% ${l}%)"/>` // lint-tokens-ignore
  }
  return url(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<rect width="100%" height="100%" fill="hsl(${hue} 40% 18%)"/>` + // lint-tokens-ignore
      `<circle cx="${width * 0.72}" cy="${height * 0.28}" r="${Math.min(width, height) * 0.1}" fill="hsl(${hue} 70% 78%)"/>` + // lint-tokens-ignore
      [0, 1, 2, 3].map(band).join("") +
      "</svg>",
  )
}

/** A browser screenshot: a window bar, a sidebar and rows of content. */
export function screenshot(width = 1280, height = 800): string {
  const rows = Array.from({ length: 7 }, (_, i) => {
    const y = 120 + i * 70
    return (
      `<rect x="300" y="${y}" width="${560 + ((i * 97) % 300)}" height="14" rx="7" fill="#3a3a3a"/>` + // lint-tokens-ignore
      `<rect x="300" y="${y + 26}" width="${360 + ((i * 53) % 200)}" height="10" rx="5" fill="#2c2c2c"/>` // lint-tokens-ignore
    )
  }).join("")
  return url(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1280 800">` +
      `<rect width="1280" height="800" fill="#161616"/>` + // lint-tokens-ignore
      `<rect width="1280" height="48" fill="#222"/>` + // lint-tokens-ignore
      `<circle cx="24" cy="24" r="6" fill="#555"/><circle cx="44" cy="24" r="6" fill="#555"/><circle cx="64" cy="24" r="6" fill="#555"/>` + // lint-tokens-ignore
      `<rect x="320" y="12" width="640" height="24" rx="12" fill="#2e2e2e"/>` + // lint-tokens-ignore
      `<rect y="48" width="260" height="752" fill="#1c1c1c"/>` + // lint-tokens-ignore
      Array.from(
        { length: 8 },
        (_, i) =>
          `<rect x="24" y="${80 + i * 40}" width="${140 + ((i * 41) % 70)}" height="12" rx="6" fill="#333"/>`, // lint-tokens-ignore
      ).join("") +
      `<rect x="300" y="72" width="320" height="20" rx="10" fill="#d97757"/>` + // lint-tokens-ignore
      rows +
      "</svg>",
  )
}

/** A short voice-like tone as a WAV object URL, made in the page, `seconds` long. */
export function tone(seconds = 4): string {
  const rate = 8000
  const n = Math.round(rate * seconds)
  const bytes = new Uint8Array(44 + n)
  const view = new DataView(bytes.buffer)
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i)
  }
  text(0, "RIFF")
  view.setUint32(4, 36 + n, true)
  text(8, "WAVEfmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  text(36, "data")
  view.setUint32(40, n, true)
  for (let i = 0; i < n; i++) {
    const t = i / rate
    const envelope = Math.max(0, Math.sin(Math.PI * 2.2 * t)) ** 2
    bytes[44 + i] = 128 + Math.round(40 * envelope * Math.sin(2 * Math.PI * 220 * t))
  }
  return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }))
}
