// Nocturne components for SolidJS. Import the stylesheet once: `import "@aiviarium/nocturne/styles/index.css"`.
export * from "./components"
export * from "./editor"
export * from "./fields"
export { ACCENTS, type AccentPreset, accentPreset, accentValue } from "./lib/accents"
export { aria, ariaChecked } from "./lib/aria"
export { cx } from "./lib/cx"
export { type DiffHunk, type DiffLine, diffStrings, diffWords, type FileDiff, parsePatch } from "./lib/diff"
export {
  clamp,
  decimalsOf,
  type EvaluateOptions,
  type EvaluateResult,
  evaluateExpression,
  formatWithUnits,
  snap,
  UNITS,
  type Units,
} from "./lib/expression"
export {
  type Detent,
  detentHeights,
  EDGE_WIDTH,
  lockDirection,
  PULL_THRESHOLD,
  pullRefreshes,
  type RowSwipe,
  rowSwipe,
  rubberBand,
  settleDetent,
  swipeBack,
} from "./lib/gestures"
export {
  cellDelta,
  cellHeight,
  clampItem,
  compact,
  type FitBox,
  fitLayout,
  GRID_COLUMNS,
  moveItem,
  normalize as normalizeGrid,
  place as placeInGrid,
  resizeItem,
  rowCount as gridRows,
} from "./lib/grid"
export { type CodeToken, highlight } from "./lib/highlight"
export { openLayers } from "./lib/layers"
export { LinkProvider } from "./lib/link"
export {
  isPhone,
  keyboardInset,
  keyboardOpen,
  PHONE_BOUNDS,
  PHONE_QUERY,
  PHONE_SCALE,
  PhoneOverride,
  trackViewport,
  usePhone,
} from "./lib/phone"
export { computePosition, type Placement } from "./lib/position"
export {
  createQueryId,
  defaultOperator,
  describeRule,
  emptyQuery,
  formatValue,
  fromWhere,
  isComplete,
  isGroup,
  matchQuery,
  type OperatorInfo,
  operatorInfo,
  operatorsFor,
  parseQueryText,
  printQueryText,
  pruneIncomplete,
  QueryError,
  type QueryField,
  type QueryFieldType,
  type QueryFormat,
  type QueryGroup,
  type QueryNode,
  type QueryOperator,
  type QueryOption,
  type QueryRule,
  type QueryValue,
  ruleText,
  type TextQueryOptions,
  type TextQueryResult,
  toWhere,
  valueForOperator,
  type Where,
  type WhereOptions,
  type WhereResult,
} from "./lib/query"
export {
  autoScrollSpeed,
  createReorder,
  DRAG_THRESHOLD,
  dropSlot,
  type PointerDownOptions,
  pastThreshold,
  type ReorderControl,
  type ReorderOptions,
  reorderItems,
  slotToIndex,
  startsRowDrag,
  TOUCH_DRAG_THRESHOLD,
} from "./lib/reorder"
export {
  defaultRowMenu,
  isMenuKey,
  keyboardMenuPoint,
  menuTarget,
  type RowMenuEntry,
  type RowMenuTarget,
} from "./lib/rowmenu"
export {
  createSelection,
  gestureOf,
  type SelectGesture,
  type SelectionControl,
  type SelectionState,
  selectionKey,
  selectRows,
} from "./lib/selection"
export { createRowSwipe, type RowSwipeControl, type RowSwipeOptions, touchScreen } from "./lib/swipe"
export { filterItems, findTrigger, type TriggerChar } from "./lib/triggers"
