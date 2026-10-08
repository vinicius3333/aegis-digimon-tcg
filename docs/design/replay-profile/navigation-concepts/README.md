# Profile navigation concepts — 2026-10-08

Status: concept A approved and implemented on `replay-files`. Generated with the built-in ImageGen tool. Exact prompts: [prompts.json](prompts.json).

## Findings in the current app

- `PlayerMenu.tsx` opens a large dialog from the navigation avatar. It combines identity, avatar search/grid, Discord avatar refresh, navigation and sign-out.
- `ProfileScreen.tsx` opens a second edit dialog containing `AccountPanel`. That panel repeats identity, statistics and match history as well as editing controls.
- The new profile page already provides the appropriate persistent destination for identity, recent matches and saved replays. The two dialogs now duplicate its responsibilities.

## Recommendation: A — tabs within the profile

[Desktop and mobile concept](a-profile-tabs.png).

The navigation avatar opens a compact anchored menu: My profile, Replays, Preferences and Sign out. Move the avatar catalog out of this menu. Keep secondary destinations such as release notes, feedback and community reachable through the existing global navigation or clearly placed help links.

The profile has three route-backed tabs, with Partidas as the default:

- **Partidas:** the ten most recent matches, with Watch as the main action. Keep download, MP4 export and sharing available through a clearly labeled overflow menu. Preserve explicit visibility status and the unsaved-replay state.
- **Replays:** the saved library and its independent 6/10 quota. This separates recent history from saved recordings without implying all recent games are saved automatically.
- **Personalizar:** player name, avatar search and selection, and a live identity preview. No repeated history or statistics in this editor. An Edit profile link can navigate directly here.

Use URL-backed navigation, browser Back support, clear focus management and retained history scroll. Prefer real links for routed tabs. Keep general game preferences in Settings rather than adding them to the profile editor.

Editing should stage name/avatar changes locally until Save. Cancel discards the draft. The existing APIs save these fields separately, so a future implementation must either provide an atomic profile update or make partial-save outcomes explicit; a single successful toast must never hide a failed field. Preserve nickname validation, save errors and Discord refresh cooldown/error feedback. Confirm discarding only when a dirty draft would actually be lost.

On mobile, use the same page structure, three visible tabs, a compact preview, a three-column avatar catalog and actions above bottom navigation/safe-area insets. Retain one usable content scroll region and avoid a nested scrolling editor. Keyboard opening must not hide the active field or Save action. The account menu should remain a compact navigation surface rather than an avatar-picker sheet.

Guests must retain local avatar selection with an explicit guest/device-only state and a sign-in path. Discord avatar controls appear only for linked accounts. Existing per-replay privacy stays independent; do not imply a new public-profile feature or publish replays when personalizing the account.

## Other concepts

| Concept                                        | Benefit                                                                                              | Tradeoff                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [B — inline header editing](b-inline-edit.png) | Name and a few avatars can be changed without leaving match history.                                 | Expanded avatar selection pushes the primary history content down, especially on mobile. |
| [C — separate editing page](c-edit-page.png)   | A focused, spacious form with an explicit back link; suitable if personalization grows considerably. | Adds a separate destination when the current editor only needs name and avatar.          |

## Research informing the recommendation

- [Carbon modal guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/modal/guidelines): modals interrupt the underlying workflow and suit short tasks; excessive scrolling can justify a full page. This supports moving the large catalog and repeated account content out of the dialogs, while retaining small confirmations where needed.
- [Discord Custom Profiles](https://support.discord.com/hc/en-us/articles/4403147417623-Custom-Profiles): profile customization is organized in a dedicated profile/settings surface. This is a useful product reference for consolidating identity controls, not a reason to copy Discord's appearance.
- [Nielsen Norman Group: modal and nonmodal dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/): modality changes access to the underlying page. The Aegis recommendation is an inference from these principles and the current code, rather than a claim that all editing modals are wrong.

Sources consulted October 8, 2026.

## Prototype limitations

These are static concept images, not screenshots of working changes. Keep Aegis's actual avatars, typography, navigation labels and data. Generated slogans, extra search icons, sample dates, and inconsistent lock icons are illustrative artifacts, not requirements. Concept A's mobile view omits a visible Cancel action; the implementation must retain it. Do not add unsupported ranks, biography fields or profile visibility controls from visual embellishments.

Acceptance for a future implementation: no large profile dialog from the navbar; one identity editor; accessible mobile scroll; draft/cancel/error handling; guest and Discord behavior preserved; ten-match history, ten-replay storage quota and per-replay privacy unchanged.

## Implemented scope

The avatar now opens a compact non-modal menu. `/profile`, `/profile/replays` and `/profile/customize` host the three sections. Customization stages name and avatar together, commits them through one transactional API, retains guest editing and Discord refresh, and guards unsaved navigation. Mobile uses a compact preview and sticky save actions above navigation. Existing replay action buttons remain directly visible; the proposed overflow action menu is deferred.

Validation: 45 focused web tests, 19 account API tests, and 15 browser scenarios covering 320–1440px, sharing, scrolling, customization and menu keyboard focus. Desktop preview also inspected in Orca with the demo account.
