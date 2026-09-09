import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/BT1/BT1-102.js";
import "../../cards/BT4/BT4-035.js";
import { compiled } from "./BT17-040.js";
import "./index.js";

describe("BT17-040 Kazuchimon", () => {
  it("suspends an opponent and conditionally grants Security Attack -1", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
      includeLaterEntrants: true,
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
  });

  it("reduces security or recovers, then may attack an opponent's Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { condition: { kind: "securityAtLeast", value: 3 } },
        { kind: "SecurityManipulation", op: "addTop", amount: 1 },
        // `Attack.target` names the attacker; the defender is chosen at declaration.
        { kind: "Attack", optional: true, target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
      ],
    });
  });

  it("suspends one opponent and gives all opponents Security Attack -1 with Leon underneath", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-037", under: ["BT17-086"], as: "base" }],
          hand: [{ card: "BT17-040", as: "kazu" }],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "first" },
            { card: "BT4-025", as: "second" },
          ],
          hand: [{ card: "BT1-009", as: "laterEntrant" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kazu").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended || s.perm("second").isSuspended);

    expect(s.perm("first").isSuspended || s.perm("second").isSuspended).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(-1);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("laterEntrant").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const laterEntrant = s.state.players[1]!.battleArea.find(
        (permanent) => permanent.topCard?.instanceId === s.inst("laterEntrant").instanceId,
      );
      return laterEntrant !== undefined && observe(s.engine).keywordAmount(laterEntrant, "SecurityAttack") === -1;
    });
    expect(observe(s.engine).keywordAmount(s.perm("laterEntrant"), "SecurityAttack")).toBe(-1);
  });

  it("applies both exact-three-security branches and then attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-040", as: "kazu" }],
          deck: [{ card: "BT1-011", as: "recovered" }],
          security: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-012" }],
        },
        1: { battleArea: [{ card: "BT4-035", dp: 12000, suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const recoveredId = s.inst("recovered").instanceId;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kazu"));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[0]!.security.some((card) => card.instanceId === recoveredId)).toBe(true);
  });

  it("naturally resolves both exact-three branches and then attacks at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-040", as: "kazu" }],
          deck: [{ card: "BT1-011", as: "recovered" }],
          security: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-012" }],
        },
        1: { battleArea: [{ card: "BT4-035", dp: 12000, suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 0);
    const targetId = s.perm("target").permanentId;
    const recoveredId = s.inst("recovered").instanceId;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[0]!.security.some((card) => card.instanceId === recoveredId)).toBe(true);
  });

  it("does not recover above three security, taking only the DP-loss branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-040", as: "kazu" }],
          deck: [{ card: "BT1-011", as: "recoverySource" }],
          security: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-012" }, { card: "BT1-013" }],
        },
        1: { battleArea: [{ card: "BT4-035", dp: 12000, suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 0);
    const targetId = s.perm("target").permanentId;
    const recoverySourceId = s.inst("recoverySource").instanceId;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === recoverySourceId)).toBe(false);
  });

  it("inherits the Fenriloogamon DP loss only from its controller's security removal", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-101", under: ["BT17-040"], as: "fenriloogamon" }] },
        1: { battleArea: [{ card: "BT4-035", dp: 12000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("target").currentDP).toBe(12000);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("naturally reduces the attacking Digimon when its controller's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-101", under: ["BT17-040"], as: "fenriloogamon" }],
          security: [{ card: "BT1-102", as: "securityOption" }],
        },
        1: { battleArea: [{ card: "BT4-035", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    const attackerId = s.perm("attacker").permanentId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").currentDP === 4000);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(4000);
  });

  it("digivolves onto a Lv.5 with [Pulsemon] in its text through the alternate route for 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-036", as: "base" }],
          hand: [{ card: "BT17-040", as: "kazu" }],
          deck: [{ card: "BT1-011", as: "bonus" }],
        },
        1: {},
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const baseId = s.inst("base").instanceId;
    const kazuId = s.inst("kazu").instanceId;
    const bonusId = s.inst("bonus").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: kazuId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === kazuId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([bonusId]);
  });

  it("charges the full catalog cost 4 on the same base without the alternate flag", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-036", as: "base" }],
          hand: [{ card: "BT17-040", as: "kazu" }],
          deck: [{ card: "BT1-011", as: "bonus" }],
        },
        1: {},
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const kazuId = s.inst("kazu").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: kazuId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === kazuId);

    expect(s.state.memory).toBe(1);
  });

  it("rejects the alternate route on a Lv.5 without [Pulsemon] in text and falls back to cost 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "base" }],
          hand: [{ card: "BT17-040", as: "kazu" }],
          deck: [{ card: "BT1-011", as: "bonus" }],
        },
        1: {},
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const kazuId = s.inst("kazu").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: kazuId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === kazuId);

    expect(s.state.memory).toBe(1);
  });

  it("refuses an off-color Lv.5 source that satisfies neither the catalog nor the alternate route", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "base" }],
        hand: [{ card: "BT17-040", as: "kazu" }],
      },
      1: {},
    });
    s.state.memory = 5;
    const baseId = s.inst("base").instanceId;
    const kazuId = s.inst("kazu").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: kazuId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: kazuId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.perm("base").topCard?.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([kazuId]);
    expect(s.state.memory).toBe(5);
  });

  it("matches the catalog printed text, evolution costs and alternate requirement", () => {
    expect(getCardDefinition("BT17-040")).toMatchObject({
      cardId: "BT17-040",
      nameEn: "Kazuchimon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 6,
      dp: 12000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
    });
    const printed = getCardDefinition("BT17-040")!.effectText!;
    expect(printed).toContain("[Digivolve]Lv.5 w/[Pulsemon] in its text: Cost 3");
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, texts: ["Pulsemon"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
