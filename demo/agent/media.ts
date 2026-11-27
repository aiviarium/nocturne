// Pictures for the agent's replies, drawn as inline SVG data URLs so nothing loads from the network. An image file
// has no access to the page's tokens, so the colours here are literals.

const url = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** A chart of runs per hour, bars in one hue. */
export function chart(width: number, height: number, hue: number, bars: number[]): string {
  const w = width / bars.length
  const max = Math.max(...bars)
  const body = bars
    .map((b, i) => {
      const h = Math.round((b / max) * (height - 60))
      return `<rect x="${Math.round(i * w + w * 0.2)}" y="${height - 30 - h}" width="${Math.round(w * 0.6)}" height="${h}" rx="3" fill="hsl(${hue} 55% 60%)"/>` // lint-tokens-ignore
    })
    .join("")
  return url(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<rect width="100%" height="100%" fill="hsl(${hue} 12% 14%)"/>` + // lint-tokens-ignore
      `<rect x="0" y="${height - 30}" width="${width}" height="1" fill="hsl(${hue} 10% 35%)"/>` + // lint-tokens-ignore
      body +
      "</svg>",
  )
}

/** A browser screenshot: a window bar, a sidebar and rows of content, with one row marked. */
export function screenshot(width = 1280, height = 800, mark = 3): string {
  const rows = Array.from({ length: 7 }, (_, i) => {
    const y = 120 + i * 70
    const fill = i === mark ? "#6b3b2e" : "#3a3a3a" // lint-tokens-ignore
    return (
      `<rect x="300" y="${y}" width="${560 + ((i * 97) % 300)}" height="14" rx="7" fill="${fill}"/>` +
      `<rect x="300" y="${y + 26}" width="${360 + ((i * 53) % 200)}" height="10" rx="5" fill="#2c2c2c"/>` // lint-tokens-ignore
    )
  }).join("")
  return url(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1280 800">` +
      `<rect width="1280" height="800" fill="#161616"/>` + // lint-tokens-ignore
      `<rect width="1280" height="48" fill="#222"/>` + // lint-tokens-ignore
      `<rect x="320" y="12" width="640" height="24" rx="12" fill="#2e2e2e"/>` + // lint-tokens-ignore
      `<rect y="48" width="260" height="752" fill="#1c1c1c"/>` + // lint-tokens-ignore
      rows +
      "</svg>",
  )
}

/** A short log excerpt as a text file. */
export const textFile = (text: string) => `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`
