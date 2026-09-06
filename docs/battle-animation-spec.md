# the reference client animation spec

Reference for porting the the reference client (Unity) match-screen feel to the Aegis web client.

All timings below are read out of the the reference client source at `the local reference-client checkout`
(read-only). File references are `path:line`, relative to
`Assets/Scripts/Script/` unless the path says otherwise.

## Global vocabulary

The reference client drives motion three ways. Port each one to a different web mechanism.

| the reference client mechanism                                                                      | Where                                                      | Web equivalent                                      |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| DOTween `Sequence` with explicit float durations                                                    | `Effects.cs`, `CardObjectController.cs`, `MemoryObject.cs` | CSS keyframes / transitions with matching `ms`      |
| Unity `Animator` clips (`.anim` assets)                                                             | `Assets/Animation/Battle/**`                               | CSS keyframes; clip keyframe times map 1:1          |
| Particle prefabs (`*EvolutionEffect`, `NewUnitEffect_OnLand`) instantiated then destroyed after 5 s | `Effects.cs:191` `DeleteCoroutine`                         | short-lived absolutely-positioned sparkle/glow divs |

Easing map (DOTween → CSS):

| DOTween                                                 | CSS                                      |
| ------------------------------------------------------- | ---------------------------------------- |
| `Ease.OutCubic`                                         | `cubic-bezier(0.33, 1, 0.68, 1)`         |
| `Ease.OutBack`                                          | `cubic-bezier(0.34, 1.56, 0.64, 1)`      |
| `Ease.OutBounce`                                        | keyframed bounce (no bezier equivalent)  |
| `Ease.InCubic`                                          | `cubic-bezier(0.32, 0, 0.67, 0)`         |
| DOTween default (`Ease.OutQuad`)                        | `cubic-bezier(0.5, 1, 0.89, 1)`          |
| Unity `.anim` flat tangents (`inSlope: 0, outSlope: 0`) | `ease-in-out` between each keyframe pair |

Recurring cadence constants used all over `Effects.cs:13-26`: 40 ms, 50 ms, 60 ms,
70 ms, 100 ms, 120 ms, 160 ms, 170 ms, 250 ms, 300 ms, 400 ms, 480 ms.
The reference client is fast — almost nothing single-step runs longer than 250 ms; the long
moments are cut-in overlays (0.95 s – 2.7 s) and deliberate `WaitForSeconds`
beats between steps.

Colour glow per card colour: `Effects.cs:561-594` instantiates one of
`Green/Red/Blue/Yellow/Purple/Black/WhiteEvolutionEffect` scaled to `(4, 1, 4)`
at the card position. Every "card lands / card dies / security shatters" moment
reuses the same colour-keyed burst. Port as a single
`.battle-color-burst[data-color]` element.

---

## 1. Drawing a card

### the reference client mechanism

Draw is a **centre-screen presentation**, not a deck→hand flight. Both players'
draws use the same overlay card (`Effects.ShowUseHandCard`) parked in the middle
of the canvas; only the direction and the face differ.

- `CardObjectController.cs:625` `AddHandCard(cardSource, isDraw)`
  - `:642` if `isDraw` → `Effects.AddHandCardEffect` (the centre reveal)
  - `:648` if not a draw (tutor/bounce) → sound only, no reveal
  - `:671` one frame wait, then the hand-slot slide
  - `:676-703` disables the `GridLayoutGroup`, offsets the new hand card by
    **+70 y (you) / −70 y (opponent)**, tweens back over **0.08 s `Ease.OutBack`**,
    re-enables the layout group
- `Effects.cs:1188` `AddHandCardEffect`
- `Effects.cs:1281` `ShrinkUpUseHandCard` — the exit
- `Player.cs:407` `ShuffleAnimation` — 3 × 2 × 0.03 s deck-image jitter (±30 y)

### Timings

| Step | What                                                                                                                                               | Duration  | Easing            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------- |
| 0    | `DrawSE` fires (`Effects.cs:1190`)                                                                                                                 | —         | —                 |
| 1    | Overlay card set at local `(210, 10)` you / `(210, 30)` opponent, scale `0.2`, rotation `z = −60°`, tinted **black** (`Effects.cs:1204-1226`)      | 0         | —                 |
| 2    | Move to `(150, −30)` you / `(150, +30)` opponent, scale → `0.45`, rotation → `0°`, all joined (`Effects.cs:1231-1241`)                             | **60 ms** | default (OutQuad) |
| 3    | Local player only: swap in the real face + spawn two `ShowUseHandCardEffect` sparkle prefabs, second one rotated 90° on Y (`Effects.cs:1248-1264`) | —         | —                 |
| 4    | Hold (local player only) (`Effects.cs:1267`)                                                                                                       | **40 ms** | —                 |
| 5    | Hold (both) (`Effects.cs:1270`)                                                                                                                    | **50 ms** | —                 |
| 6    | `ShrinkUpUseHandCard` starts, not awaited (`Effects.cs:1273`)                                                                                      | —         | —                 |
| 6a   | `DeleteHandSE`; scaleX → `0.06`, scaleY → `1.4`, tint → `#CDCDCD`, joined (`Effects.cs:1294-1304`)                                                 | **70 ms** | default           |
| 6b   | At the halfway point (35 ms) the sprite is nulled (`Effects.cs:1306-1308`)                                                                         | —         | —                 |
| 6c   | Slide up to local y `220` (`Effects.cs:1319-1323`)                                                                                                 | **70 ms** | default           |
| 7    | Caller resumes after (`Effects.cs:1275`)                                                                                                           | **60 ms** | —                 |
| 8    | Hand card drops into its slot from ±70 y (`CardObjectController.cs:696`)                                                                           | **80 ms** | `Ease.OutBack`    |

