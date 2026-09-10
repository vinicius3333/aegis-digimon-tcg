import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX5-041.js";

describe("EX5-041 Ebonwumon", () => {
  it("matches the catalog and encodes Blast Digivolve, scaling suspension, lock, and deletion", () => {
    expect(getCardDefinition("EX5-041")).toMatchObject({
      cardId: "EX5-041",
      nameEn: "Ebonwumon",
      colors: ["Green", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 7,
      dp: 12000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "Four Sovereigns"],
      effectText: expect.stringContaining("For each of your Digimon with the [Deva]/[Four Sovereigns]"),
    });
    expect(getCardDefinition("EX5-041")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("EX5-041")?.effectText).toContain("can't unsuspend");
    expect(getCardDefinition("EX5-041")?.effectText).toContain("Delete 1 of your opponent's suspended Digimon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({
      keyword: "BlastDigivolve",
      raw: "＜Blast Digivolve＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Suspend",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"] },
              count: 1,
              countModifier: { amount: 1 },
              upTo: true,
            },
          },
          {
            kind: "Restrict",
            restriction: "unsuspend",
            duration: "untilOpponentNextUnsuspendPhase",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          },
        ],
      });
    }
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toEqual([
      {
        kind: "Delete",
        target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
      },
    ]);
  });

  it("publicly counts its own Four Sovereigns trait and one Deva for two opposing suspensions", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-041", as: "source" }],
          battleArea: [{ card: "BT10-079", as: "deva" }],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "opponentOne" },
            { card: "BT1-021", as: "opponentTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponentOne").isSuspended && s.perm("opponentTwo").isSuspended);
    expect(s.perm("opponentOne").isSuspended).toBe(true);
    expect(s.perm("opponentTwo").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentOne"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTwo"), "unsuspend")).toBe(true);
  });

  it("publicly suspends two opponents through legal digivolution scaling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-037", as: "base" },
            { card: "BT10-079", as: "deva" },
          ],
          hand: [{ card: "EX5-041", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "opponentOne" },
            { card: "BT1-021", as: "opponentTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentTwo").isSuspended);
    expect(s.perm("base").topCard?.cardId).toBe("EX5-041");
    expect(s.state.memory).toBe(6);
    expect(s.perm("opponentOne").isSuspended).toBe(true);
    expect(s.perm("opponentTwo").isSuspended).toBe(true);
  });

  it("Blast Digivolves publicly from hand during a counter window without memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-037", as: "base" }],
          hand: [{ card: "EX5-041", as: "source" }],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "attacker" }],
          security: ["BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("source").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-041");
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("holds the opponent's next unsuspend phase, then releases it on the following phase", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-041", as: "source" }],
          battleArea: [{ card: "BT10-079", as: "deva" }],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-021", as: "opponent" }],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend"));
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("deletes one suspended opponent Digimon through a public battle deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-041", as: "source", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker", dp: 20000 },
            { card: "BT1-021", as: "victim", suspended: true },
            { card: "BT1-021", as: "survivor" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").permanentId);
    await s.ready();
    s.state.turnSeat = 1;
    const sourceId = s.perm("source").permanentId;
    const victimId = s.perm("victim").permanentId;
    const survivorId = s.perm("survivor").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: sourceId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === survivorId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX5-041");
  });

  it("counts Ebonwumon itself even when no other Deva or Four Sovereigns is present", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-041", as: "source" }], battleArea: [{ card: "BT1-010", as: "unrelated" }] },
        1: { battleArea: [{ card: "BT1-021", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
  });
});
