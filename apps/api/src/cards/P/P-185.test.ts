import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./P-185.js";

describe("P-185 EmperorGreymon", () => {
  it("requires a Takuya Kanbara Tamer with five Hybrid cards under it", () => {
    expect(runtimeCompiledCard("P-185")!.digivolutionRequirement).toEqual([
      {
        namesExact: ["Takuya Kanbara"],
        cost: 4,
        isAlternate: true,
        baseIsTamer: true,
        minTraitStackCount: 5,
        minTraitStackTraits: ["Hybrid"],
      },
    ]);
  });

  it("encodes Blocker, DP-relative deletion, color scaling, and end-of-turn unsuspend", () => {
    const card = runtimeCompiledCard("P-185")!;
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker" }],
    });
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: {
            count: 1,
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          scaling: { per: 1, unit: "colors", filter: { controllerDefault: "mine", zone: "digivolutionCards" } },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", target: { isSelf: true } }],
    });
  });

  it("exposes Blocker on the live EmperorGreymon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-185", as: "emperor" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("emperor"), "Blocker")).toBe(true);
  });

  it("legally digivolves from Takuya with five Hybrid cards under the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-085",
              as: "takuya",
              under: ["BT7-008", "BT7-011", "BT7-019", "BT7-021", "BT7-035"],
            },
          ],
          hand: [{ card: "P-185", as: "emperor" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...Array(19).fill("BT1-013")],
          security: Array(3).fill("BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentHand" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const originalSourceIds = [
      s.perm("takuya").topCard.instanceId,
      ...s.perm("takuya").stack.map((card) => card.instanceId),
    ];
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.instanceId === s.inst("emperor").instanceId);
    expect(s.perm("takuya").topCard.instanceId).toBe(s.inst("emperor").instanceId);
    expect(s.perm("takuya").stack).toHaveLength(6);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(originalSourceIds));
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("scales from its own digivolution cards, deletes at the DP boundary, and unsuspends on each own turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-063", as: "unrelatedYellow" },
            { card: "BT2-076", as: "unrelatedPurple" },
            {
              card: "BT7-085",
              as: "takuya",
              under: ["BT7-008", "BT7-011", "BT7-019", "BT7-021", "BT7-035"],
            },
          ],
          hand: [{ card: "P-185", as: "emperor" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...Array(19).fill("BT1-013")],
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 17000, as: "equal" },
            { card: "BT1-009", dp: 18000, as: "over" },
          ],
          hand: [{ card: "BT1-009", as: "opponentHand" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("takuya").permanentId;
    const sourceIds = [s.perm("takuya").topCard.instanceId, ...s.perm("takuya").stack.map((card) => card.instanceId)];
    const equalId = s.perm("equal").permanentId;
    const overId = s.perm("over").permanentId;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: s.inst("emperor").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("takuya").topCard.instanceId === s.inst("emperor").instanceId &&
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.battleArea.length === 1,
    );
    expect(s.perm("takuya").permanentId).toBe(hostId);
    expect(s.perm("takuya").stack).toHaveLength(6);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 6, reason: "digivolve" });
    expect(s.perm("emperor").currentDP).toBe(17000);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === equalId)).toBe(false);
    expect(s.perm("over").currentDP).toBe(18000);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === overId)).toBe(true);

    await advance(s.engine).verb.suspend([hostId]);
    expect(s.perm("takuya").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("takuya").isSuspended).toBe(false);
    expect(s.perm("takuya").permanentId).toBe(hostId);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds));

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([hostId]);
    expect(s.perm("takuya").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("emperor").isSuspended).toBe(false);
    expect(s.perm("takuya").permanentId).toBe(hostId);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds));
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("P-185 EmperorGreymon — KB Q&A rulings", () => {
  const HYBRIDS = ["BT7-008", "BT7-011", "BT7-019", "BT7-021", "BT7-035"];

  async function digivolveTakuya(
    options: { takuya?: Partial<PermanentSpec>; others?: (PermanentSpec | string)[]; breeding?: string } = {},
  ) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya", under: HYBRIDS, ...options.takuya }, ...(options.others ?? [])],
          ...(options.breeding === undefined ? {} : { breeding: { card: options.breeding, as: "breeding" } }),
          hand: [{ card: "P-185", as: "emperor" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...Array(19).fill("BT1-013")],
          security: Array(3).fill("BT1-009"),
        },
        1: { deck: Array(20).fill("BT1-013"), security: Array(3).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const takuyaCardId = s.inst("takuya").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("takuya").topCard.instanceId === s.inst("emperor").instanceId && s.state.pendingDecision === undefined,
    );
    return { s, takuyaCardId };
  }

  it("digivolves the Tamer as-is: no digivolve triggers, and a Digimon digivolve lock does not stop it (Q6917)", async () => {
    const { s } = await digivolveTakuya({
      others: [
        { card: "BT5-091", as: "takumi" },
        { card: "BT7-008", as: "lockedDigimon" },
      ],
      breeding: "BT13-007",
    });
    expect(s.perm("takumi").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT5-091")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(observe(s.engine).isRestricted(s.perm("lockedDigimon"), "digivolve")).toBe(true);
  });

  it("performs the digivolution bonus draw for a Tamer digivolution (Q6918)", async () => {
    const { s } = await digivolveTakuya();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(19);
  });

  it.each([
    ["played this turn", true, false],
    ["played on an earlier turn", false, true],
  ])(
    "attacks after digivolving from a Tamer %s only when that Tamer was not new (Q6919)",
    async (_label, enteredThisTurn, canAttack) => {
      const { s } = await digivolveTakuya({ takuya: { enteredThisTurn } });
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("takuya").permanentId,
          target: { kind: "player" },
        }).ok,
      ).toBe(canAttack);
    },
  );

  it("keeps the Tamer card as a digivolution card that is trashed when the Digimon leaves (Q6920)", async () => {
    const { s, takuyaCardId } = await digivolveTakuya();
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toContain(takuyaCardId);
    await advance(s.engine).verb.deletePermanent([s.perm("takuya").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(takuyaCardId);
  });

  it("does not gain the [Security] effect of the Tamer card in its digivolution cards (Q6921)", async () => {
    const { s, takuyaCardId } = await digivolveTakuya();
    const eventsBefore = s.events.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.slice(eventsBefore).some((event) => event.kind === "securityChecked") &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );

    const attackEvents = s.events.slice(eventsBefore);
    expect(attackEvents.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(attackEvents.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT7-085")).toBe(
      false,
    );
    expect(s.state.players[1]!.security.length).toBeLessThan(3);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toContain(takuyaCardId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("gains the inherited effect of the Tamer card in its digivolution cards (Q6922)", async () => {
    const { s } = await digivolveTakuya();
    expect(observe(s.engine).canUseInheritedEffect(s.perm("takuya"), "BT7-085")).toBe(true);
    const ownTurnDP = s.perm("takuya").currentDP;
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(ownTurnDP - s.perm("takuya").currentDP).toBe(2000);
  });
});