Total draw beat ≈ **150 ms of overlay + 140 ms of squash-exit (overlapped) + 80 ms slot drop**.

Opponent draw is identical except the overlay card shows the card back
(`SetUpReverseCard`, `Effects.cs:1222`), no sparkle prefabs, no 40 ms hold, and the
offsets flip sign.

### What the web port should do

- `boardPieces.tsx` `Hand`: keep `battle-hand-draw` but retime to **80 ms
  `cubic-bezier(0.34, 1.56, 0.64, 1)`** and a **70 px** vertical offset — currently
  250 ms `ease-out`, which reads sluggish next to the reference client.
- New in `GameScreen.tsx`: a `<DrawReveal>` portal at board centre, driven by the
  same `useEnterAnimation` bookkeeping. Add `@keyframes battle-draw-reveal`
  (60 ms: `translate(60px, ±40px) scale(0.2) rotate(-60deg) → translate(0,0) scale(0.45) rotate(0)`,
  plus `filter: brightness(0) → brightness(1)`), then
  `@keyframes battle-draw-exit` (140 ms: 70 ms `scaleX(0.06) scaleY(1.4)` +
  desaturate, 70 ms `translateY(-220px)`).
- Opponent draws currently produce no motion at all. Reuse the same component
  with a card-back face — the reference client deliberately shows the opponent's draw in the
  centre of the screen, which is a large part of the "someone is playing against
  me" feel.

### Already covered

`battle-hand-draw` slide for the viewer (`game.css:2053`), `soundEvents.ts` draw hook.

---

## 2. Digivolving / evolution

### the reference client mechanism

Two layers: an optional **full-screen cut-in** (only for Lv6+, Burst, Blast,
Jogress, DigiXros) and then always a **card drop onto the stack**.

- `Effects.cs:621` `DigivolveFieldPermanentCardEffect(target, isBurst, isBlast, isAppFusion)`
- `Effects.cs:502` `CreateFieldPermanentCardEffect(...)` — same drop, used when a
  card enters play fresh
- `EvolutionEffectObject.cs:19` — generic cut-in, `animTime = 1.45 s` (`:13`)
- `JogressEffectObject.cs:18` — `animTime = 1.65 s`, fills 2 root card images
- `DigiXrosEffectObject.cs:18` — `animTime = 2.0 s`, plus `DOShakePosition(0.3 s, strength 16, vibrato 50, fadeOut)` at `:42`
- `BurstEffectObject.cs:26` — `animTime = 2.7 s`
- Clip data: `Assets/Animation/Battle/EvolutionEffectObject/*.anim`

Cut-ins are skippable: `ContinuousController.showCutInAnimation == false` makes
the generic one just `WaitForSeconds(animTime)` and the subclasses `yield break`
(`EvolutionEffectObject.cs:26-34`).

### Cut-in clip timings (`EvolutionEffectObjects.anim`, stop time **0.95 s**)

| Time            | What                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------- |
| 0               | `lightMask` width 0, card panel 900 × 1200 centred, card image alpha 0                              |
| 0 → 0.117 s     | `lightMask` width 0 → **700** (fast horizontal light bar wipe, `inSlope 4000`)                      |
| 0.117 → 0.2 s   | `lightMask` width 700 → **900**, settles                                                            |
| 0.2 → 0.367 s   | card image alpha 0 → **1** (art fades in inside the panel)                                          |
| 0.367 → 0.65 s  | panel explodes toward camera: 900 → 1800 → 3600 → **4800** wide, 1200 → 2400 → 4800 → **6400** tall |
| 0.367 → 0.633 s | text `grid` letter-spacing **4000 → 3000 → 2000 → 1200 → −100** (word slams together)               |
| **0.65 s**      | animation event `PlaySE` → `EvolutionSE_Ultimate` (`EvolutionEffectObject.cs:67`)                   |
| 0.65 → 0.95 s   | hold / fade out                                                                                     |

