import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import "../P/P-108.js";

function digivolveIntoMetalGarurumon(s: EngineSetup) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("gabumon").permanentId,
    instanceId: s.inst("metal").instanceId,
  });
}

function permissionOffered(s: EngineSetup): boolean {
  return s.inst("metal").digivolveTargetPermanentIds.includes(s.perm("gabumon").permanentId);
}
describe("ST21-10", () => {
  it("requires either the 10000 DP opponent threshold or three Tamer colors", () => {
    expect(runtimeCompiledCard("ST21-10")?.baseGrantedDigivolve).toEqual([
      {
        target: { namesExact: ["MetalGarurumon"] },
        cost: 4,
        ignoreRequirements: true,
        sourceZones: ["hand"],
        condition: {
          kind: "anyOf",
          conditions: [
            { kind: "opponentHasDigimonDpAtLeast", dp: 10000 },
            { kind: "tamerColorCountAtLeast", count: 3 },
          ],
        },
      },
    ]);
  });

  it("draws one then trashes one from hand once per turn as inherited behavior", () => {
    const effect = (runtimeCompiledCard("ST21-10")?.effects ?? []).find(
      (candidate) => candidate.trigger === "WhenAttacking",
    );
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      expect.objectContaining({ kind: "Draw", amount: 1 }),
      expect.objectContaining({
        kind: "Trash",
        target: expect.objectContaining({ filter: expect.objectContaining({ zone: "hand" }) }),
      }),
    ]);
  });

  it("executes inherited draw-then-trash behavior when the stack attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST21-11", as: "attacker", under: ["ST21-10"] }],
          hand: [{ card: "BT1-001", as: "discard" }],
          deck: [{ card: "BT1-002", as: "drawn" }],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const handBefore = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("discard").instanceId);
    expect(s.state.players[0]!.hand.length).toBe(handBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("digivolves into MetalGarurumon for 4 when the opponent has 10000 DP or more", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST21-10", as: "gabumon" }], hand: [{ card: "ST21-11", as: "metal" }] },
        1: { battleArea: [{ card: "ST21-11", as: "opponentMetal", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(permissionOffered(s)).toBe(true);
    expect(digivolveIntoMetalGarurumon(s)).toEqual({ ok: true });
    await settle(() => s.perm("gabumon").topCard.cardId === "ST21-11" && s.state.pendingDecision === undefined);
    expect(s.perm("gabumon").topCard.instanceId).toBe(s.inst("metal").instanceId);
    expect(s.state.memory).toBe(6);
  });

  it("does not offer the digivolution without either qualifying branch", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST21-10", as: "gabumon" }], hand: [{ card: "ST21-11", as: "metal" }] },
      1: { battleArea: [{ card: "ST1-03", as: "opponentRookie" }] },
    });
    await s.ready();
    expect(permissionOffered(s)).toBe(false);
    expect(digivolveIntoMetalGarurumon(s)).toMatchObject({ ok: false });
  });
});

describe("ST21-10 Gabumon — KB Q&A rulings", () => {
  function gabumonWithTamers(tamers: string[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST21-10", as: "gabumon" }, ...tamers],
          hand: [{ card: "ST21-11", as: "metal" }],
        },
        1: { battleArea: [{ card: "ST1-03", as: "opponentRookie" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    return s;
  }

  it("treats Tamers with exactly three total colors as having 3 or more (Q4482)", async () => {
    const twoColors = gabumonWithTamers(["ST21-12", "ST21-12"]);
    await twoColors.ready();
    expect(permissionOffered(twoColors)).toBe(false);

    const s = gabumonWithTamers(["ST21-12", "AD1-019"]);
    await s.ready();
    expect(permissionOffered(s)).toBe(true);
    expect(digivolveIntoMetalGarurumon(s)).toEqual({ ok: true });
    await settle(() => s.perm("gabumon").topCard.cardId === "ST21-11" && s.state.pendingDecision === undefined);

    expect(s.perm("gabumon").topCard.instanceId).toBe(s.inst("metal").instanceId);
    expect(s.state.memory).toBe(6);
  });

  it("combines its permission with Wisdom Training's digivolve effect and its -2 cost (Q5204)", async () => {
    async function delayDigivolve(opponentDp: number) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "ST21-10", as: "gabumon" },
              { card: "P-108", as: "wisdomTraining" },
            ],
            hand: [{ card: "ST21-11", as: "metal" }],
            deck: Array.from({ length: 6 }, () => "BT1-001"),
          },
          1: { battleArea: [{ card: "BT1-009", dp: opponentDp }], deck: ["BT1-001"] },
        },
        { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
      );
      s.state.turnCount = 2;
      s.state.memory = 10;
      await s.ready();
      const [ability] = JSON.parse(s.perm("wisdomTraining").activatableEffectsJson) as { effectKey: string }[];
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.inst("wisdomTraining").instanceId,
          effectKey: ability!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length > 0);
      await settle();
      return s;
    }

    const permitted = await delayDigivolve(10000);
    expect(permitted.perm("gabumon").topCard.instanceId).toBe(permitted.inst("metal").instanceId);
    expect(permitted.perm("gabumon").stack.map((card) => card.cardId)).toEqual(["ST21-10"]);
    expect(permitted.state.memory).toBe(8);

    const blocked = await delayDigivolve(9000);
    expect(blocked.perm("gabumon").topCard.cardId).toBe("ST21-10");
    expect(blocked.state.players[0]!.hand.map((card) => card.instanceId)).toContain(blocked.inst("metal").instanceId);
  });
});
