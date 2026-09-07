import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./BT20-071.js";
import "../BT2/BT2-107.js";
import "./BT20-032.js";
import "./BT20-059.js";
import "./BT20-070.js";
import "./BT20-080.js";
import "../BT14/BT14-087.js";

// A3 for BT20-071 (Soloogarmon — Purple Lv.5 Digimon).
//
// [On Play] / [When Digivolving]: By trashing 1 card in your hand, for the turn, 1 of your
//   Digimon gains ＜Raid＞ and gets +3000 DP.
// [Your Turn][Inherited] This Digimon with the [SoC]/[SEEKERS] trait doesn't activate
//   [Security] effects on Option cards it checks.
//
// FAILS-WHEN-REVERTED: on Soloogarmon [On Play], a controller Digimon's DP increases by 3000,
//   proving the trash-hand-and-grant-raid effect resolved.

// BT20-071 = Soloogarmon (Purple Lv.6, dp 9000, playCost 9)
const SOLOOGARMON = "BT20-071";
// BT20-032 = Bulkmon (Lv.4, SEEKERS trait — base to digivolve Soloogarmon onto)
const BULKMON = "BT20-032";
// BT1-010 Agumon — cheap filler for hand trash
const AGUMON = "BT1-010";
// BT1-001 Koromon — a Digimon to grant Raid+3000 to
const KOROMON = "BT20-010";