Sibling clips: `JogressEffectObjects.anim` stop **1.483 s**, `PlaySE` at 1.317 s.
`DigiXrosEffectObjects.anim` stop **1.683 s**, `Shake` + `PlaySlashSE` at **0.05 s**
and **0.483 s**, `PlaySE` at 1.317 s. `BurstEffectObjects.anim` stop **2.65 s**,
event track: `Set_ULTIMATEEVOLUTION` + normal glow at 0, `SetMaterialLightGlow` +
`PlayChangeTextSE` at **0.25 s**, text swaps to `BURST\nEVOLUTION` + normal glow at
**0.467 s**, `PlayLightningSE` at **1.117 s**, `PlaySE` at **2.033 s**.

### Stack drop timings (both digivolve and play)

| Step | What                                                                                                                | Duration           | Easing           |
| ---- | ------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------- |
| 1    | Old top card hidden, temp card built (`Effects.cs:625-665`)                                                         | 1 frame            | —                |
| 2    | `EvolutionSE` (`:645`) / `PlayPokemonSE` (`:525`)                                                                   | —                  | —                |
| 3    | New card starts at **z = −30** (toward camera) and falls to z = 0 (`:669-679`, `:535-545`)                          | **100 ms**         | `Ease.OutBounce` |
| 4    | `NewUnitEffect_OnLand` particle at the ground plane + colour-keyed `*EvolutionEffect` scaled `(4,1,4)` (`:682-727`) | (5 s auto-destroy) | —                |
| 5    | Hold, then real stack card re-shown, temp destroyed (`:737-742`)                                                    | **120 ms**         | —                |
| 5'   | `CreateFieldPermanentCardEffect` variant holds **100 ms** instead (`:608`)                                          | 100 ms             | —                |

The stack itself never animates its digivolution cards — only the new top card
drops in. The old top is simply hidden for one frame and replaced.

### What the web port should do

- `boardPieces.tsx` `PermanentView`: the existing `battle-card-enter` (320 ms) is
  the right idea but the wrong curve. Retime to **100 ms** with a bounce
  keyframe set: `translateZ`-style scale `1.35 → 0.92 → 1.06 → 0.98 → 1`, then a
  **120 ms** settle before the real card is swapped in. Keyed by
  `permanentId:stackLength` — already the case.
- Add `.battle-cutin` overlay in `overlays.tsx`, a fixed full-screen layer with
  `@keyframes battle-cutin` matching the 0.95 s table above:
  0–117 ms light-bar `width: 0 → 78%`, 117–200 ms `→ 100%`, 200–367 ms art
  `opacity: 0 → 1`, 367–650 ms `scale(1) → scale(5.3)` with `opacity → 0`,
  and a text element animating `letter-spacing: 4000px → -100px` over 367–633 ms.
- Gate it: only Lv6+ / Burst / Blast / Jogress / DigiXros, and behind a user
  setting mirroring `showCutInAnimation`.
- Jogress variant: two smaller root-card images inside the panel
  (`JogressEffectObject.cs:24`), total 1.483 s.

### Already covered

`battle-card-enter` + `battle-card-sparkle` keyed by `permanentId:stackLength`
(`game.css:2070`, `:2099`).

---

## 3. Playing a card from hand

### the reference client mechanism

Three chained coroutines (`CardController.cs:1753-1757` for Options/Tamers;
`CardController.cs:1443` for Digimon):

1. `Effects.DeleteHandCardEffectCoroutine` — the hand card collapses
2. `Effects.ShowUseHandCardEffect_PlayCard` — centre-screen reveal
3. `Effects.MoveToExecuteCardEffect` — the card flies to the execute zone
4. (Digimon only) `CreateFieldPermanentCardEffect` — the drop from §2

### Timings

| Step | What                                                                                                                                                                           | Duration   | Easing          | Source                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------- | ---------------------- |
| 1    | `DeleteHandSE`; cost/level/evo-cost badges hidden instantly; sprite nulled                                                                                                     | —          | —               | `Effects.cs:83-127`    |
| 2    | Hand card scales to `0`                                                                                                                                                        | **220 ms** | `Ease.OutCubic` | `Effects.cs:129-137`   |
| 2a   | When scale drops below `0.2` (≈ 60 % in), spawn `DeleteHandCardEffect` particle at the card's screen position                                                                  | —          | —               | `Effects.cs:139-158`   |
| 3    | Hold, destroy the node, re-run `AlignHand`                                                                                                                                     | **70 ms**  | —               | `Effects.cs:168-184`   |
| —    | _(published wait constant for this whole phase: `waitTime_DeleteHandEffect = 0.29 s`)_                                                                                         | 290 ms     | —               | `Effects.cs:69`        |
| 4    | `ShowPlayCardSE`; two sparkle prefabs, one rotated 90° on Y                                                                                                                    | —          | —               | `Effects.cs:1351-1367` |
| 5    | Blank white card at centre, scale 1, `rgba(255,255,255,0.55)`; rotate Y `35° → 0°` (`RotateMode.FastBeyond360`) while alpha → 0                                                | **100 ms** | default         | `Effects.cs:1383-1397` |
| 6    | Real art swapped in, outline set to the card's colour (`DataBase.CardColor_ColorLightDictionary`), tint fades black → visible                                                  | **160 ms** | default         | `Effects.cs:1408-1426` |
| 7    | Hold                                                                                                                                                                           | **160 ms** | —               | `Effects.cs:1436`      |
| 8    | `MoveToExecuteCardEffect`: scale snapped to **0.30** (you) / **0.225** (opponent), rotation `X = 27.7°`, then move to local **(−166, −20)** (you) / **(161, 50.2)** (opponent) | **120 ms** | default         | `Effects.cs:1892-1924` |
| 9    | Overlay hidden, rotation reset, brainstorm/execute panel opens                                                                                                                 | —          | —               | `Effects.cs:1931-1936` |

