<div align="center">

```
        ╔══════════════════════════════════════════════════════╗
        ║                                                      ║
        ║         ⊹  C H A R S W I T C H   P R O  ⊹            ║
        ║                                                      ║
        ║            A power-user fork for SillyTavern         ║
        ║                                                      ║
        ╚══════════════════════════════════════════════════════╝
```

**Fast character switching · Fuzzy search · Global command palette · Tag filtering**

[![Version](https://img.shields.io/badge/version-2.1.0-7aa?style=flat-square&labelColor=1a1a1a)](./CHANGELOG.md)
[![SillyTavern](https://img.shields.io/badge/SillyTavern-1.13%2B-c99?style=flat-square&labelColor=1a1a1a)](https://github.com/SillyTavern/SillyTavern)
[![Platform](https://img.shields.io/badge/platform-desktop%20%C2%B7%20mobile-b9b?style=flat-square&labelColor=1a1a1a)](#mobile-support)
[![Author](https://img.shields.io/badge/author-aceeenvw-9c9?style=flat-square&labelColor=1a1a1a)](https://github.com/aceeenvw)
[![License](https://img.shields.io/badge/license-inherits%20upstream-999?style=flat-square&labelColor=1a1a1a)](#license)
[![Build](https://img.shields.io/badge/build-plain%20JS%20%C2%B7%20no%20bundler-bbb?style=flat-square&labelColor=1a1a1a)](#tech-stack)
[![i18n](https://img.shields.io/badge/i18n-EN%20%C2%B7%20RU-aaf?style=flat-square&labelColor=1a1a1a)](./i18n)

[ Features ](#-features)  ·  [ Install ](#-install)  ·  [ Usage ](#-usage)  ·  [ Settings ](#-settings)  ·  [ Changelog ](#-changelog)  ·  [ Credits ](#-acknowledgements)

</div>

---

## ⟡ About

**CharSwitch Pro** is a modernized fork of the excellent [SillyTavern-CharSwitch](https://github.com/LenAnderson/SillyTavern-CharSwitch) by **LenAnderson**. The original shipped a lovely idea — right-click the character drawer for a quick switcher — but was last updated in September 2024 and had a handful of lingering bugs (notably, settings that silently refused to persist).

This fork preserves everything that made the original great, fixes every bug found during audit, and adds a full power-user feature set: a VSCode-style global command palette, fuzzy search, tag filtering, chat previews, keyboard navigation, slash command integration, and a proper settings UI.

Everything still fits in a single `index.js` — no bundler, no build step, no npm install.

---

## ◆ Features

<table>
<tr>
<td width="50%" valign="top">

### ◇ Enhanced Quick Menu
Right-click the right drawer icon to open.

- ✦ **Fuzzy search** — instant filter as you type
- ✦ **Tag filter chips** — reads native SillyTavern tags
- ✦ **Keyboard nav** — `↑` `↓` `Enter` `Esc`
- ✦ **Chat preview** — hover any character to see their last message
- ✦ **Favorites first** — optional sort + highlight
- ✦ **Group avatars** — composite thumbnails, now cached

</td>
<td width="50%" valign="top">

### ◈ Command Palette
Global hotkey: **`Ctrl+Shift+K`** (rebindable)

- ✦ **Unified search** across all content types
- ✦ **Mode prefixes** — `/ > @` for targeted search
- ✦ **Chat content search** — find past conversations by what was said
- ✦ **Quick actions** — one-tap common commands
- ✦ **Slash command integration** — browse & run any registered command

</td>
</tr>
<tr>
<td width="50%" valign="top">

### ◇ Settings Panel
A real UI instead of JSON editing.

- ✦ Checkboxes for all toggles
- ✦ Numeric input for menu size
- ✦ **Hotkey recorder** — click & press any combo
- ✦ Sectioned layout
- ✦ Live-reloads without restart

</td>
<td width="50%" valign="top">

### ◈ Under the Hood
Modern, lean, correct.

- ✦ Uses current `getThumbnailUrl()` helper
- ✦ Modern `SlashCommandParser.addCommandObject` API
- ✦ Respects SmartTheme CSS variables
- ✦ Clean init (retries on slow loads)
- ✦ Clean teardown (no leaked timers)
- ✦ Legacy settings auto-migrated

</td>
</tr>
</table>

---

## ⟡ Command Palette Modes

The palette is context-aware. Type a prefix to filter what you're searching for:

<div align="center">

| Prefix | Mode | Example | Shows |
|:---:|---|---|---|
| _(none)_ | **Default** | `alice` | Characters · Groups · Chats · Actions |
| `/` | **Commands** | `/sendas` | Registered slash commands |
| `>` | **Actions** | `>regen` | Quick actions only |
| `@` | **Tags** | `@nsfw` | Characters tagged with matching tag |

</div>

---

## ⟡ Quick Actions

Available in the palette under the **Actions** section (or type `>` prefix):

```
  ◦  New chat with current character
  ◦  Close right sidebar
  ◦  Open persona selector
  ◦  Regenerate last message
  ◦  Continue last message
  ◦  Open CharSwitch Pro settings
```

---

## ◆ Install

### Option 1 — From the SillyTavern UI (recommended)

1. Open **Extensions → Manage Extensions → Install from URL**
2. Paste:
   ```
   https://github.com/aceeenvw/charswitchpro.git
   ```
3. Reload SillyTavern

### Option 2 — Manual clone

```bash
cd /path/to/SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/aceeenvw/charswitchpro.git
```

### Option 3 — Symlink (for development)

```bash
ln -s /path/to/your/local/charswitch-fork \
      /path/to/SillyTavern/public/scripts/extensions/third-party/charswitchpro
```

> **◦ Folder name is flexible.** The extension resolves its own install path via `import.meta.url`, so whatever name the folder has (`CharSwitchPro`, `charswitchpro`, `my-fork`, etc.) everything — including i18n loading — works correctly.

### ⚠ Conflict warning

If you have the original `SillyTavern-CharSwitch` installed, **disable or remove it first.** Both extensions attach listeners to the same drawer element and will fight for control.

Disable via **Extensions → Manage Extensions**, or delete the folder:
```bash
rm -rf /path/to/SillyTavern/public/scripts/extensions/third-party/SillyTavern-CharSwitch
```

After install, reload SillyTavern. The extension appears as **⊹ CHARSWITCH PRO ⊹** in the Extensions drawer.

---

## ◆ Usage

### Quick menu
```
  Right-click the right drawer icon
  └─ Type to filter (fuzzy)
     ├─ Click a tag chip to narrow
     ├─ Hover a character for chat preview
     └─ ↑↓ navigate · Enter select · Esc close
```

### Command palette
```
  Press Ctrl+Shift+K (anywhere)
  └─ Type to search characters, groups, chats, actions
     ├─ /  →  slash commands
     ├─ >  →  quick actions only
     └─ @  →  filter by tag
```

### Slash command
```
  /charswitch                 opens the palette
  /charswitch alice           opens the palette, pre-filtered
  /cswp                       alias (shorter)
```

---

## ⟡ Settings

Open **Extensions → ⊹ CHARSWITCH PRO ⊹**.

<table>
<thead>
<tr><th align="left">Section</th><th align="left">Setting</th><th align="center">Default</th></tr>
</thead>
<tbody>
<tr><td><b>Quick Menu</b></td><td>Show current character avatar on drawer icon</td><td align="center"><code>on</code></td></tr>
<tr><td><b>Quick Menu</b></td><td>Sort favorites first</td><td align="center"><code>off</code></td></tr>
<tr><td><b>Quick Menu</b></td><td>Show only favorites</td><td align="center"><code>off</code></td></tr>
<tr><td><b>Quick Menu</b></td><td>Highlight favorites</td><td align="center"><code>on</code></td></tr>
<tr><td><b>Quick Menu</b></td><td>Characters shown in menu</td><td align="center"><code>12</code></td></tr>
<tr><td><b>Palette</b></td><td>Enable command palette (global hotkey)</td><td align="center"><code>on</code></td></tr>
<tr><td><b>Palette</b></td><td>Palette hotkey</td><td align="center"><code>Ctrl+Shift+K</code></td></tr>
<tr><td><b>Palette</b></td><td>Enable chat content search</td><td align="center"><code>on</code></td></tr>
<tr><td><b>Advanced</b></td><td>Show last message preview on hover</td><td align="center"><code>on</code></td></tr>
<tr><td><b>Advanced</b></td><td>Cache composite group avatars</td><td align="center"><code>on</code></td></tr>
</tbody>
</table>

### Rebinding the hotkey

1. Click the **Palette hotkey** field — it turns red and shows `...`
2. Press your desired combination (must include at least one of `Ctrl` / `Shift` / `Alt` / `Cmd`)
3. Release — the new binding is saved immediately
4. Press `Esc` to cancel without changing

---

## ⟡ Mobile Support

As of v2.1.0, **CharSwitch Pro is fully usable on phones and tablets.** The extension detects touch devices via `matchMedia('(pointer: coarse)')`, `matchMedia('(hover: none)')`, and touch capability APIs, then adapts its UI accordingly.

<table>
<tr>
<th align="left">Interaction</th><th align="left">Desktop</th><th align="left">Mobile / Touch</th>
</tr>
<tr>
<td>Open quick menu</td>
<td>Right-click drawer icon</td>
<td><b>Long-press</b> drawer icon (~450ms, configurable)</td>
</tr>
<tr>
<td>Open command palette</td>
<td><code>Ctrl+Shift+K</code> hotkey</td>
<td><b>Floating button</b> (draggable) · or <code>/charswitch</code> slash command</td>
</tr>
<tr>
<td>Character preview</td>
<td>Hover</td>
<td><b>Long-press</b> on list item</td>
</tr>
<tr>
<td>Navigate results</td>
<td>Arrow keys</td>
<td>Tap</td>
</tr>
<tr>
<td>Close overlays</td>
<td><code>Esc</code></td>
<td>Tap outside / back gesture</td>
</tr>
</table>

### Mobile-specific features

- ✦ **Draggable FAB** — floating button you can reposition anywhere on the screen. Position is saved.
- ✦ **Full-screen palette** on narrow viewports for comfortable input.
- ✦ **iOS zoom prevention** — inputs use 16px font-size so Safari doesn't auto-zoom on focus.
- ✦ **Safe area insets** — respects notches and gesture bars on modern devices.
- ✦ **Haptic feedback** on long-press where the browser supports `navigator.vibrate`.
- ✦ **44–48px touch targets** — follows Apple HIG & Material Design minimums.
- ✦ **Adaptive settings panel** — keyboard-shortcut recorder automatically hidden on touch devices.

### Mobile settings

Open **Extensions → ⊹ CHARSWITCH PRO ⊹ → Mobile / Touch**:

| Setting | Default | Description |
|---|---|---|
| Floating button | `Auto` | `Auto` (touch only) · `Always` · `Never` |
| Long-press for preview | `on` | Enable long-press-to-preview gesture |
| Long-press duration | `450ms` | Tunable 200–2000ms |

---

## ⟡ Tech Stack

<div align="center">

| Layer | Technology | Notes |
|---|---|---|
| Language | Vanilla JavaScript (ESM) | No TypeScript, no transpile |
| DOM | Native + jQuery | jQuery already bundled with SillyTavern |
| Styling | Plain CSS | Uses SmartTheme CSS variables |
| i18n | JSON resource files | `en-us` · `ru-ru` |
| Build | **None** | Drop-in install |
| Dependencies | **Zero external** | Everything from SillyTavern's own module surface |

</div>

All imports resolve to current SillyTavern core:
```js
script.js          → characters, events, selectCharacter, getThumbnailUrl, getPastCharacterChats
extensions.js      → extension_settings, getContext
group-chats.js     → groups, openGroupById, selected_group
tags.js            → tag_map, tags
popup.js           → Popup, POPUP_TYPE
slash-commands/    → SlashCommand, SlashCommandParser, ARGUMENT_TYPE
```

---

## ⟡ File Layout

```
<install-folder>/
├── manifest.json          Extension metadata (author · i18n registration)
├── index.js               Main module — ~990 lines, fully commented sections
├── style.css              SmartTheme-aware styles — ~400 lines
├── i18n/
│   ├── en-us.json         English strings (primary)
│   └── ru-ru.json         Russian strings
├── README.md              This file
└── CHANGELOG.md           Version history
```

The install folder name is resolved at runtime — it can be anything.

---

## ◆ Changelog

<details open>
<summary><b>2.1.0 — Mobile support (2026-04)</b></summary>

### ✦ New on mobile
- **Long-press** on the drawer icon opens the quick menu (replaces right-click).
- **Floating button (FAB)** — draggable, auto-shown on touch devices, position persisted.
- **Full-screen palette** on narrow viewports.
- **Long-press to preview** a character's last message.
- **Haptic feedback** where supported.
- **Safe-area insets** for notched / gesture-bar devices.
- **iOS zoom prevention** on input focus.
- Touch targets scaled to 44–48px.

### ✦ New settings
- `Floating button` — `Auto` / `Always` / `Never`
- `Long-press for preview` — toggle
- `Long-press duration` — 200–2000ms

### ✦ Adaptive behavior
- Hotkey recorder hidden on touch devices.
- Keyboard hints in palette footer hidden when no hover.
- Device capabilities detected via `matchMedia('(pointer: coarse)')`, `matchMedia('(hover: none)')`, and `ontouchstart`.

</details>

<details>
<summary><b>2.0.0 — Fork baseline (2026-04)</b></summary>

### ✦ Bug fixes
- **Settings persistence** — original read from `extension_settings.charSwitchx` (typo) but wrote to `extension_settings.charSwitch`, so settings never survived reload. Migrated to `extension_settings.charSwitchPro` with automatic migration from both legacy keys.
- **Double DOM append** of context menu (was appended to both `document.body` and the trigger element).
- **Init race** — `querySelector('#rightNavHolder > .drawer-toggle')` could return null on slow loads. Now retries up to 10 seconds.
- **Leaked timers** — `checkDiscord()` interval ran forever with no cleanup. All timers now tracked and cleared on `pagehide`.

### ✦ New features
- Full **Settings UI** in the Extensions drawer (previously JSON-only)
- **Fuzzy search** input at the top of the quick menu
- **Tag filter chips** using SillyTavern's native `tag_map`
- **Keyboard navigation** (↑↓ Enter Esc) in quick menu and palette
- **Chat preview tooltip** on hover (last message snippet, cached)
- **Command Palette** with global hotkey `Ctrl+Shift+K` (rebindable)
- Palette **mode prefixes** — `/` commands, `>` actions, `@` tags
- **On-demand chat content search** across past chats
- **Quick actions** — new chat, close sidebar, toggle persona, regenerate, continue
- **Slash command** — `/charswitch [query]` and alias `/cswp`
- **Hotkey recorder** — click field, press combo to rebind
- **i18n** — English (primary) + Russian

### ✦ Modernization
- Uses current `getThumbnailUrl('avatar', file, true)` helper
- Modern `SlashCommandParser.addCommandObject(SlashCommand.fromProps({...}))` pattern
- CSS rewritten with `cswp--` prefix, uses SmartTheme variables
- `auto_update: true` added to manifest
- Composite group avatars cached by member-list hash

</details>

<details>
<summary><b>1.0.1 — Original by LenAnderson (2024-09)</b></summary>

- Right-click drawer icon context menu with recent characters/groups
- Composite group avatars (live-rendered)
- Optional favorite-first sorting
- Avatar overlay on drawer icon

</details>

---

## ◆ Acknowledgements

<div align="center">

```
                      ╭───────────────────────╮
                      │    With gratitude to  │
                      ╰───────────────────────╯
```

</div>

### ✦ Upstream author

**[LenAnderson](https://github.com/LenAnderson)** — creator of the original [SillyTavern-CharSwitch](https://github.com/LenAnderson/SillyTavern-CharSwitch). The core UX idea (right-click the drawer for fast switching), the composite group-avatar canvas logic, and the Discord-layout detection are all their work. This fork stands on their shoulders.

### ✦ SillyTavern team

**[SillyTavern contributors](https://github.com/SillyTavern/SillyTavern/graphs/contributors)** — for building and maintaining the platform. Special thanks to **Cohee1207** and **RossAscends** for the extension APIs (`extension_settings`, `SlashCommandParser`, `getContext`, `getThumbnailUrl`) this fork relies on.

### ✦ Inspiration

- **VSCode** & **Raycast** — for proving command palettes are the correct input paradigm for power users
- **Extension-QuickPersona** (Cohee1207) — for the clean floating-menu pattern
- **SillyTavern-LandingPage** — for the modern slash command registration example

### ✦ Fork author

**aceenvw** — fork maintenance, bug audit, Phase 1 + Phase 2 features, settings UI, command palette, i18n.

---

## ⟡ License

This fork inherits the license of the upstream [SillyTavern-CharSwitch](https://github.com/LenAnderson/SillyTavern-CharSwitch) repository. Consult the original repository for license terms. All original copyright notices and attribution are preserved.

New code contributed in this fork may be used under the same terms.

---

## ⟡ Contributing

Found a bug? Want to add Phase 3 features? Pull requests welcome.

Ideas for future versions:
```
  v2.1  ·  Chat jumping — "go to message N in chat X" from the palette
  v2.2  ·  Recent context stack — flip between active RP and utility chars
  v2.3  ·  Preset switcher — bundle preset changes with char switches
  v3.0  ·  Extension palette — run actions from other extensions by name
```

---

<div align="center">

```
    ⊹                                                               ⊹
         Built with care for the SillyTavern community.
    ⊹                                                               ⊹
```

**[↑ Back to top](#)**

</div>
