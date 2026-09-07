import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-094.js";

const restrictionClause = (trigger: string) => compiled.effects.find((effect) => effect.trigger === trigger) as any;

describe("BT23-094 Nanomachine Break", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-094")).toMatchObject({
      cardId: "BT23-094",
      nameEn: "Nanomachine Break",
      colors: ["Yellow"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(restrictionClause("Static").actions[0].condition.filter.zone).toEqual(["battleArea", "breeding"]);
  });

  it("binds one target for Main/Security and keeps both restrictions inside the Delay", () => {
    for (const trigger of ["Main", "Security"]) {
      const effect = restrictionClause(trigger);
      expect(effect.actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "SecurityAttack", amount: -1 },
        duration: "untilOpponentTurnEnd",
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "DisableTimingEffect",
        target: { fromSelectionRef: effect.actions[0].target.bindAs },
        timings: ["whenDigivolving", "whenAttacking"],
        duration: "untilOpponentTurnEnd",
      });
      expect(effect.actions[2]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    }
    const turn = restrictionClause("YourTurn");
    expect(turn.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(turn.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
    });
    expect(turn.actions[0].actions).toHaveLength(2);
    expect(turn.actions[0].actions[1].target.fromSelectionRef).toBe(turn.actions[0].actions[0].target.bindAs);
  });

  // Q5368: "on the field" covers the breeding area as well as the battle area.
  it("waives the yellow color requirement from an off-color CS Digimon in breeding", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-008", as: "csInBreeding" },
          hand: [{ card: "BT23-094", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  // Q5368: a Tamer in the battle area satisfies the same condition.
  it("waives the color requirement from an off-color CS Tamer in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-085", as: "csTamer" }],
          hand: [{ card: "BT23-094", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  it("refuses the off-color play while no CS card is on the field", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "nonCs" }],
          hand: [{ card: "BT23-094", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: optionId });
    expect(result).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(false);
  });

  it("applies both restrictions to one opposing Digimon, pays 5 memory and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-008", as: "csDigimon" }],
          hand: [{ card: "BT23-094", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("target"), "whenAttacking"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenAttacking")).toBe(true);
    // Controller boundary: "1 of their Digimon" never reaches the caster's own board.
    expect(observe(s.engine).keywordAmount(s.perm("csDigimon"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).timingEffectDisabled(s.perm("csDigimon"), "whenDigivolving")).toBe(false);
    expect(observe(s.engine).timingEffectDisabled(s.perm("csDigimon"), "whenAttacking")).toBe(false);
  });

  // Q5369 + Q5372: the blocked [When Digivolving] does not activate, and its "by trashing 1
  // card in your hand" cost is not processed either.
  it("blocks the restricted Digimon's When Digivolving effect and never pays its by-cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-008", as: "csDigimon" }],
          hand: [{ card: "BT23-094", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT2-067", as: "target" }],
          hand: [{ card: "EX6-048", as: "witchmon" }, "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving"));
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("witchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "EX6-048");

    expect(s.perm("target").topCard?.cardId).toBe("EX6-048");
    // The [When Digivolving] never activated: no hand card was trashed for its cost and the
    // caster's Digimon was granted no "[End of Attack] Delete this Digimon." aura.
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(observe(s.engine).customEffectGrants(s.perm("csDigimon"))).toEqual([]);
  });

  // Q5370 + Q5373: an effect printed as [When Digivolving] [End of Attack] [Once Per Turn]
  // is silenced at the digivolve timing without consuming its once-per-turn use, so it can
  // still activate at [End of Attack] in the same turn.
  it("leaves the End of Attack half of the same once-per-turn effect available", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-008", as: "csDigimon" },
            { card: "BT1-009", as: "prey", dp: 500 },
          ],
          hand: [{ card: "BT23-094", as: "option" }],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "target" }],
          hand: [{ card: "BT21-029", as: "medusamon" }],
          security: 2,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 5;
    await s.ready();
    preferInstanceIds.push(s.perm("prey").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving"));

    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT21-029");
    // [When Digivolving] was blocked, so seat 0's Digimon are all still on the board.
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT1-009")).toHaveLength(
      1,
    );

    const preyId = s.perm("prey").topCard!.instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === preyId));

    // [End of Attack] still had its once-per-turn use available (Q5373) and is not masked
    // by the restriction (Q5370).
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === preyId)).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenAttacking")).toBe(true);
  });

  it("pays the intrinsic Delay when a CS Digimon attacks and restricts one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-094", as: "option" },
            { card: "BT23-006", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenAttacking")).toBe(true);
  });

  it("keeps itself in play and grants nothing when the Delay prompt is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-094", as: "option" },
            { card: "BT23-006", as: "attacker", dp: 20_000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: 2 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(false);
  });

  it("does not arm the Delay when a non-CS Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-094", as: "option" },
            { card: "BT1-009", as: "attacker", dp: 20_000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(false);
  });

  // CR 16-17-3: a ＜Delay＞ cannot be activated on the turn its card entered the battle area.
  it("cannot pay the Delay on the turn it entered the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-094", as: "option", enteredThisTurn: true },
            { card: "BT23-006", as: "attacker", dp: 20_000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(false);
  });

  // Q5371: another card's "activate 1 of its [When Digivolving] effects" cannot reach the
  // restricted Digimon either. Seat 1 owns BT20-021 Jesmon GX (a [When Digivolving] that
  // deletes) and BT10-110 Seiken Meppa (the borrowing effect); seat 0 owns the restriction.
  const seikenMeppaFixture = () =>
    setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-008", as: "csDigimon" }],
          hand: [{ card: "BT23-094", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT20-021", as: "jesmon" }],
          hand: [{ card: "BT10-110", as: "seiken" }, "BT20-021"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

  it("lets another effect activate the When Digivolving effect while unrestricted (control)", async () => {
    const s = seikenMeppaFixture();
    const preyId = s.perm("csDigimon").topCard!.instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("seiken").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === preyId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === preyId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("blocks another effect from activating the restricted Digimon's When Digivolving effect", async () => {
    const s = seikenMeppaFixture();
    const preyId = s.perm("csDigimon").topCard!.instanceId;
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("jesmon"), "whenDigivolving"));
    expect(observe(s.engine).timingEffectDisabled(s.perm("jesmon"), "whenDigivolving")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("seiken").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT10-110"));

    // The borrowed [When Digivolving] never activated: no deletion, and its "by placing 1
    // [Royal Knight] trait card" cost was not paid either (Q5372).
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === preyId)).toBe(false);
    expect(s.perm("csDigimon").topCard?.instanceId).toBe(preyId);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT20-021"]);
    expect(s.perm("jesmon").stack).toHaveLength(0);
  });

  it("restricts the attacker's board and places itself when checked from security", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT23-094", as: "option" }, "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "attacker" },
            { card: "BT1-009", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.turnSeat = 1;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenAttacking")).toBe(true);
  });

  it("clears both restrictions once the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-008", as: "csDigimon" }],
          hand: [{ card: "BT23-094", as: "option" }, "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: 2,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: 2,
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("target"), "whenAttacking"));
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    // Still live during the whole of the opponent's turn.
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(false);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenAttacking")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