Total hand→play ≈ **290 + 100 + 160 + 160 + 120 ≈ 830 ms**, before any §2 drop.

### What the web port should do

- `boardPieces.tsx` `Hand`: add `.battle-hand-card-consume` — 220 ms
  `transform: scale(1) → scale(0)` with `cubic-bezier(0.33, 1, 0.68, 1)`, plus a
  sparkle burst fired at ~60 % progress, then 70 ms before the DOM node is
  removed and the hand re-lays out.
- `overlays.tsx`: a `<PlayReveal>` centre panel.
  `@keyframes battle-play-flip` (100 ms, `rotateY(35deg) → rotateY(0)` with
  `opacity: 0.55 → 0` on a white sheet), then `@keyframes battle-play-show`
  (160 ms, `filter: brightness(0) → brightness(1)`), 160 ms hold, then
  `@keyframes battle-play-to-execute` (120 ms, `scale(0.30) rotateX(27.7deg)` and
  translate to the execute-zone anchor). The Y-flip and the X-tilt are the two
  signature the reference client gestures — keep both.
- Both players run this identically; the only difference is the destination
  anchor (bottom-left for you, top-right for the opponent).

### Already covered

Nothing. `OpponentActionFeedView.tsx` reports the play textually; there is no
motion.

---

## 4. Attack declaration and security attack

### 4a. Declaration

`AttackProcess.cs:73` `Attack(...)`, in order:

| Step | What                                                                                                                      | Duration                        | Source                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| 1    | Defender (or, if attacking security, nothing) gets an **orange outline**; the defender's `securityBreakGlass` is hidden   | —                               | `AttackProcess.cs:124-127`                       |
| 1'   | If attacking security instead: the defender's security glass switches to the **blue material** — the stack visibly "arms" | —                               | `AttackProcess.cs:134`                           |
| 2    | Attacker gets the orange outline                                                                                          | —                               | `AttackProcess.cs:138-139`                       |
| 3    | Attacker suspends (`SuspendPermanentsClass.Tap`)                                                                          | 200 ms rotate + **300 ms hold** | `AttackProcess.cs:164`, `CardController.cs:5687` |
| 4    | Target arrow drawn from the attacker frame to the defender frame, or to `SecurityAttackLocalCanvasPosition`               | see below                       | `AttackProcess.cs:172-187`                       |
| 5    | `[On Attack]` effects resolve                                                                                             | —                               | `AttackProcess.cs:197`                           |

**Target arrow** (`TargetArrow.cs:79` `OnTargetArrowCoroutine`):

| Step | What                                                                                   | Duration                                   | Source     |
| ---- | -------------------------------------------------------------------------------------- | ------------------------------------------ | ---------- |
| 0    | `TargetArrowSE`                                                                        | —                                          | `:81`      |
| 1    | Arrow length 0 → full, **twice** (`ShowCount = 2`), each pass `extendTime / ShowCount` | **85 ms per pass** (`extendTime = 0.17 s`) | `:118-137` |
| 2    | After each pass, hold at full length                                                   | **70 ms**                                  | `:150-152` |
| 3    | Final hold                                                                             | **70 ms**                                  | `:155-157` |
| 4    | Arrow then tracks both endpoints every frame until the attack ends                     | continuous                                 | `:168-261` |

So the arrow **shoots out twice** — 85 ms extend, 70 ms hold, 85 ms extend,
70 ms hold, 70 ms — total **380 ms** before it locks on. The tip sits at
`length − 13 px`.

If a blocker is declared, the arrow is torn down over 3 frames and redrawn to the
new defender (`AttackProcess.cs:587-604`).

### 4b. Security check (per checked card)

`CardController.cs:3919` `ISecurityCheck.SecurityCheck()` — loops
`AttackingPermanent.Strike` times (`:3963`).

