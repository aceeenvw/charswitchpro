# Changelog

All notable changes to CharSwitch Pro.

## [2.1.0] — 2026-04-27
**Full mobile / touch device support.**

### Added
- **Long-press** on the drawer icon opens the quick menu on touch devices (replaces the desktop right-click gesture).
- **Floating action button (FAB)** for mobile — draggable, repositionable, auto-shown on touch devices. Modes: `auto` / `always` / `never`.
- Palette opens **full-screen** on narrow viewports and touch devices.
- **Long-press to preview** a character's last message (replaces desktop hover on touch).
- iOS-safe styling — `font-size: 16px` on inputs prevents automatic zoom-on-focus.
- Safe-area insets respected (`env(safe-area-inset-*)`) for notched / gesture-bar devices.
- Haptic feedback on long-press where available (`navigator.vibrate`).
- Touch targets increased to 44–48px on touch devices (Apple HIG / Material guidelines).
- Tag chips, list items, settings rows, input fields all scaled for finger use on small screens.

### Changed
- Hotkey-recorder input hidden on touch devices (keyboard-only feature).
- Keyboard-shortcut hints in palette footer hidden on `(hover: none)` devices.
- Fab position saved in settings and persists across reloads.
- Orientation change + window resize triggers FAB visibility refresh (debounced).

### Mobile settings added
- `showMobileFab` — `auto` / `always` / `never` (default: `auto`).
- `mobilePreviewTap` — toggle long-press-to-preview behavior.
- `longPressMs` — tunable long-press duration (200–2000ms, default 450).

### Device detection
- New `Device` helper uses `matchMedia('(pointer: coarse)')`, `matchMedia('(hover: none)')`, `ontouchstart`, and viewport width to detect touch environments.

## [2.0.0] — 2026-04-27
**Fork of SillyTavern-CharSwitch v1.0.1 by LenAnderson.** Maintained by aceenvw.

### Fixed
- Settings persistence — original read from `extension_settings.charSwitchx` (typo) but wrote to `extension_settings.charSwitch`, so settings never survived reload. Migrated to `extension_settings.charSwitchPro` with automatic migration from both legacy keys.
- Double DOM append of context menu (was appended to both `document.body` and `trigger`).
- Init race — `querySelector('#rightNavHolder > .drawer-toggle')` could return null on slow loads. Now retries up to 10 seconds.
- Leaked timers — `checkDiscord()` interval ran forever with no cleanup. All timers now tracked and cleared on `pagehide`.

### Added
- **Settings UI** in the Extensions drawer (previously JSON-only).
- **Fuzzy search** input at the top of the quick menu.
- **Tag filter chips** using SillyTavern's native `tag_map`.
- **Keyboard navigation** (↑↓ Enter Esc) in quick menu and palette.
- **Chat preview tooltip** on hover (last message snippet, with on-demand caching).
- **Command Palette** — global hotkey (default `Ctrl+Shift+K`) opens a unified search overlay.
  - Default mode: characters + groups + chats + actions.
  - `/` mode: slash commands.
  - `>` mode: quick actions only.
  - `@` mode: tag-filtered characters.
- **On-demand chat content search** — finds past chats by message content across up to 40 characters.
- **Quick actions** — new chat, close sidebar, toggle persona, regenerate, continue, open settings.
- **Slash command** — `/charswitch [query]` and alias `/cswp` open the palette.
- **Hotkey recorder** in settings — click the field, press any combo to rebind.
- **i18n**: English (primary) + Russian translations.
- `auto_update: true` in manifest.

### Changed
- Uses `getThumbnailUrl('avatar', file, true)` instead of constructing thumbnail URLs by hand.
- Uses `SlashCommandParser.addCommandObject(SlashCommand.fromProps({...}))` modern pattern.
- CSS rewritten — classes prefixed with `cswp--`, uses SmartTheme CSS variables for color theming, respects SillyTavern's light/dark/custom themes.
- Composite group avatars now cached by member list hash.

### Dependencies
- SillyTavern current (late 2024 / 2025+ APIs).
- No build step, no bundler, no external libs beyond what ST ships.
