import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-073.js";
// Boot side-effect: self-register every compiled-IR card module (so EX10-073's real IR loads).
import "../index.js";

function primitivesOf(s: { engine: unknown }): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

const COST3 = "BT1-010"; // a real cost-3 Digimon
const COST5 = "AD1-001"; // a real cost-5 Digimon

describe("A3 EX10-073 — whenLinkTrashed consumer: delete opponent's lowest-play-cost Digimon", () => {
  it("records the exact catalog, App Fusion, keyword, and two-zone Link contracts", () => {
    expect(getCardDefinition("EX10-073")).toMatchObject({
      nameEn: "Deusmon",
      colors: ["Black", "White"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 5 }],
      forms: ["God", "Appmon"],
      attributes: ["God"],
      types: ["Omnipotence", "Leviathan"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Warudamon", "Cometmon"], cost: 0 }]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static" && effect.keywords?.length)?.keywords).toEqual(
      [{ keyword: "Link", amount: 1, raw: "＜Link +1＞" }],
    );
    // ＜Security A. +1＞ carries its printed magnitude. `securityStrikeCount` reads `amount ?? 1`,
    // so a wrong POSITIVE value (2, 3) changes the security-check count; this pins it to the
    // printed +1 rather than leaving the engine default to stand in for the printed text.
    expect(
      compiled.effects.find((effect) => effect.trigger === "Static" && effect.actions.length > 0)?.actions[0],
    ).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "permanent",
      target: { isSelf: true, filter: { isSelfRef: true } },
    });
    for (const trigger of ["WhenDigivolving", "EndOfOpponentsTurn"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)!.actions;
      expect(actions).toMatchObject([{ from: ["hand"] }, { from: ["digivolutionCards"] }]);
      for (const action of actions) {
        expect(action).toMatchObject({
          kind: "Link",
          payCost: false,
          optional: true,
          target: { filter: { hasLinkRequirement: true } },
          recipient: { filter: { isSelfRef: true }, isSelf: true },
        });
      }
      expect(JSON.stringify(actions[0])).not.toContain("hostFilter");
      expect(JSON.stringify(actions[1])).toContain('"hostFilter":{"isSelfRef":true}');
    }
  });

  it("Q5396 links one legal card from hand and one legal source only to Deusmon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-073", as: "deusmon", under: [{ card: "BT24-036", as: "sourceLink" }] },
            { card: "BT21-009", as: "neighbor" },
          ],
          hand: [
            { card: "BT26-010", as: "handLink" },
            { card: "BT1-009", as: "noLink" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("noLink").instanceId, s.inst("handLink").instanceId, s.inst("sourceLink").instanceId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("deusmon"));
    expect(new Set(s.perm("deusmon").linked.map(({ instanceId }) => instanceId))).toEqual(
      new Set([s.inst("handLink").instanceId, s.inst("sourceLink").instanceId]),
    );
    expect(s.perm("neighbor").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("noLink").instanceId);
  });

  it("[App Fusion] [Warudamon] & [Cometmon]: Cost 0 fuses from hand onto the linked pair", async () => {
    // The printed header needs BOTH names covered by the fusing permanent's top card and its
    // link cards. Warudamon on top, Cometmon linked => cost 0 and Deusmon takes the top slot.
    // FAILS-WHEN-REVERTED: change either name or the cost in `appFusionRequirement` and
    // `appFusionCostFor` returns undefined, so `appFuseInto` refuses and returns undefined.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-019", as: "warudamon", linked: [{ card: "EX10-030", as: "cometmon" }] }],
          hand: [{ card: "EX10-073", as: "deusmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    const fused = await advance(s.engine).verb.appFuseInto(
      s.perm("warudamon").permanentId,
      s.inst("deusmon").instanceId,
    );
    await settle(() => s.perm("warudamon").topCard.cardId === "EX10-073");

    expect(fused).toBeDefined();
    expect(s.perm("warudamon").topCard.cardId).toBe("EX10-073");
    expect(s.perm("warudamon").stack.map(({ cardId }) => cardId)).toEqual(["EX10-019", "EX10-030"]);
    expect(s.perm("warudamon").linked).toHaveLength(0);
    // Cost 0: no memory was spent. CR 8-4-3-3: the fusion procedure itself draws 1.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("[App Fusion] refuses when only one of the two required names is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-019", as: "warudamon" }],
          hand: [{ card: "EX10-073", as: "deusmon" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const fused = await advance(s.engine).verb.appFuseInto(
      s.perm("warudamon").permanentId,
      s.inst("deusmon").instanceId,
    );

    expect(fused).toBeUndefined();
    expect(s.perm("warudamon").topCard.cardId).toBe("EX10-019");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX10-073"]);
  });

  it("[End of Opponent's Turn] runs the same two-zone link clause as [When Digivolving]", async () => {
    // Deusmon sits on seat 1, so seat 0's turn IS "the opponent's turn" for it and
    // `turnOwnerGuard("EndOfOpponentsTurn")` passes.
    // FAILS-WHEN-REVERTED: drop the EndOfOpponentsTurn twin (the printed clause carries BOTH
    // timings) and nothing links in this window.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        1: {
          battleArea: [
            { card: "EX10-073", as: "deusmon", under: [{ card: "BT24-036", as: "sourceLink" }] },
            { card: "BT21-009", as: "neighbor" },
          ],
          hand: [
            { card: "BT26-010", as: "handLink" },
            { card: "BT1-009", as: "noLink" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("noLink").instanceId, s.inst("handLink").instanceId, s.inst("sourceLink").instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("deusmon"));
    await settle(() => s.perm("deusmon").linked.length === 2, 200);

    expect(new Set(s.perm("deusmon").linked.map(({ instanceId }) => instanceId))).toEqual(
      new Set([s.inst("handLink").instanceId, s.inst("sourceLink").instanceId]),
    );
    expect(s.perm("neighbor").linked).toHaveLength(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("noLink").instanceId);
  });

  it("grants itself ＜Security A. +1＞ as a live continuous grant carrying the printed +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX10-073", as: "deusmon" }] } });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    // FAILS-WHEN-REVERTED: drop `amount: 1` from the SecurityAttack keyword and the ledger grant
    // carries no amount, so this reads 0 (`observe.keywordAmount` sums `grant.amount ?? 0`).
    expect(observe(s.engine).keywordAmount(s.perm("deusmon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("deusmon"), "SecurityAttack")).toBe(true);
  });

  it("takes the second link ONLY from its own digivolution stack, never another Digimon's", async () => {
    // Two friendly Digimon each carry a ＜Link＞-capable card in their digivolution stack. The
    // printed clause is "from THIS Digimon's digivolution cards", encoded as
    // `hostFilter: { isSelfRef: true }` on the `from: ["digivolutionCards"]` Link.
    // FAILS-WHEN-REVERTED: drop the hostFilter => `candidateLooseInstances` pools every
    // permanent's stack, `preferInstanceIds` steers the auto-selection to the NEIGHBOUR's card,
    // and both assertions below go red.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-073", as: "deusmon", under: [{ card: "BT21-009", as: "ownSource" }] },
            { card: "BT1-009", as: "neighbor", under: [{ card: "BT21-041", as: "foreignSource" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("foreignSource").instanceId, s.inst("ownSource").instanceId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("deusmon"));

    expect(s.perm("deusmon").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("ownSource").instanceId]);
    expect(s.perm("neighbor").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("foreignSource").instanceId);
  });

  it("[Once Per Turn]: a second link-card trash in the same turn deletes nothing more", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-073",
              dp: 12000,
              as: "deusmon",
              linked: [
                { card: "BT1-009", as: "linkA" },
                { card: "BT1-010", as: "linkB" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: COST3, dp: 3000, as: "oppLow" },
            { card: COST5, dp: 7000, as: "oppHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const oppLowId = s.perm("oppLow").permanentId;
    const oppHighId = s.perm("oppHigh").permanentId;
    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).trash([s.inst("linkA").instanceId]);
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === oppLowId) === undefined, 200);
    await primitivesOf(s).trash([s.inst("linkB").instanceId]);
    await settle(() => false, 60);

    // FAILS-WHEN-REVERTED: drop `frequency: "OncePerTurn"` => the second trash fires the watcher
    // again and the (now lowest-cost) cost-5 Digimon is deleted too.
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppLowId)).toBeUndefined();
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppHighId)).toBeDefined();
  });

  it("trashing THIS Digimon's link card deletes ONLY the opponent's lowest-cost Digimon (cost-3 over cost-5)", async () => {
    // EX10-073 Deusmon on the controller's field, carrying a LINK card (the genuine link-trash
    // subject). The opponent has a cost-3 and a cost-5 Digimon.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-073", dp: 12000, as: "deusmon", linked: [{ card: "BT1-009", as: "linkCard" }] }],
        },
        1: {
          battleArea: [
            { card: COST3, dp: 3000, as: "oppLow" },
            { card: COST5, dp: 7000, as: "oppHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const deusmon = s.perm("deusmon");
    const linkCard = s.inst("linkCard");
    const oppLowId = s.perm("oppLow").permanentId;
    const oppHighId = s.perm("oppHigh").permanentId;

    // Install EX10-073's continuous whenLinkTrashed watcher.
    await s.engine.recomputeContinuousEffects();

    // Trash THIS Digimon's link card via the REAL production seam (fires whenLinkTrashed).
    await primitivesOf(s).trash([linkCard.instanceId]);
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === oppLowId) === undefined, 200);

    expect(deusmon.linked.length).toBe(0); // the link card genuinely left the linked list
    // The server narrowed the delete-target prompt to the lowest-cost pool: the cost-5 Digimon was
    // NEVER offered as a candidate (V5 input validation runs over the narrowed set; the candidate
    // ids the engine emits for a permanent target are permanentIds).
    // FAILS-WHEN-REVERTED (lever 1): drop the lowestPlayCost narrowing => the cost-5's permanentId
    // appears in a chooseTargets candidate list => this assertion goes RED.
    const offeredCost5 = s.decisions.some(
      (d) => d.req.kind === "chooseTargets" && (d.req.options?.candidateInstanceIds ?? []).includes(oppHighId),
    );
    expect(offeredCost5).toBe(false);
    // ...and only the cost-3 was deleted; the cost-5 survives.
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppLowId)).toBeUndefined();
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppHighId)).toBeDefined();
  });

  it("trashing ANOTHER Digimon's link card does NOT fire (this-Digimon-only self-gate)", async () => {
    // EX10-073 with NO link card of its own. A DIFFERENT friendly Digimon carries the link card
    // that gets trashed.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-073", dp: 12000, as: "deusmon" },
            { card: "BT1-009", dp: 3000, as: "other", linked: [{ card: "BT1-009", as: "otherLink" }] },
          ],
        },
        1: { battleArea: [{ card: COST3, dp: 3000, as: "oppLow" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const otherLink = s.inst("otherLink");
    const oppLowId = s.perm("oppLow").permanentId;

    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).trash([otherLink.instanceId]);
    await settle(() => false, 40);

    // The trashed link card belonged to a DIFFERENT Digimon, not EX10-073 => the watcher must NOT
    // fire => the opponent's Digimon survives.
    // FAILS-WHEN-REVERTED (lever 2): drop the isSelfRef self-gate => the watcher fires on any
    // Digimon's link trash => the opponent's cost-3 is wrongly deleted => this assertion RED.
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppLowId)).toBeDefined();
  });

  it("Q5188 does not trigger when link-limit replacement trashes one of Deusmon's links", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX10-073",
            as: "deusmon",
            linked: [
              { card: "BT24-036", as: "oldLink1" },
              { card: "BT26-010", as: "oldLink2" },
            ],
          },
        ],
        hand: [{ card: "BT24-036", as: "newLink" }],
      },
      1: { battleArea: [{ card: COST3, as: "opponent" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("newLink").instanceId,
        targetPermanentId: s.perm("deusmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("deusmon").linked.some(({ instanceId }) => instanceId === s.inst("newLink").instanceId));
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === COST3)).toBe(true);
  });
});
