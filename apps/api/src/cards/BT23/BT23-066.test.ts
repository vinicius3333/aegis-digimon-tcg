import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-066.js";

/**
 * Fixture vocabulary used across this suite:
 * - BT23-063 Sangloupmon — Purple Lv.4 [Dark Animal]/[CS], play cost 4. Its printed
 *   [When Attacking] ("This Digimon may digivolve into a Digimon card with the [Undead]
 *   or [CS] trait in the trash") is the only public route that puts Matadormon into play
 *   BY DIGIVOLVING FROM THE TRASH, which is what the conditional tail requires.
 * - BT23-062 Dracmon — Purple Lv.3 [Undead]/[CS], play cost 3: the one eligible tail target.
 * - BT23-064 Bakemon — Purple Lv.4 [Ghost]/[LIBERATOR], play cost 4: fails BOTH tail gates.
 * - BT23-065 Phantomon — Purple Lv.5: the level-gate control for the delete.
 * - BT3-089 Boltmon — Purple Lv.6 with NO printed effect and a Purple Lv.5 cost-2 evo cost:
 *   a legal, inert carrier for a Matadormon digivolution card.
 */

describe("BT23-066 Matadormon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-066")).toMatchObject({
      cardId: "BT23-066",
      nameEn: "Matadormon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "CS"],
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When any of your other Digimon would leave the battle area, by deleting this Digimon, they don't leave.",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  // C1 — [Digivolve] Lv.4 w/[CS] trait: Cost 3
  it("digivolves for 3 off an off-color level-4 [CS] base and for 3 off the printed Purple level-4 route", async () => {
    const alternate = setupEngine({
      0: {
        battleArea: [{ card: "BT23-050", as: "base" }],
        hand: [{ card: "BT23-066", as: "matadormon" }],
        deck: ["BT1-010", "BT1-011"],
      },
      1: { deck: ["BT1-012", "BT1-013"] },
    });
    alternate.state.memory = 5;
    await alternate.ready();
    const alternateBaseCardId = alternate.perm("base").topCard!.instanceId;
    const alternateTopId = alternate.inst("matadormon").instanceId;
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("base").permanentId,
        instanceId: alternateTopId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("base").topCard?.instanceId === alternateTopId);
    expect(alternate.state.memory).toBe(2);
    expect(alternate.perm("base").topCard?.cardId).toBe("BT23-066");
    expect(alternate.perm("base").stack.map((card) => card.instanceId)).toEqual([alternateBaseCardId]);

    const printed = setupEngine({
      0: {
        battleArea: [{ card: "BT23-064", as: "base" }],
        hand: [{ card: "BT23-066", as: "matadormon" }],
        deck: ["BT1-010", "BT1-011"],
      },
      1: { deck: ["BT1-012", "BT1-013"] },
    });
    printed.state.memory = 5;
    await printed.ready();
    const printedTopId = printed.inst("matadormon").instanceId;
    expect(
      printed.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: printed.perm("base").permanentId,
        instanceId: printedTopId,
      }),
    ).toEqual({ ok: true });
    await settle(() => printed.perm("base").topCard?.instanceId === printedTopId);
    expect(printed.state.memory).toBe(2);
  });

  // C1 negative — same colour family and level, but no [CS] trait.
  it("rejects an off-color level-4 base without the [CS] trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-052", as: "base" }],
        hand: [{ card: "BT23-066", as: "matadormon" }],
        deck: ["BT1-010", "BT1-011"],
      },
      1: { deck: ["BT1-012", "BT1-013"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(getCardDefinition("BT23-052")).toMatchObject({ level: 4, colors: ["Black"], types: ["Saving"] });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("matadormon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard?.cardId).toBe("BT23-052");
  });

  // C3 + C4 negative — played from the hand, so the trash tail must not run.
  it("deletes exactly one opposing level 4 or lower Digimon on play and leaves the trash untouched", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-066", as: "matadormon" },
            { card: "ST1-02", as: "neutral" },
          ],
          trash: [{ card: "BT23-062", as: "dracmon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT23-063", as: "target" },
            { card: "BT23-065", as: "safe" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const matadormonId = s.inst("matadormon").instanceId;
    const dracmonId = s.inst("dracmon").instanceId;
    const targetPermanentId = s.perm("target").permanentId;
    const targetCardId = s.perm("target").topCard!.instanceId;
    const safePermanentId = s.perm("safe").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: matadormonId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((p) => p.permanentId !== targetPermanentId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === matadormonId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([safePermanentId]);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetCardId)).toBe(true);
    // The tail is gated on digivolving from the trash: this was a play from the hand.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([dracmonId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // C3 zone boundary — "your opponent's Digimon" is the battle area, never the breeding area.
  it("does not reach an opponent's breeding-area Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-066", as: "matadormon" },
            { card: "ST1-02", as: "neutral" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          breeding: { card: "BT23-063", as: "hatchling" },
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const matadormonId = s.inst("matadormon").instanceId;
    const hatchlingId = s.perm("hatchling").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: matadormonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === matadormonId));

    expect(s.state.players[1]!.breeding?.permanentId).toBe(hatchlingId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // C3 + C4 negative — digivolved from the HAND, so the trash tail must not run.
  it("deletes on digivolving from the hand but still skips the trash tail", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "base" }],
          hand: [{ card: "BT23-066", as: "matadormon" }],
          trash: [{ card: "BT23-062", as: "dracmon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT23-063", as: "target" },
            { card: "BT23-065", as: "safe" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const matadormonId = s.inst("matadormon").instanceId;
    const dracmonId = s.inst("dracmon").instanceId;
    const targetPermanentId = s.perm("target").permanentId;
    const safePermanentId = s.perm("safe").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: matadormonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((p) => p.permanentId !== targetPermanentId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard?.instanceId).toBe(matadormonId);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([safePermanentId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([dracmonId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // C3 + C4 positive — the only public "digivolve from the trash" route on this set.
  it("plays a free cost-3 [Undead]/[CS] card when it digivolves out of the trash", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "attacker" }],
          trash: [
            { card: "BT23-066", as: "matadormon" },
            { card: "BT23-062", as: "dracmon" },
            { card: "BT23-063", as: "tooExpensive" },
            { card: "BT23-064", as: "wrongTrait" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT23-063", as: "target" },
            { card: "BT23-065", as: "safe" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    s.state.memory = 5;
    await s.ready();
    const matadormonId = s.inst("matadormon").instanceId;
    const dracmonId = s.inst("dracmon").instanceId;
    const tooExpensiveId = s.inst("tooExpensive").instanceId;
    const wrongTraitId = s.inst("wrongTrait").instanceId;
    const attackerPermanentId = s.perm("attacker").permanentId;
    const attackerCardId = s.perm("attacker").topCard!.instanceId;
    const targetPermanentId = s.perm("target").permanentId;
    const safePermanentId = s.perm("safe").permanentId;
    // Sangloupmon's own [When Attacking] offers every [Undead]/[CS] card in the trash;
    // steer it at Matadormon so the clause under test is the one that resolves.
    preferInstanceIds.push(matadormonId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === dracmonId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );

    // Digivolved out of the trash onto the attacking Sangloupmon, paying the cost-3 route.
    expect(s.perm("attacker").topCard?.instanceId).toBe(matadormonId);
    expect(s.perm("attacker").stack.map((card) => card.instanceId)).toEqual([attackerCardId]);
    expect(s.state.memory).toBe(2);
    // Delete clause.
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([safePermanentId]);
    expect(s.state.players[1]!.battleArea.every((p) => p.permanentId !== targetPermanentId)).toBe(true);
    // Tail clause: only the cost-3 [Undead]/[CS] card leaves the trash, and it costs nothing.
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === dracmonId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([tooExpensiveId, wrongTraitId]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === dracmonId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // C4 boundary — nothing eligible in the trash means nothing is played and nothing is asked.
  it("plays nothing when the trash holds no eligible card after a trash digivolution", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "attacker" }],
          trash: [
            { card: "BT23-066", as: "matadormon" },
            { card: "BT23-064", as: "wrongTrait" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT23-063", as: "target" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    s.state.memory = 5;
    await s.ready();
    const matadormonId = s.inst("matadormon").instanceId;
    const wrongTraitId = s.inst("wrongTrait").instanceId;
    const targetPermanentId = s.perm("target").permanentId;
    preferInstanceIds.push(matadormonId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.every((p) => p.permanentId !== targetPermanentId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.perm("attacker").topCard?.instanceId).toBe(matadormonId);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === wrongTraitId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // C2 — printed ＜Scapegoat＞ (comprehensive rules §16-32).
  it("survives a lost battle by sacrificing another of your Digimon, and dies when the sacrifice is declined", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-066", as: "matadormon", suspended: true },
            { card: "BT1-009", as: "fodder" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "bruiser", dp: 9000 }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    accepted.state.turnSeat = 1;
    accepted.state.memory = 5;
    await accepted.ready();
    expect(observe(accepted.engine).hasKeyword(accepted.perm("matadormon"), "Scapegoat")).toBe(true);
    const matadormonPermanentId = accepted.perm("matadormon").permanentId;
    const fodderPermanentId = accepted.perm("fodder").permanentId;
    const fodderCardId = accepted.perm("fodder").topCard!.instanceId;

    expect(
      accepted.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: accepted.perm("bruiser").permanentId,
        target: { kind: "permanent", permanentId: matadormonPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.state.players[0]!.trash.some((card) => card.instanceId === fodderCardId));

    expect(accepted.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([matadormonPermanentId]);
    expect(accepted.state.players[0]!.battleArea.every((p) => p.permanentId !== fodderPermanentId)).toBe(true);
    expect(accepted.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([fodderCardId]);
    expect(accepted.state.pendingDecision).toBeUndefined();

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-066", as: "matadormon", suspended: true },
            { card: "BT1-009", as: "fodder" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "bruiser", dp: 9000 }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    // ＜Scapegoat＞ asks for its sacrifice with an OPTIONAL card selection (min 0), not a
    // yes/no prompt, so the refusal branch is an empty selection. `autoSelectCards` would
    // always take the maximum and never refuse; answer this one decision by hand.
    const answered = new Set<string>();
    const refuseSacrifice = (): void => {
      for (const { seat, req } of declined.decisions) {
        if (req.kind !== "selectCards" || answered.has(req.decisionId)) continue;
        answered.add(req.decisionId);
        declined.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        });
      }
    };
    declined.state.turnSeat = 1;
    declined.state.memory = 5;
    await declined.ready();
    const declinedMatadormonCardId = declined.perm("matadormon").topCard!.instanceId;
    const declinedFodderPermanentId = declined.perm("fodder").permanentId;

    expect(
      declined.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: declined.perm("bruiser").permanentId,
        target: { kind: "permanent", permanentId: declined.perm("matadormon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      refuseSacrifice();
      return declined.state.players[0]!.trash.some((card) => card.instanceId === declinedMatadormonCardId);
    });

    expect(answered.size).toBe(1);
    expect(declined.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([declinedFodderPermanentId]);
    expect(declined.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([declinedMatadormonCardId]);
    expect(declined.state.pendingDecision).toBeUndefined();
  });

  // C5 — inherited [All Turns] leave-play replacement, on a stack built by a real digivolve.
  it("as a digivolution card, deletes its carrier so another of your Digimon does not leave play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-066", as: "matadormon" },
            { card: "BT1-009", as: "ally", dp: 3000 },
          ],
          hand: [{ card: "BT3-089", as: "boltmon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "wall", dp: 9000, suspended: true }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const matadormonCardId = s.perm("matadormon").topCard!.instanceId;
    const boltmonId = s.inst("boltmon").instanceId;

    // Build the digivolution stack publicly: Boltmon (Purple Lv.6, no printed effect) over
    // Matadormon for its printed Purple Lv.5 cost-2 route.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("matadormon").permanentId,
        instanceId: boltmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("matadormon").topCard?.instanceId === boltmonId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("matadormon").stack.map((card) => card.instanceId)).toEqual([matadormonCardId]);

    const carrierPermanentId = s.perm("matadormon").permanentId;
    const allyPermanentId = s.perm("ally").permanentId;
    const allyCardId = s.perm("ally").topCard!.instanceId;

    // The 3000 DP ally loses its battle and would be deleted; the inherited replacement
    // deletes the carrier instead.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: allyPermanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.every((p) => p.permanentId !== carrierPermanentId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([allyPermanentId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [boltmonId, matadormonCardId].sort(),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === allyCardId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // C5 refusal branch — declining the cost lets the ally leave.
  it("lets the ally leave play when the carrier's sacrifice is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-066", as: "matadormon" },
            { card: "BT1-009", as: "ally", dp: 3000 },
          ],
          hand: [{ card: "BT3-089", as: "boltmon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "wall", dp: 9000, suspended: true }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const boltmonId = s.inst("boltmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("matadormon").permanentId,
        instanceId: boltmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("matadormon").topCard?.instanceId === boltmonId);
    const carrierPermanentId = s.perm("matadormon").permanentId;
    const allyCardId = s.perm("ally").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === allyCardId));

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([carrierPermanentId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([allyCardId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // IR shape — the printed wording each behavioral test above pins.
  it("compiles ＜Scapegoat＞, both delete triggers, the trash-gated tail and the inherited replacement", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Scapegoat", raw: "＜Scapegoat＞" },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Delete",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
      });
      expect(actions[1]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: false,
        optional: true,
        condition: { kind: "digivolvedFromZone", zone: "trash" },
        target: {
          filter: {
            controller: "mine",
            playCostLte: 3,
            nameOrTrait: [{ tokens: ["Undead", "CS"], match: "trait" }],
          },
          count: 1,
        },
      });
    }
    const inherited = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
        },
      ],
    });
    expect(inherited).toBeDefined();
    expect((inherited!.actions[0] as unknown as { actions: unknown[] }).actions[0]).toMatchObject({
      kind: "Prevent",
      mode: "leavePlay",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
    });
  });
});
