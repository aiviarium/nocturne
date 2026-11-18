// Where a pointer lands in a single-line text field's text, for controls that place the caret themselves.

/** The caret position nearest a horizontal point in a single-line input, measured with the input's own font. */
export function caretAt(input: HTMLInputElement, clientX: number): number {
  const text = input.value
  if (!text) return 0
  const style = getComputedStyle(input)
  const ctx = document.createElement("canvas").getContext("2d")
  if (!ctx) return text.length
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const box = input.getBoundingClientRect()
  const right = style.textAlign === "right" || style.textAlign === "end"
  const full = ctx.measureText(text).width
  const start = right
    ? box.right - Number.parseFloat(style.paddingRight) - full
    : box.left + Number.parseFloat(style.paddingLeft) - input.scrollLeft
  const x = clientX - start
  let best = 0
  let gap = Math.abs(x)
  for (let i = 1; i <= text.length; i++) {
    const d = Math.abs(ctx.measureText(text.slice(0, i)).width - x)
    if (d < gap) {
      gap = d
      best = i
    }
  }
  return best
}
