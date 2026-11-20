// The board's parts: lanes side by side that scroll sideways inside the board when they do not fit (never
// squeezed), and the card every board draws. Below BOARD_STACK_WIDTH of the board's own
// width (a container query, and `useBoard().stacked()` for code that lays cards out itself) the lanes stack as
// grouped lists, the iOS way: a section header per lane and its cards as rows.

import type { JSX } from "@solidjs/web"
import {
  createContext,
  createSignal,
  omit,
  onSettled,
  children as resolveChildren,
  Show,
  useContext,
} from "solid-js"
import { cx } from "../lib/cx"
import { Icon } from "./Icon"

/** A board narrower than this (its own width, in px) shows its lanes as grouped lists. */
export const BOARD_STACK_WIDTH = 560
/** The width of a lane, as on the Projects board. */
export const BOARD_LANE_WIDTH = 272
/** The height of a card's slot on a board that draws its cards in one (`Board`'s `fixed`). */
export const BOARD_CARD_HEIGHT = 112
/** The least height of a card on a board whose cards are as tall as their content. */
export const BOARD_CARD_MIN_HEIGHT = 64
/** The gap between cards in a lane. */
export const BOARD_CARD_GAP = 8

interface BoardContextValue {
  /** The board is narrower than `BOARD_STACK_WIDTH`: lanes are grouped lists and cards are rows. */
  stacked: () => boolean
}

const BoardContext = createContext<BoardContextValue>({ stacked: () => false })

/** What the board around a lane or card knows: whether it is stacked into grouped lists. */
export function useBoard(): BoardContextValue {
  return useContext(BoardContext)
}

export interface BoardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The board's accessible name. */
  label?: string
  /**
   * The board fills its frame's height and each lane scrolls inside itself (a board view). By default lanes are
   * as tall as their cards and the page scrolls (a board in a document).
   */
  fill?: boolean
  /** A card is being dragged: the grabbing cursor, no text selection. */
  dragging?: boolean
  /**
   * Every card is a slot of `BOARD_CARD_HEIGHT`, and so is the drop placeholder: for a lane that knows where each
   * card is without measuring it (a virtualised lane places its cards absolutely). By default a card is as tall as
   * its content, at least `BOARD_CARD_MIN_HEIGHT`, with its last row on the bottom edge.
   */
  fixed?: boolean
  /** `BoardLane`s, or rows of them (swimlanes) laid out by the caller. */
  children: JSX.Element
  /** Something above the lanes that scrolls sideways with them (a sticky row of lane heads, for swimlanes). */
  head?: JSX.Element
  /** Lanes are laid out by the caller (swimlanes): the board does not wrap its children in a row of lanes. */
  custom?: boolean
}

/**
 * A board: `BoardLane`s side by side, each `BOARD_LANE_WIDTH` wide, scrolling sideways inside the board when
 * they do not fit. Lanes are never squeezed. Narrower than `BOARD_STACK_WIDTH`, the lanes stack as grouped
 * lists (a section header and rows), as on a phone.
 */
export function Board(props: BoardProps): JSX.Element {
  const rest = omit(props, "label", "fill", "dragging", "fixed", "children", "head", "custom", "class")
  const [stacked, setStacked] = createSignal(false)
  let el!: HTMLDivElement
  onSettled(() => {
    const measure = () => setStacked(el.clientWidth > 0 && el.clientWidth < BOARD_STACK_WIDTH)
    measure()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })
  return (
    <BoardContext value={{ stacked }}>
      <div
        ref={el}
        role="group"
        aria-label={props.label}
        data-part="board"
        data-fill={props.fill ? "" : undefined}
        data-stacked={stacked() ? "" : undefined}
        data-dragging={props.dragging ? "" : undefined}
        data-fixed={props.fixed ? "" : undefined}
        class={cx("nc-board", props.class)}
        {...rest}
      >
        <div class="nc-board__scroll">
          {props.head}
          <Show when={!props.custom} fallback={props.children}>
            <div class="nc-board__lanes">{props.children}</div>
          </Show>
        </div>
      </div>
    </BoardContext>
  )
}

