import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-066.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop turn loop");
  await loop;
}

describe("EX7-066 Chaos Triangular", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-066")).toMatchObject({
      cardId: "EX7-066",
      nameEn: "Chaos Triangular",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 6,
      types: ["Three Musketeers"],
      securityEffectText: "[Security] Delete 1 of your opponent's Digimon with 12000 DP or less.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-066")).toBe(true);
  });
  it("gives +3000 DP when this digivolution card is discarded and waives its color requirement with a Three Musketeers Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardDiscarded",
      requireByEffect: true,
      actions: [{ kind: "ModifyDP", amount: 3000 }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ isInherited: true });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave" },
    });
  });
  it("deletes an opposing Digimon up to 9000 DP and places itself under a Three Musketeers Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 9000 } } } },
      { kind: "PlaceUnder", position: "bottom" },
    ]));

  it("counts distinct Three Musketeers names for the Main deletion cap", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      dpCeilingScaling: {
        per: 1,
        unit: "distinctNames",
        filter: { nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }] },
      },
    }));

  it("uses the Main effect through the Three Musketeers color waiver, then places itself under that Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-066", as: "chaos" }],
          battleArea: [{ card: "EX7-048", as: "musketeer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("victim").instanceId);
    expect(s.perm("musketeer").stack.map((card) => card.instanceId)).toContain(s.inst("chaos").instanceId);
  });

  it("raises the Main deletion cap for each distinct Three Musketeers name", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-066", as: "chaos" }],
          battleArea: [
            { card: "EX7-048", as: "gundramon" },
            { card: "EX7-059", as: "beelstarmon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.stack.some((card) => card.instanceId === s.inst("chaos").instanceId),
      ),
    ).toBe(true);
  });

  it("does not raise the cap twice for two copies of the same Three Musketeers name", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-066", as: "chaos" }],
          battleArea: [
            { card: "EX7-048", as: "firstGundramon" },
            { card: "EX7-048", as: "secondGundramon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.stack.some((c) => c.cardId === "EX7-066")));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.instanceId).toBe(s.inst("victim").instanceId);
  });

  it("rejects the red Option when no Three Musketeers Digimon supplies the color waiver", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-066", as: "chaos" }], battleArea: [{ card: "EX7-046", as: "ordinary" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("chaos").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("gives +3000 DP after EX7-059 publicly trashes it, through the opponent turn only", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-059", as: "beel", under: [{ card: "EX7-066", as: "discarded" }] },
            { card: "BT1-009", as: "recipient", dp: 3000 },
          ],
          hand: [{ card: "EX7-066", as: "used" }, "BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT10-022", as: "tooLarge", dp: 16000 }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("recipient").instanceId);
    const baseDP = s.perm("recipient").currentDP;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beel").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").currentDP === baseDP + 3000 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("discarded").instanceId)).toBe(
      true,
    );
    expect(s.perm("beel").stack.some(({ instanceId }) => instanceId === s.inst("used").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("recipient").currentDP).toBe(baseDP + 3000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("recipient").currentDP).toBe(baseDP);
    await stopLoop(s, loop, 0);
  });

  it.each([
    [12000, true],
    [12001, false],
  ])("uses the real Security deletion boundary at %i DP", async (dp, deleted) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "EX7-066", as: "chaos" }, "BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker", dp: 3000 },
            { card: "BT10-022", as: "victim", dp },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("victim").instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("victim").instanceId),
    ).toBe(!deleted);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("victim").instanceId)).toBe(
      deleted,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