| Step | What                                                                                                                                                                                                                                                                                                                                   | Duration                            | Source                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| 1    | Security glass set to the blue material                                                                                                                                                                                                                                                                                                | —                                   | `CardController.cs:3998`                                                   |
| 2    | `BreakSecurityEffect`: `SecurityBreakGlass.BreakIenumerator` starts — the glass pane **shatters**: random explosion centre `(±20, ±20, 0)`, `explodeForce 75000`, `explodeRange 500`; after 100 ms shard velocity is _not_ multiplied (security is the exception at `BreakGlass.cs:50`); after a further 150 ms shards freeze and hide | glass ≈ **250 ms**                  | `Effects.cs:1667-1669`, `SecurityBreakGlass.cs:117`, `BreakGlass.cs:38-66` |
| 3    | Hold, then a **blue** colour burst at the glass position, offset `z +15` (you) / `z −30` (opponent), scaled `(5, 1, 5)`                                                                                                                                                                                                                | **60 ms** hold                      | `Effects.cs:1671-1687`                                                     |
| 4    | Hold                                                                                                                                                                                                                                                                                                                                   | **170 ms**                          | `Effects.cs:1689`                                                          |
| 5    | Hold                                                                                                                                                                                                                                                                                                                                   | **100 ms**                          | `CardController.cs:4002`                                                   |
| 6    | `EnterSecurityCardEffect`: `ShowPlayCardSE`, overlay card placed at centre scale `0.05`, then the `EnterSecurity` animator clip runs                                                                                                                                                                                                   | **200 ms** awaited (clip is 233 ms) | `Effects.cs:1793-1841`                                                     |
| 7    | Animator disabled, position/scale frozen at wherever the clip left them; two sparkle prefabs spawned                                                                                                                                                                                                                                   | —                                   | `Effects.cs:1846-1859`                                                     |
| 8    | Hold                                                                                                                                                                                                                                                                                                                                   | **170 ms**                          | `Effects.cs:1864`                                                          |
| 9    | Card added to the execute list                                                                                                                                                                                                                                                                                                         | —                                   | `CardController.cs:4008`                                                   |
| 10a  | **No security effect and not a Digimon**: hold **300 ms**, then `ShrinkUpUseHandCard` (70 ms squash + 70 ms rise)                                                                                                                                                                                                                      | 300 + 140 ms                        | `CardController.cs:4044-4045`                                              |
| 10b  | **Has a security effect**: `MoveToExecuteCardEffect` (120 ms flight, §3 step 8) then the brainstorm panel opens                                                                                                                                                                                                                        | 120 ms                              | `CardController.cs:4050-4051`                                              |
| 10c  | **Security Digimon**: hold **300 ms**, then a full battle                                                                                                                                                                                                                                                                              | 300 ms + battle                     | `CardController.cs:4207-4209`                                              |
| 11   | Card goes to the **trash** (`AddTrashCard`), then `ShrinkUpUseHandCard` if the overlay is still up                                                                                                                                                                                                                                     | 140 ms                              | `CardController.cs:4222-4227`                                              |
| 11'  | If the card is _destroyed_ rather than trashed, `DestroySecurityEffect` shatters the overlay card itself: a `BreakGlass` at scale `(30.1, 30.1, 1)` + colour burst, ≈ 250 ms                                                                                                                                                           | 250 ms                              | `Effects.cs:1948-2027`                                                     |

### `EnterSecurity` clip (`Assets/Animation/Battle/ShowHandCard/YourEnterSecurityCard.anim`, 233 ms)

| Time    | scale    | anchored pos | CardImage RGB         |
| ------- | -------- | ------------ | --------------------- |
| 0       | 0.05     | (0, −100)    | 1, 1, 1 (fully white) |
| 0.117 s | (interp) | (−50, −80)   | 0.8                   |
| 0.233 s | 0.60     | (0, −34)     | 0 (art fully visible) |

`OpponentEnterSecurityCard.anim` is identical except Y goes **101 → 95 → 63**
(it rises from above instead of below). Alpha stays 1 throughout — the reveal is
a **white-out that burns off**, not a fade-in and **not a flip**. The card also
swings left (x → −50) and back to centre, so it arcs.

### What the web port should do

- `boardPieces.tsx` `AttackArrow`: replace the single red SVG arc with the
  double-shot cadence. Animate `stroke-dashoffset` (or the path length)
  0 → full over **85 ms**, hold **70 ms**, reset to 0, repeat, hold **70 ms**,
  then keep it live. Add `.battle-attack-arrow--shot` and
  `@keyframes battle-arrow-extend`.
- `PermanentView`: `.battle-outline-attack` — a solid orange outline applied to
  attacker and defender for the whole attack, not a pulse.
- `boardPieces.tsx` `Pile` (security): add `.battle-security-armed` (blue glass
  tint applied at declaration) and `@keyframes battle-security-shatter` — an
  overlaid grid of ~12 shard divs given randomised
  `translate(...) rotate(...) scale(0)` over **250 ms**, `cubic-bezier(0.32,0,0.67,0)`,
  with the random explosion origin taken from a per-check seed.
