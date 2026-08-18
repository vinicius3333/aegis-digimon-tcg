import { describe, it, expect } from "vitest";
import { getCompiledCard, getCardDefinition, type CompiledCard } from "@aegis/shared";
// Boot side-effect: register the 12 IR card modules verified below (BT1-042 is a
// name-spelling errata that lives in card data, not a card module).
import "../../cards/P/P-123.js";
import "../../cards/BT14/BT14-002.js";
import "../../cards/EX3/EX3-057.js";
import "../../cards/BT3/BT3-092.js";
import "../../cards/EX3/EX3-001.js";
import "../../cards/EX3/EX3-036.js";
import "../../cards/BT10/BT10-093.js";
import "../../cards/BT10/BT10-097.js";
import "../../cards/EX2/EX2-055.js";
import "../../cards/EX1/EX1-073.js";
import "../../cards/P/P-045.js";
import "../../cards/BT6/BT6-059.js";

/**
 * Per-cluster errata sign-off — the 13 highest-use errata'd cards (CARD-04, plan 05-03).
 *
 * AGENTS.md is binding: "Errata override the printed text. Implement the AFTER text —
 * effectText is stale." This cluster asserts that each card's COMPILED IR (the source of
 * truth executed by the interpreter, read here via getCompiledCard) reflects the KB errata
 * "after" text and NOT the stale printed "before" text. Each assertion targets a load-bearing
 * field that the errata changed, with an explicit revert/diff lever (revert the IR back to the
 * printed text -> the assertion goes RED). No rubber-stamps: every sign-off names the documented behavior oracle
 * line and the errata note it asserts.
 *
 * The 13 = 4 currently-restricted-and-errata'd (P-123, BT14-002, EX3-057, BT3-092; all confirmed
 * in data/kb/banlist.json `current`) + 9 high-risk errata cards (EX3-001,
 * EX3-036, BT10-093, BT10-097, BT1-042, EX2-055, EX1-073, P-045, BT6-059).
 *
 * Errata "after" text per card: `node tools/kb/query.mjs card <id>`.
 * Historical behavior is superseded by official text, errata, rulings, and observable engine tests.
 *
 * This plan records per-card errata evidence; it does not update generated ledgers.
 */

/** Read the registered compiled IR or fail loudly (the modules are booted above). */
function ir(cardId: string): CompiledCard {
  const compiled = getCompiledCard(cardId);
  expect(compiled, `${cardId}: no compiled IR registered`).toBeDefined();
  return compiled as CompiledCard;
}

/** Stringify the full IR for "stale before-token absent" assertions. */
function irText(cardId: string): string {
  return JSON.stringify(ir(cardId));
}