export interface BoardLaneHeadProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** The lane's name. */
  name: JSX.Element
  /** How many cards it holds, in text-3 after the name; nothing when it holds none. */
  count?: number
  /** Before the name: the group's own icon (a state's glyph). Takes the place of the dot. */
  icon?: JSX.Element
  /** The dot before the name, in a label hue (`sky`, `mint`, `amber`, `rose`…); `neutral` for a grey one. */
  hue?: string
  /** Adds a card to this lane: a small plus at the head's end. */
  onAdd?: () => void
  /** The add control's label. Default "New in <name>". */
  addLabel?: string
}

/** A lane's head: the dot or icon, the name, the count and the add control, in a 30px row. */
export function BoardLaneHead(props: BoardLaneHeadProps): JSX.Element {
  const rest = omit(props, "name", "count", "icon", "hue", "onAdd", "addLabel", "class")
  const n = () => props.count
  return (
    <div data-part="board-lane-head" class={cx("nc-board-lane__head", props.class)} {...rest}>
      <Show
        when={props.icon}
        fallback={
          <Show when={props.hue}>
            <span
              class="nc-board-lane__dot"
              data-hue={props.hue === "neutral" ? undefined : props.hue}
              aria-hidden="true"
            />
          </Show>
        }
      >
        <span class="nc-board-lane__icon">{props.icon}</span>
      </Show>
      <span class="nc-board-lane__name label">{props.name}</span>
      <Show when={n()}>
        <span class="nc-board-lane__count nc-meta nc-num" data-part="board-lane-count">
          {n()}
        </span>
      </Show>
      <Show when={props.onAdd}>
        <button
          type="button"
          class="nc-icon-btn nc-board-lane__add"
          aria-label={props.addLabel ?? `New in ${typeof props.name === "string" ? props.name : "this lane"}`}
          title={props.addLabel}
          onClick={() => props.onAdd?.()}
        >
          <Icon name="plus" size="sm" />
        </button>
      </Show>
    </div>
  )
}

export interface BoardLaneProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title"> {
  /** The lane's name, in its head and as its accessible name. */
  name: string
  count?: number
  icon?: JSX.Element
  hue?: string
  onAdd?: () => void
  addLabel?: string
  /** A card is being dragged over this lane: the drop highlight. */
  drop?: boolean
  /** No head (a swimlane cell under a shared row of heads). */
  hideHead?: boolean
  /** The lane's cards (`BoardCard`s), in its body. */
  children?: JSX.Element
  /** Under the cards, inside the body ("Show 12 more"). */
  footer?: JSX.Element
  /** The body element, which scrolls in a `fill` board (for virtualised lanes). */
  bodyRef?: (el: HTMLDivElement) => void
  /** Attributes for the body element (`data-*` the caller's drag code reads, `onScroll`). */
  bodyProps?: JSX.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | undefined>
}

/**
 * A lane of a board: its head (dot or icon, name, count, add) over its cards, `BOARD_LANE_WIDTH` wide on a bg-0
 * well. In a stacked board it is a grouped list: the head a section header, the cards rows of one group.
 */
export function BoardLane(props: BoardLaneProps): JSX.Element {
  const rest = omit(
    props,
    "name",
    "count",
    "icon",
    "hue",
    "onAdd",
    "addLabel",
    "drop",
    "hideHead",
    "children",
    "footer",
    "bodyRef",
    "bodyProps",
    "class",
  )
  return (
    <section
      aria-label={props.name}
      data-part="board-lane"
      data-drop={props.drop ? "" : undefined}
      class={cx("nc-board-lane", props.class)}
      {...rest}
    >
      <Show when={!props.hideHead}>
        <BoardLaneHead
          name={props.name}
          count={props.count}
          icon={props.icon}
          hue={props.hue}
          onAdd={props.onAdd}
          addLabel={props.addLabel}
        />
      </Show>
      <div ref={(el) => props.bodyRef?.(el)} class="nc-board-lane__body" {...props.bodyProps}>
        {props.children}
      </div>
      <Show when={props.footer}>
        <div class="nc-board-lane__foot">{props.footer}</div>
      </Show>
    </section>
  )
}