- `overlays.tsx` `SecurityOverlay` / `securityFeedback`: retime the reveal to the
  clip above. `@keyframes battle-security-reveal` — **233 ms**:
  `0%: scale(0.05) translate(0, -100px) brightness(6)`,
  `50%: translate(-50px, -80px) brightness(3)`,
  `100%: scale(0.6) translate(0, -34px) brightness(1)`.
  The existing `aegis-flip` (420 ms) is wrong — the reference client does not flip the security
  card. Replace it.
- Sequencing hook in `GameScreen.tsx`: shatter (250 ms) → 60 ms → blue burst →
  170 ms → 100 ms → reveal (233 ms) → 170 ms → branch. Budget roughly
  **1.0 s to reveal**, then **300 ms + 140 ms** to trash for a plain card.
- The checked card ends in the **trash**, always. It only detours through the
  execute zone (bottom-left / top-right anchor) when it has a security effect or
  is a security Digimon.

### Already covered

The whole check now lives in three files: `securityClash.ts` owns the scene model
and the timeline, `SecurityClashView.tsx` draws it (`SecurityClash`,
`SecurityEdgeFlash`, `SecurityBranch`), and `useMatchCues.ts` sequences it onto the
one serial `centerStage` track. Every duration comes from `timings.ts`; the old
`securityFeedback` overlay and its `aegis-flip` keyframe are gone.

Covered: the shield arming and shattering (`Pile`, `shieldShards`), the edge flash,
the 233 ms white-out reveal, the double-shot attack arrow, the DP compare and its
claw, destroy vs. trash, both seats, and the per-check shard seed — `shieldShards`
derives each break's throws from the break's own key, so back-to-back checks do not
shatter into the same frame.

**A card an effect trashes.** `cardsMoved` from `security` to `trash` (with `cardIds`
and `seat`) plays the reference client's `DestroySecurityEffect` once per card: the
shield breaks, the card is revealed centre stage and held (`securityDestroyHold`,
500 ms), the pane cracks over the art through the last of that hold
(`securityDestroyCrack`, 180 ms, `CardCracks` along the shard seams), and the card
breaks into its shards on the outcome beat. The scene is the card alone — no badge,
no caption, no outcome line — because nothing a check prints applies to a card that
was never checked; the accessible name is the one line it keeps.

**A card an effect adds.** `cardsMoved` into `security` carries the `seat` whose
stack grew, and the notice and the shield bounce come from that event rather than
from the count: "place 1 card from your hand as the bottom security card, then trash
your top security card" (BT24-016) leaves the count where it was. The count watcher
is only the fallback for a movement that names no seat.

**The dock.** `securityRevealed` carries two presentation hints, `hasSecurityEffect`
and `isDigimon`. A reveal that says `hasSecurityEffect` no longer plays the
centre-stage scene to its end: the card is shown centre stage for the same hold every
reveal gets (`CLASH_DOCK_AT_MS`, the beat an outcome would start), fades out
(`clashExit`), then slides in at its side dock (`securityBranchIn`, 220 ms) and
**stays there** — the
reference client's brainstorm slot, `CardController.cs:4062-4232`. The effect's
notices read beside it and the decisions it asks for open beside it; the dock ends
only on the matching `securityChecked` (a `securityDockHold` beat, then
`securityBranchOut`), on a newer reveal replacing the track, on cancellation, or at
`securityDockMax`. A docked Digimon that also resolved an effect comes back to the
centre for its battle, which the dock has no attacker to draw against.

A reveal with no hints — an older server, or a replayed history — falls back to the
centre-stage scene that plays itself out, as does a check whose reveal and close
arrive in the same batch.

---

## 5. Suspending / unsuspending

### the reference client mechanism

An Animator integer parameter `Tap` on `FieldPermanentCard`
(`FieldPermanentCard.cs:388-405`, `:416-428`), driving two clips.

| Clip              | From                     | To       | Duration   |
| ----------------- | ------------------------ | -------- | ---------- |
| `Stand_Rest.anim` | `localEulerAngles.z = 0` | **90**   | **200 ms** |
| `Rest_Stand.anim` | `z = 90`                 | **0**    | **200 ms** |
| `IsUnTap.anim`    | `z = 0`                  | 0 (idle) | 200 ms     |

All keys use flat tangents (`inSlope: 0, outSlope: 0`) → **ease-in-out**.

Around the rotation, the game holds:

- `SuspendPermanentsClass.Tap` — after the `OnTappedAnyone` effects,
  `WaitForSeconds(0.3f)` (`CardController.cs:5687`)
- `IUnsuspendPermanents.Unsuspend` — same 300 ms constant
  (`CardController.cs:5698`)

There is a "will untap" pre-highlight: `permanent.ShowUnsuspendEffect()` marks
cards that are about to unsuspend while cut-in effects resolve, then
`WillUntapObject` is switched off (`CardController.cs:5742-5754`).

Opponent-side permanents are additionally parented with a 180° Z flip
(`FieldPermanentCard.cs:334`), so the suspend rotation reads as −90° visually.

### What the web port should do