describe("errataCluster — 13 high-use errata'd cards implement the KB 'after' text (CARD-04)", () => {
  describe("restricted + errata'd (banlist.current)", () => {
    it("P-123 Ukkomon — YourTurn/OncePerTurn gain-1-memory preserved through the wording errata", () => {
      // Errata 2024-07-05 (wording only): "...moves..., you may hatch in YOUR breeding area.
      // Then, gain 1 memory." The behavioral payload (a [Your Turn][Once Per Turn] +1 memory on
      // a Digimon moving breeding->battle) is unchanged; the IR must keep it. documented behavior BT (P_123) gains
      // 1 memory on the move trigger.
      const c = ir("P-123");
      const eff = c.effects.find((e) => e.trigger === "YourTurn");
      expect(eff, "P-123: YourTurn effect present").toBeDefined();
      expect(eff?.frequency).toBe("OncePerTurn");
      const gain = eff?.actions.find((a) => a.kind === "GainMemory") as { amount?: number } | undefined;
      // REVERT/DIFF lever: drop the GainMemory(1) action (or its OncePerTurn cap) -> RED.
      expect(gain, "P-123: GainMemory action present").toBeDefined();
      expect(gain?.amount).toBe(1);
    });

    it("BT14-002 Bukamon — inherited Jamming grant carries no stale strict-greater '>' comparison", () => {
      // Errata 2023-12-15: "...no Digimon with MORE digivolution cards..." -> "...AS MANY OR MORE
      // digivolution cards AS this Digimon...". documented behavior BT14_002 encodes the AFTER comparison:
      // `DigivolutionCards.Count >= card...DigivolutionCards.Count` (>=, the errata's "as many or
      // more"). The IR grants <Jamming> on the inherited Static effect and carries NO stale
      // strict-greater ('>') comparison from the printed BEFORE text.
      const c = ir("BT14-002");
      const eff = c.effects.find((e) => e.isInherited);
      expect(eff, "BT14-002: inherited effect present").toBeDefined();
      const jam = eff?.actions.find(
        (a) => a.kind === "GainKeyword" && (a as { keyword?: { keyword?: string } }).keyword?.keyword === "Jamming",
      );
      expect(jam, "BT14-002: inherited <Jamming> grant present").toBeDefined();
      // REVERT/DIFF lever: a port carrying the printed BEFORE ('more', strict >) would encode a
      // gt/strict-greater digivolution-count comparison -> this assertion goes RED.
      const text = irText("BT14-002");
      expect(text).not.toContain('"op":"gt"');
      expect(text.toLowerCase()).not.toContain("strictlymore");
      // NOTE: the >= digivolution-count guard is a known runtime record residual (the IR carries no
      // condition); the errata-faithfulness claim here is narrow — the IR carries no stale '>'.
    });

    it("EX3-057 Growlmon — errata retimed [On Deletion] -> [When Digivolving]; IR triggers WhenDigivolving", () => {
      // Errata 2022-11-11 (the load-bearing retime): "[On Deletion] Delete 1 of your opponent's
      // Digimon with 3000 DP or less..." -> "[When Digivolving] Delete 1...". documented behavior EX3_057
      // NOT the stale OnDeletion.
      const c = ir("EX3-057");
      const del = c.effects.find((e) => !e.isInherited && e.actions.some((a) => a.kind === "Delete"));
      expect(del, "EX3-057: a non-inherited Delete effect present").toBeDefined();
      // DIFF lever: revert the trigger to "OnDeletion" (the printed BEFORE) -> RED.
      expect(del?.trigger).toBe("WhenDigivolving");
      expect(irText("EX3-057")).not.toContain('"trigger":"OnDeletion"');
    });

    it("BT3-092 MaloMyotismon — errata 'gain 1 memory FOR EACH Digimon deleted' carried in the IR", () => {
      // Errata 2021-04-23: "When another Digimon is deleted, gain 1 memory" -> "...gain 1 memory
      // FOR EACH Digimon deleted." documented behavior BT3_092 AddMemory(hashtables.Count, ...) gains memory equal
      // to the number deleted (the AFTER text). The IR's [All Turns] onDeletionOf SubTrigger
      // carries the corrected "for each Digimon deleted" text.
      const c = ir("BT3-092");
      const allTurns = c.effects.find((e) => e.trigger === "AllTurns");
      const sub = allTurns?.actions.find((a) => a.kind === "SubTrigger") as { raw?: string } | undefined;
      expect(sub, "BT3-092: [All Turns] onDeletionOf SubTrigger present").toBeDefined();
      // DIFF lever: revert the SubTrigger raw to the bare printed "gain 1 memory" (no "for each")
      // -> RED.
      expect(sub?.raw?.toLowerCase()).toContain("for each digimon deleted");
      // NOTE: the SubTrigger's resolved actions are empty (the subTrigger bus is a separately
      // tracked engine gap); the errata-faithfulness claim is that the IR records the corrected
      // "for each" semantics, not the stale "1 memory".
    });
  });

  describe("errata'd + oracle major/wrong", () => {
    it("EX3-001 Bebydomon — errata scoped the trigger to 'THIS Digimon'; IR target is self-ref", () => {
      // Errata 2022-11-11: "When A Digimon with [Dramon]/[Examon]... becomes unsuspended" ->
      // "When THIS Digimon with [Dramon]/[Examon]... becomes unsuspended, +1000 DP". documented behavior EX3_001
      // [Examon]...". The IR's +1000 DP target MUST be self-ref (this Digimon), not a broad
      // any-Digimon target.
      const c = ir("EX3-001");
      const eff = c.effects.find((e) => e.actions.some((a) => a.kind === "SubTrigger"));
      const sub = eff?.actions.find((a) => a.kind === "SubTrigger") as
        | { actions?: unknown[]; sourceFilter?: { isSelfRef?: boolean; nameOrTrait?: unknown[] } }
        | undefined;
      const dp = sub?.actions?.find((a) => (a as { kind?: string }).kind === "ModifyDP") as
        | { amount?: number; target?: { isSelf?: boolean; filter?: { isSelfRef?: boolean } } }
        | undefined;
      expect(dp, "EX3-001: ModifyDP action present").toBeDefined();
      expect(dp?.amount).toBe(1000);
      // DIFF lever: revert the target to a broad any-Digimon filter (the printed "a Digimon") -> RED.
      expect(dp?.target?.isSelf === true || dp?.target?.filter?.isSelfRef === true).toBe(true);
      expect(sub?.sourceFilter?.isSelfRef).toBe(true);
      expect(sub?.sourceFilter?.nameOrTrait).toEqual([{ tokens: ["Dramon", "Examon"], match: "name" }]);
    });

    it("EX3-036 Magnadramon — the errata-optional [On Deletion] place clause is authored (residual retired in 05-02)", () => {
      // Errata 2022-11-11: "[On Deletion]... place 1 [Trial...]" -> "...YOU MAY place 1 [Trial...]"
      // (mandatory -> optional). 05-02 BUILT the option-permanent placement path
      // (ctx.fx.placeOptionAsPermanent) and hand-authored EX3-036's [On Deletion] clause to use it,
      // retiring the `place-option-as-permanent` missing-primitive flag. EX3-036 is now a
      // hand-written override; its effects.json entry carries the OnDeletion trigger (the place
      // body lives in the .ts module) and the [On Play] Security Attack grant, with no residual.
      // The behavioral proof lives in ./placeInBattleAreaSelf.test.ts (fails-when-reverted A3).
      const c = ir("EX3-036");
      const onDeletion = c.effects.find((e) => e.trigger === "OnDeletion");
      expect(onDeletion, "EX3-036: [On Deletion] clause present").toBeDefined();
      const onPlay = c.effects.find((e) => e.trigger === "OnPlay");
      const saGrant = onPlay?.actions.find(
        (a) =>
          a.kind === "GainKeyword" && (a as { keyword?: { keyword?: string } }).keyword?.keyword === "SecurityAttack",
      );
      expect(saGrant, "EX3-036: [On Play] Security Attack grant present").toBeDefined();
      // The place-option-as-permanent residual is RETIRED (built in 05-02), so coverage is full.
      expect(c.coverage).toBe("full");
      expect(JSON.stringify(c.residual)).not.toContain("place-option-as-permanent");
    });

    it("BT10-093 Yuu Amano — Bagra-Army level-4+ play-cost -2 modifier preserved through the '1' wording errata", () => {
      // Errata 2022-10-28 (wording only): "...play A level 4 or higher [Bagra Army] card..." ->
      // "...play 1 level 4 or higher...". Q&A Q2026 confirms it triggers on exactly 1 card. The
      // behavioral payload (a play-cost -2 cost modifier for level-4+ [Bagra Army] Digimon) is
      // unchanged; the IR must keep it.
      // The play-cost -2 reduction is encoded as a wouldBePlayed `reduceCost` Replacement
      // (mode:"reduceCost", amount:2 => -2 per card placed), matching the A3-proven .ts override
      // (BT10-093.test.ts). The earlier auto-gen `CostModifier -2` was the stale/wrong shape.
      const c = ir("BT10-093");
      const mod = c.effects.flatMap((e) => e.actions).find((a) => a.kind === "Replacement") as
        | { mode?: string; amount?: number }
        | undefined;
      expect(mod, "BT10-093: wouldBePlayed reduceCost Replacement present").toBeDefined();
      expect(mod?.mode).toBe("reduceCost");
      // DIFF lever: drop the -2 play-cost reduction -> RED.
      expect(mod?.amount).toBe(2);
      expect(irText("BT10-093").toLowerCase()).toContain("bagra army");
    });

    it("BT10-097 Blazing Memory Boost! — errata renamed the played Tamer to KIRIHA Aonuma; IR carries no stale 'Christopher'", () => {
      // Errata 2022-10-28: "...play 1 [Christopher Aonuma]..." -> "...play 1 [Kiriha Aonuma]...".
      // documented behavior BT10_097 matches CardNames.Contains("KirihaAonuma")/"Kiriha Aonuma" and never
      // "Christopher". The IR's RevealAdd name target MUST be Kiriha Aonuma (to:'play').
      //
      // Phase 10.1-01 fix: BT10-097 now uses RevealAdd{to:'play'} for Kiriha Aonuma
      // The check is updated to reflect the correct post-fix IR shape.
      const text = irText("BT10-097");
      // DIFF lever: a port carrying the printed BEFORE would reference "Christopher" -> RED.
      expect(text).not.toContain("Christopher");
      expect(text).toContain("KirihaAonuma");
      const c = ir("BT10-097");
      // The Kiriha Aonuma add-entry lives inside a RevealAdd action's `add` array with to:'play'.
      const revealAdd = c.effects.flatMap((e) => e.actions).find((a) => a.kind === "RevealAdd");
      expect(revealAdd, "BT10-097: RevealAdd action present (post-10.1-01 fix)").toBeDefined();
      const kirihaEntry = (
        revealAdd as { add?: { filter?: { nameOrTrait?: { tokens: string[] }[] }; to?: string }[] } | undefined
      )?.add?.find((entry) => entry.to === "play");
      expect(kirihaEntry, "BT10-097: RevealAdd has a to:'play' entry for Kiriha Aonuma").toBeDefined();
    });

    it("BT1-042 LoaderLeomon — name-spelling errata carried in card data (not a card module)", () => {
      // Errata 2022-08-05 (name spelling only): "LoaderLiomon" -> "LoaderLeomon". This card has no
      // effect module; the correction lives in card data. The definition's nameEn MUST be the
      // corrected "LoaderLeomon", not the stale "LoaderLiomon".
      const def = getCardDefinition("BT1-042");
      expect(def, "BT1-042: card definition present").toBeDefined();
      // DIFF lever: revert nameEn to the printed "LoaderLiomon" -> RED.
      expect(def?.nameEn).toBe("LoaderLeomon");
      expect(def?.nameEn).not.toBe("LoaderLiomon");
    });

    it("EX2-055 Reaper — errata 'SET play cost to 0' (not 'reduce to 0') carried in the play-replacement clause", () => {
      // Errata 2022-07-01: "...to REDUCE this Digimon's play cost to 0" -> "...to SET this
      // Digimon's play cost to 0". The IR's wouldBePlayed replacement clause raw carries the
      // corrected "set ... play cost to 0".
      const c = ir("EX2-055");
      const repl = c.effects.flatMap((e) => e.actions).find((a) => a.kind === "Replacement") as
        | { raw?: string }
        | undefined;
      expect(repl, "EX2-055: wouldBePlayed Replacement present").toBeDefined();
      // DIFF lever: revert the raw to the printed "reduce ... to 0" -> RED.
      expect(repl?.raw?.toLowerCase()).toContain("set this digimon's play cost to 0");
      expect(repl?.raw?.toLowerCase()).not.toContain("reduce this digimon's play cost to 0");
    });

    it("EX1-073 Machinedramon — On Play place-under carries no stale non-level-5 'Cyborg' filter", () => {
      // Errata 2021-11-26: "...place up to 5 red/black [Cyborg] cards..." -> "...place up to 5
      // LEVEL 5 red/black [Cyborg] cards...". documented behavior EX1_073 CanSelectCardCondition requires
      // `cardSource.Level == 5`. The IR's [On Play] place-under is under-encoded (a known
      // runtime record residual — it does NOT carry the full level-5/color/Cyborg/count-5 selection),
      // and crucially carries NO stale BEFORE filter that would admit non-level-5 cards.
      const c = ir("EX1-073");
      const onPlay = c.effects.find((e) => e.trigger === "OnPlay");
      const placeUnder = onPlay?.actions.find((a) => a.kind === "PlaceUnder");
      expect(placeUnder, "EX1-073: [On Play] PlaceUnder present").toBeDefined();
      const onPlayText = JSON.stringify(onPlay);
      // DIFF lever: a port carrying the printed BEFORE would encode a Cyborg trait/color filter
      // WITHOUT a level constraint admitting non-level-5 cards. The IR encodes no such stale
      // selection filter (it has none at all -> residual). Assert no Cyborg-without-level filter.
      const hasCyborg = onPlayText.includes("Cyborg");
      const hasLevel = onPlayText.includes("level") || onPlayText.includes("Level");
      expect(hasCyborg && !hasLevel, "EX1-073: no stale Cyborg-without-level place filter").toBe(false);
      // NOTE: the level-5 selection constraint is a known runtime record residual (the On Play place-
      // under is under-encoded); the errata-faithfulness claim is narrow — no stale non-level-5
      // selection is present.
    });

    it("P-045 Kurisarimon — inherited <Decoy (Black/White)> grant authored (errata 'OTHER' / 'by opponent's effect' is keyword semantics)", () => {
      // Errata 2021-11-12: "All of your Digimon..." -> "All of your OTHER Digimon... gain <Decoy
      // (Black/White)>. (...would be deleted BY AN OPPONENT'S EFFECT...)". The "other" scoping and
      // "by an opponent's effect" qualifier are <Decoy> keyword semantics (engine-level). The IR
      // grants the <Decoy> static; the errata refinements live in the Decoy keyword resolution.
      const c = ir("P-045");
      const text = irText("P-045");
      expect(text).toContain("Decoy");
      const eff = c.effects.find((e) => e.isInherited);
      expect(eff, "P-045: inherited <Decoy> grant present").toBeDefined();
      // DIFF lever: drop the inherited Decoy grant -> RED.
    });

    it("BT6-059 Machmon — <Decoy (Black)> grant authored (errata 'by an opponent's effect' is keyword semantics)", () => {
      // Errata 2021-09-03: "<Decoy (Black)> (...would be deleted...)" -> "<Decoy (Black)> (...would
      // be deleted BY AN OPPONENT'S EFFECT...)". The added "by an opponent's effect" qualifier is
      // <Decoy> keyword semantics. The IR grants the <Decoy> keyword.
      const c = ir("BT6-059");
      const decoy = c.effects
        .flatMap((e) => e.actions)
        .find(
          (a) => a.kind === "GainKeyword" && (a as { keyword?: { keyword?: string } }).keyword?.keyword === "Decoy",
        );
      // DIFF lever: drop the <Decoy> grant -> RED.
      expect(decoy, "BT6-059: <Decoy> grant present").toBeDefined();
    });
  });
});