describe("BT20-071 Soloogarmon — [When Digivolving] grants Raid and +3000 DP", () => {
  it("compiles the hand cost, Tamer-stack trigger, and inherited Option suppression", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Trash", target: { filter: { zone: "hand" }, count: 1 }, optional: true, abortOnDecline: true },
      { kind: "ModifyDP", amount: 3000 },
      { kind: "GainKeyword", keyword: { keyword: "Raid" } },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: { kind: ["Tamer"] },
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "DisableSecurityEffect", sourceKind: "option", condition: { kind: "selfHasTrait" } }],
    });
  });

  it("[When Digivolving] by trashing 1 hand card, a Digimon gets +3000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Bulkmon on the battle area (will digivolve into Soloogarmon).
            { card: BULKMON, dp: 4000, as: "bulkmonPerm" },
            // Another Digimon (Koromon) that may receive Raid + DP boost.
            { card: KOROMON, dp: 1000, as: "koromonPerm" },
          ],
          hand: [
            // Soloogarmon in hand to digivolve into.
            { card: SOLOOGARMON, as: "soloogarmonInst" },
            // A hand card to trash as cost (Agumon).
            { card: AGUMON, as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const bulkmonPerm = s.perm("bulkmonPerm");
    const soloogarmonInst = s.inst("soloogarmonInst");
    const koromonPerm = s.perm("koromonPerm");

    // Use enough memory to pay the printed 4-cost red/yellow evolution.
    s.state.memory = 4;

    // Record initial DPs for all own Digimon (the effect picks the first candidate).
    const initialBulkmonDP = bulkmonPerm.currentDP;
    const initialKoromonDP = koromonPerm.currentDP;

    // Digivolve Bulkmon → Soloogarmon.
    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: bulkmonPerm.permanentId,
      instanceId: soloogarmonInst.instanceId,
    });

    expect(res.ok).toBe(true);

    // The [When Digivolving] effect fires: player accepts trashing a hand card
    // (hooks accept=true for optional, first candidate for selectCards).
    // Then the auto-respond hook picks the first Digimon candidate for the +3000 DP grant.
    // The effect targets whichever Digimon appears first in battleArea; either Koromon or
    // the evolved permanent (now Soloogarmon) gets the buff.
    await settle(() => bulkmonPerm.currentDP !== initialBulkmonDP || koromonPerm.currentDP !== initialKoromonDP, 600);

    // One of the two Digimon should have received the +3000 DP grant.
    const anyBoosted = bulkmonPerm.currentDP > initialBulkmonDP || koromonPerm.currentDP > initialKoromonDP;
    expect(anyBoosted).toBe(true);
    const boosted = bulkmonPerm.currentDP > initialBulkmonDP ? bulkmonPerm : koromonPerm;
    expect(observe(s.engine).hasKeyword(boosted, "Raid")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("does not grant Raid or DP when the optional By-trashing condition is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BULKMON, as: "base" },
            { card: KOROMON, dp: 1000, as: "ally" },
          ],
          hand: [
            { card: SOLOOGARMON, as: "soloogarmon" },
            { card: AGUMON, as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const base = s.perm("base");
    const ally = s.perm("ally");
    const initialDP = ally.currentDP;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: s.inst("soloogarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => base.topCard.cardId === SOLOOGARMON);
    expect(ally.currentDP).toBe(initialDP);
    expect(observe(s.engine).hasKeyword(ally, "Raid")).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("cost").instanceId);
  });

  it("publishes stats and both exact cost-3 alternate evolution routes", async () => {
    expect(getCardDefinition("BT20-071")).toMatchObject({ level: 5, playCost: 7, dp: 7000 });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Loogarmon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["SEEKERS"], cost: 3, isAlternate: true },
    ]);
    for (const [base, requirementIndex] of [
      ["BT20-070", 0],
      ["BT20-032", 1],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT20-071", as: "soloogarmon" }],
          deck: ["BT20-047"],
        },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("soloogarmon").instanceId,
          alternateRequirementIndex: requirementIndex,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT20-071");
      expect(s.state.memory).toBe(0);
    }
  });

  it("deletes only a 6000-DP-or-less opponent when a Tamer is placed under itself", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-071", as: "source" }],
          hand: [
            { card: "BT20-089", as: "tamer" },
            { card: "BT20-047", as: "digimon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-070", dp: 6000, as: "six" },
            { card: "BT20-071", dp: 7000, as: "seven" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("six").permanentId);
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("source").permanentId, [s.inst("tamer").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-071"]);
    await advance(s.engine).verb.placeUnder(s.perm("source").permanentId, [s.inst("digimon").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("inherits Option Security suppression only for a SoC/SEEKERS host on its controller's turn", async () => {
    for (const [host, expected] of [
      ["BT20-080", true],
      ["BT20-059", false],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: host, under: ["BT20-071"], as: "host" }] } });
      s.state.turnSeat = 0;
      await s.ready();
      expect(observe(s.engine).suppressesSecurityEffect(s.perm("host"), "BT20-096")).toBe(expected);
      s.state.turnSeat = 1;
      await advance(s.engine).recompute();
      expect(observe(s.engine).suppressesSecurityEffect(s.perm("host"), "BT20-096")).toBe(false);
    }
  });

  it("publicly triggers the Tamer-in-source deletion through Eiji's Mind Link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-071", as: "soloogarmon" },
            { card: "BT14-087", as: "eiji" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 6000, as: "eligible" },
            { card: "BT20-010", dp: 6001, as: "retained" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const eiji = s.perm("eiji");
    const sourceInstanceId = eiji.topCard.instanceId;
    const entry = observe(s.engine)
      .activatableEffects(eiji)
      .find((effect) => effect.instanceId === sourceInstanceId);
    expect(entry, "BT14-087 exposes its public Mind Link activation").toBeDefined();
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: entry!.effectKey })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-010"]);
    expect(s.perm("retained").topCard.cardId).toBe("BT20-010");
    expect(s.perm("retained").currentDP).toBe(6001);
    expect(s.perm("soloogarmon").stack.some((card) => card.instanceId === sourceInstanceId)).toBe(true);
  });

  it("actually suppresses an Option security effect only for the qualifying inherited host", async () => {
    for (const [host, expectedMemory] of [
      ["BT20-080", 0],
      ["BT20-059", -2],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: host, under: ["BT20-071"], as: "host" }] },
        1: { security: [{ card: "BT2-107", as: "optionSecurity" }] },
      });
      s.state.memory = 0;
      s.state.turnSeat = 0;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.events.some((event) => event.kind === "securityChecked" && event.revealedCardId === "BT2-107"),
      );
      expect(s.state.memory).toBe(expectedMemory);
      expect(s.state.players[1]!.security).toHaveLength(0);
    }
  });
});
