import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"
import { cx } from "../lib/cx"
import type { Placement } from "../lib/placement"
import { Avatar } from "./Avatar"
import { Icon } from "./Icon"
import { DropdownMenu, type MenuEntry } from "./Menu"

export type ThemePreference = "system" | "dark" | "light"

export interface AccountMenuProps {
  /** Who is signed in: the name shown and the avatar's initials. */
  name: string
  /** Under the name in the menu, such as the email address. */
  detail?: string
  /** A short role after the name in the menu: "Admin". */
  badge?: string
  /** An avatar of the app's own, in place of the initials. */
  avatar?: JSX.Element
  /** The app's items, between who is signed in and the theme: settings, shortcuts. */
  items?: MenuEntry[]
  /** Called with the id of one of `items`. */
  onSelect?: (id: string) => void
  /** The theme setting, as one compact row of three icons. Left out, the menu has no theme row. */
  theme?: { value: ThemePreference; onChange: (value: ThemePreference) => void }
  /** Signs out. It is the last item. */
  onSignOut?: () => void
  /**
   * `row` (default): the avatar and the name, filling the width, for the foot of a sidebar. `avatar`: the avatar
   * alone, for the end of a top bar.
   */
  trigger?: "row" | "avatar"
  /** Default `top-start` for a row, `bottom-end` for an avatar. */
  placement?: Placement
  class?: string
}

const SIGN_OUT = "nc-account-sign-out"

/**
 * The signed-in person's menu: a trigger with their avatar, and a menu that says who they are, holds the app's
 * items, the theme as one row of icons and sign out last. One shape in every app, so the account is always in the
 * same place and the theme never takes more room than an item.
 */
export function AccountMenu(props: AccountMenuProps): JSX.Element {
  const avatar = (size: "sm" | "md") => props.avatar ?? <Avatar name={props.name} size={size} />
  const entries = (): MenuEntry[] => {
    const out: MenuEntry[] = [
      {
        type: "custom",
        content: (
          <div class="nc-account__identity" data-part="account-identity">
            {avatar("md")}
            <span class="nc-account__who">
              <span class="nc-account__name">
                <span class="nc-account__name-text">{props.name}</span>
                <Show when={props.badge}>
                  <span class="nc-account__badge">{props.badge}</span>
                </Show>
              </span>
              <Show when={props.detail}>
                <span class="nc-account__detail">{props.detail}</span>
              </Show>
            </span>
          </div>
        ),
      },
    ]
    if (props.items?.length) out.push({ type: "separator" }, ...props.items)
    if (props.theme) {
      const theme = props.theme
      out.push(
        { type: "separator" },
        {
          type: "choice",
          id: "nc-account-theme",
          label: "Theme",
          variant: "icons",
          value: theme.value,
          onChange: (value) => theme.onChange(value as ThemePreference),
          options: [
            { value: "system", label: "System", icon: "monitor" },
            { value: "light", label: "Light", icon: "sun" },
            { value: "dark", label: "Dark", icon: "moon" },
          ],
        },
      )
    }
    if (props.onSignOut) out.push({ type: "separator" }, { id: SIGN_OUT, label: "Sign out", icon: "log-out" })
    return out
  }
  const row = () => (props.trigger ?? "row") === "row"
  return (
    <DropdownMenu
      label="Account"
      items={entries()}
      placement={props.placement ?? (row() ? "top-start" : "bottom-end")}
      matchWidth={false}
      minWidth="240px"
      class="nc-account__menu"
      onSelect={(id) => (id === SIGN_OUT ? props.onSignOut?.() : props.onSelect?.(id))}
      trigger={(t) => (
        <button
          {...t}
          type="button"
          class={cx("nc-account", row() ? "nc-account--row" : "nc-account--avatar", props.class)}
          aria-label={`Account: ${props.name}`}
          data-part="account-menu"
        >
          {avatar("sm")}
          <Show when={row()}>
            <span class="nc-account__trigger-name">{props.name}</span>
            <Icon name="chevron-down" size="sm" class="nc-account__chevron" />
          </Show>
        </button>
      )}
    />
  )
}