`boardPieces.tsx` `PermanentView`: `transition: transform 200ms ease-in-out` on
`rotate(90deg)` / `rotate(0deg)` (`rotate(-90deg)` for the opponent side), then
let the caller hold **300 ms** before the next step. Add `.battle-will-unsuspend`
for the pre-highlight.

### Already covered

Nothing timed — rotation is currently instant.

---

## 6. Memory gauge marker

### the reference client mechanism

`MemoryObject.cs:45` `SetMemory()`:

| Step | What                                                                                          | Duration   | Easing          |
| ---- | --------------------------------------------------------------------------------------------- | ---------- | --------------- |
| 1    | Every tab **between** the old and the new value has its `Light` child switched on (`:96-102`) | instant    | —               |
| 2    | The marker (`CurrentMemoryObject`) moves to the target tab's local position (`:113-118`)      | **200 ms** | `Ease.OutCubic` |
| 3    | All tab lights switched off (`:128-134`)                                                      | instant    | —               |

Tabs are numbered −10…+10 and reversed for the non-master client
(`MemoryObject.cs:27-43`).

A **prediction line** shows the pending value while a cost is being previewed:
`ShowMemoryPredictionLine(nextMemory)` clamps to ±10 and draws between the
current and next tab (`MemoryObject.cs:139-176`). It is called on hover/drag from
`CardController.cs:704`, `:711`, `:830` and `TurnStateMachine.cs:2648`, `:2677`,
`:2703`, and cleared at `:1300`, `:1421`, `:3016`.

`SetMemory` is awaited inside the auto-processing loop (`AutoProcessing.cs:697`)
and after cost payment (`Player.cs:1029`, `:1126`) — the game genuinely blocks on
the 200 ms.

### What the web port should do

- `boardPieces.tsx` `MemoryGauge`: marker `transition: left 200ms cubic-bezier(0.33, 1, 0.68, 1)`.
- Add `.battle-memory-tab--lit` applied to every tab in the traversed range for the
  duration of the move — this "sweep" is the readable part of the the reference client gauge and
  is currently missing.
- Add the prediction line: a translucent bar between current and pending value,
  shown on hand-card hover/drag, cleared on cancel.

### Already covered

`battle-marker-pop` + `battle-marker-pulse` (`game.css:1902`, `:1914`).

---

## 7. Turn-change banner

### the reference client mechanism

`ShowTurnPlayerObject.cs`:

| Step | What                                                                                               | Duration    |
| ---- | -------------------------------------------------------------------------------------------------- | ----------- |
| 1    | Text set to `"Your Turn"` or `"Opponent's Turn"`; background colour set (`:20-32`)                 | —           |
| 2    | Object activated, Animator `Close = 0` → in/hold state (`:36`, `:43`)                              | —           |
| 3    | Hold (`:45`)                                                                                       | **300 ms**  |
| 4    | Animator `Close = 1` → out state (`:47`)                                                           | clip-driven |
| 5    | `Off()` sets `isClose = true`; `TurnStateMachine.cs:565` blocks on it before start-of-turn effects | —           |

Colours, straight from `ShowTurnPlayerObject.cs:24` and `:31`:

- Your turn: `rgba(121, 153, 255, 0.871)` — `#7999FF`, alpha `222/255`
- Opponent's turn: `rgba(255, 131, 121, 0.871)` — `#FF8379`, alpha `222/255`

`StartBattleSE` plays just before, at `TurnStateMachine.cs:543`.

### What the web port should do

The current `battle-banner` runs **2.4 s** (`game.css:2165`), which is far longer
than the reference client's ~300 ms hold plus in/out. Retime to roughly **in 160 ms / hold 300 ms
/ out 160 ms ≈ 620 ms** and adopt the two exact colours above. Turn changes
happen constantly; 2.4 s is a visible stall.

### Already covered

`battle-banner` band, `battle-dialog-in` rise (`game.css:2215`).

---

## Cross-cutting notes for the port

1. **Nothing in the reference client tweens a card from one zone rectangle to another.** Zone
   changes are: hide the source node, show a centre-screen overlay, then reveal
   the destination node. This is much easier to build in React than
   FLIP-style zone-to-zone flight, and it is what makes the client legible.
2. **Every wait is a real await.** the reference client's coroutines block the game loop, so the
   animation cadence _is_ the pacing. If the web port fires animations
   fire-and-forget, it will feel rushed even with identical durations. Drive the
   sequence from an async queue in `GameScreen.tsx`.
3. **Colour-keyed bursts are one component.** `Green/Red/Blue/Yellow/Purple/Black/White`
   → a single `.battle-color-burst[data-color]`, reused at: permanent enters play,
   permanent destroyed, security shattered, security card destroyed.