export interface BoardCardProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title"> {
  /** The top row: a key or a little meta at the start, a person at the end. */
  top?: JSX.Element
  /** The title, clamped to two lines. */
  title?: JSX.Element
  /** Before the title: a state's glyph or the record's icon. */
  icon?: JSX.Element
  /** The meta row, on the card's bottom edge: priority, labels, an estimate, chips. */
  meta?: JSX.Element
  /** The body laid out with `BoardCardTop`, `BoardCardTitle` and `BoardCardMeta` instead of the props above. */
  children?: JSX.Element
  selected?: boolean
  /** The keyboard's cursor is on it. */
  active?: boolean
  /**
   * The card is placed by its lane (a virtualised lane positions it with `style.transform`): it is absolute in
   * the lane's body. A stacked board puts it back in the flow.
   */
  placed?: boolean
  /** The copy that follows the pointer while dragging. */
  ghost?: boolean
}

/** A card's top row: a key or meta at the start, a person or a little state at the end. */
export function BoardCardTop(props: { children: JSX.Element }): JSX.Element {
  return (
    <div data-part="board-card-top" class="nc-board-card__top">
      {props.children}
    </div>
  )
}

/** A card's title, clamped to two lines, with an optional glyph before it. */
export function BoardCardTitle(props: { icon?: JSX.Element; children: JSX.Element }): JSX.Element {
  return (
    <div data-part="board-card-title" class="nc-board-card__title">
      <Show when={props.icon}>
        <span class="nc-board-card__icon">{props.icon}</span>
      </Show>
      <span class="nc-board-card__text label">{props.children}</span>
    </div>
  )
}

/** A card's meta row, on its bottom edge whatever the title's length. */
export function BoardCardMeta(props: { children: JSX.Element }): JSX.Element {
  return (
    <div data-part="board-card-meta" class="nc-board-card__meta">
      {props.children}
    </div>
  )
}

/**
 * A card on a board: as tall as its content (at least `BOARD_CARD_MIN_HEIGHT`; a `Board` with `fixed`: a fixed
 * `BOARD_CARD_HEIGHT`) with a top row, a title clamped to two lines and a meta row pinned to the bottom edge. In a stacked board it is a row of
 * a grouped list. Selection is a neutral fill; the keyboard's cursor, the focus ring.
 */
export function BoardCard(props: BoardCardProps): JSX.Element {
  const rest = omit(
    props,
    "top",
    "title",
    "icon",
    "meta",
    "children",
    "selected",
    "active",
    "placed",
    "ghost",
    "class",
  )
  const body = resolveChildren(() => props.children)
  return (
    <article
      data-part="board-card"
      data-selected={props.selected ? "" : undefined}
      data-active={props.active ? "" : undefined}
      class={cx(
        "nc-board-card",
        props.placed && "nc-board-card--placed",
        props.ghost && "nc-board-card--ghost",
        props.class,
      )}
      {...rest}
    >
      <Show when={body() == null} fallback={body()}>
        <Show when={props.top}>
          <BoardCardTop>{props.top}</BoardCardTop>
        </Show>
        <BoardCardTitle icon={props.icon}>{props.title}</BoardCardTitle>
        <Show when={props.meta}>
          <BoardCardMeta>{props.meta}</BoardCardMeta>
        </Show>
      </Show>
    </article>
  )
}

/**
 * Where a dragged card would land: a dashed box. On a board with `fixed` it is a card's slot; otherwise give it the
 * dragged card's height (`style.height`). Absolute in a virtualised lane.
 */
export function BoardDrop(props: JSX.HTMLAttributes<HTMLDivElement> & { placed?: boolean }): JSX.Element {
  const rest = omit(props, "placed", "class")
  return (
    <div
      aria-hidden="true"
      data-part="board-drop"
      class={cx("nc-board-drop", props.placed && "nc-board-drop--placed", props.class)}
      {...rest}
    />
  )
}