4. **Sound trigger points** are all listed above; `soundEvents.ts` should fire on
   the same beats: `DrawSE` at draw start, `DeleteHandSE` at hand-card collapse
   _and_ at overlay exit, `ShowPlayCardSE` at reveal start, `TargetArrowSE` at
   arrow start, glass-break SE at security shatter, `EvolutionSE` /
   `EvolutionSE_Ultimate` at the cut-in's 0.65 s mark, `StartBattleSE` before the
   turn banner.

## Video evidence

Source: "Jijimon vs Diaboromon", Hoang Zero's the reference client channel —
<https://www.youtube.com/watch?v=mYvQKyb2FI4>. YouTube only served 640 × 360 at
29.97 fps (every higher format demanded a PO token), so the frames are good for
layout, colour, and panel placement but not for card text or sub-100 ms timing.

Video is **secondary**. Where it disagrees with the C# and `.anim` values above,
trust the source: the capture is an automated-simulator build and some overlay
anchors differ from the code read here (notably the security reveal renders at
top-centre in the capture rather than the code's screen-centre `ShowUseHandCard`
position).

Frame root:
`/private/tmp/claude-501/-Users-viniciusluiz-aegis-digimon-tcg/3a445aed-1fae-4179-b939-dae31fb1e18e/scratchpad/research/`

| Folder                                 | Window      | Rate          |
| -------------------------------------- | ----------- | ------------- |
| `sheets/sheet_01.png` … `sheet_08.png` | whole match | 1 frame / 5 s |
| `m1_security/`                         | 03:36–04:00 | 5 fps         |
| `m1b_reveal/`                          | 04:00–04:30 | 5 fps         |
| `m2c_draw/`                            | 04:27–04:39 | 10 fps        |
| `m2b_draw/`                            | 04:46–04:56 | 10 fps        |
| `m3_digivolve/`                        | 04:26–04:46 | 5 fps         |

### Palette and layout confirmed from frames

- Opponent half **blue gradient** (top), player half **orange → red gradient**
  (bottom), black surround with faint green "matrix" digits down both edges.
- Memory gauge is a horizontal strip of numbered hexagon tiles across the
  vertical middle: orange `10…1` left, blue `1…10` right, `0` centre, a **yellow
  glowing pip** on the active value. Phase pill (`MAIN` / `DRAW` / `BREEDING` /
  `UNSUSPEND`) at the far left of the strip. This confirms `MemoryObject.cs`'s
  21-tab model and the per-tab `Light` child.
- Security counter: blue shield badge top-right (opponent), orange bottom-right
  (you).
- Log panels (`Played Card`, `Deleted cards`, `Cards added to hand`,
  `Revealed Cards`) dock **top-right** as a translucent dark-blue rounded rect
  ≈ 175 × 100 px with a red `×`. They appear with no transition (< 100 ms).

### Effect colour vocabulary (worth copying exactly)

| Event         | Look                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Digivolve     | white 4-point cross flare → **cyan** radial ray burst, ~800–1000 ms, entirely _behind_ the card                                                                                                                   |
| Deletion      | **green ring** (~50 px) + large **orange/yellow starburst**, ~600 ms                                                                                                                                              |
| Battle damage | three **red diagonal claw slashes** across the defender, ~300 ms                                                                                                                                                  |
| Card announce | **cyan + white + magenta** starburst, then the card held centred with a **glow halo in the card's colour** (green for a green card), then a thin **white vertical beam** down to the destination slot for ~100 ms |
| Turn banner   | wide **salmon/pink** translucent pill at ~y 12 % height, black bold text, slides right → left, holds, fades — ≈ 500 ms total (close to the ~620 ms the code implies, and far under the current web 2.4 s)         |

### Frames worth opening

- Security attack drop zone: `m1_security/f_056.png` — a rounded pill ≈ 205 × 18 px
  at the top-centre of the opponent's half, translucent dark orange-brown fill,
  1 px bright-orange border. Appears only while an attacker is being dragged.
- Security reveal: `m1b_reveal/f_097.png` (ray burst, no card) → `f_098.png`
  (card scaling up from ~0) → `f_099.png` (full-size card back + black DP plate)
  → `f_102.png` (face-up, swapped **in place** — no flip frame at 5 fps, so the
  turn is ≤ 200 ms and reads as an instant swap, matching the `.anim`'s
  brightness burn-off rather than a rotation) → `f_106.png` (red slashes)
  → `f_108.png` (green ring + orange starburst, `Deleted cards` panel pops in).
- Digivolve: `m1_security/f_093.png` → `f_098.png`. The card **never moves**; art
  and DP swap on the first frame and the stack badge ticks `×2` → `×3`.
- Card announce (face-down): `m2b_draw/f_061.png`, `f_063.png`, `f_066.png`,
  `f_068.png` — card back held dead still at 28 % width × 68 % height.
- Card announce (face-up, green halo): `m2c_draw/SHEET_01.png`.
- Turn banner: `m2c_draw/SHEET_03.png`.
- Hover inspect: `m2c_draw/SHEET_04.png` — full-resolution card fills the right
  ~45 % of the screen, full height, and persists while the pointer rests.
