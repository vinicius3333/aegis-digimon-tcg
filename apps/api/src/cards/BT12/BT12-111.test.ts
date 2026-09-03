import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-111.js";
import "./BT12-084.js";

describe("BT12-111 DarknessBagramon", () => {
  it("registers the complete compiled timings and corrected DigiXros recipe", () => {
    const module = getEffectModule("BT12-111");
    expect(module?.cardId).toBe("BT12-111");
    const source = {
      instanceId: "source-111",
      cardId: "BT12-111",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
    expect(digiXrosRequirementFor("BT12-111")).toEqual([
      { materials: [{ names: ["DarkKnightmon"] }, { names: ["Bagramon"] }], count: 3 },
    ]);
  });

  it("accepts exactly one DarkKnightmon and one Bagramon as the two DigiXros materials", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT12-111", as: "source" },
            { card: "BT10-066", as: "darkKnightmon" },
            { card: "BT11-088", as: "bagramon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10; // 16 - 3 per named DigiXros material
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("darkKnightmon").instanceId, s.inst("bagramon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-111"));
    expect(s.state.memory).toBe(0);
    // Stack storage is bottom-to-top; printed requirement order reads top-to-bottom.
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT11-088", "BT10-066"]);
  });

  it("deletes an opposing Digimon and places Bagra Army cards from trash underneath itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-111", as: "source" }],
          trash: [{ card: "BT12-111", as: "saved" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea[0]!.stack.length >= 1,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    const stack = s.state.players[0]!.battleArea[0]!.stack;
    expect(s.state.players[0]!.battleArea[0]!.topCard!.instanceId).toBe(s.inst("source").instanceId);
    expect(stack).toHaveLength(1);
    expect(stack[0]!.instanceId).toBe(s.inst("saved").instanceId);
  });

  it("repeats the delete-then-trash placement when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-085", as: "base" }],
          hand: [{ card: "BT12-111", as: "source" }],
          trash: [{ card: "BT12-111", as: "saved" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT12-111");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("saved").instanceId);
  });

  it("trashes exactly five sources and returns every Tamer after an opponent attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT12-111",
              as: "source",
              under: [
                { card: "BT12-111", as: "source-stack-1" },
                { card: "BT12-111", as: "source-stack-2" },
                { card: "BT12-111", as: "source-stack-3" },
                { card: "BT12-111", as: "source-stack-4" },
                { card: "BT12-111", as: "source-stack-5" },
                { card: "BT12-111", as: "source-stack-6" },
              ],
              suspended: true,
            },
            { card: "BT12-092", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT12-094", as: "opponent-tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const sourceStackIds = s.perm("source").stack.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").stack.length === 1 && s.state.players[0]!.hand.length === 1);
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter(({ instanceId }) => sourceStackIds.includes(instanceId))).toHaveLength(5);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT12-092")).toBe(true);
    expect(s.state.players[1]!.hand.some(({ cardId }) => cardId === "BT12-094")).toBe(true);
  });

  it("does not pay the five-card cost or return Tamers when the optional reaction is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT12-111",
              as: "source",
              under: ["BT12-111", "BT12-111", "BT12-111", "BT12-111", "BT12-111"],
              suspended: true,
            },
            { card: "BT12-092", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT12-094", as: "opponent-tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const prompt = s.decisions.find(({ req }) => req.kind === "optional");
    expect(prompt).toBeDefined();
    expect(
      s.engine.applyIntent(prompt!.seat, {
        type: "respondDecision",
        decisionId: prompt!.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("source").stack).toHaveLength(5);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("reacts to an opponent Digimon digivolving during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-111", as: "source", under: ["BT12-111", "BT12-111", "BT12-111", "BT12-111", "BT12-111"] },
            { card: "BT12-092", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT12-085", as: "opponent-base" },
            { card: "BT12-094", as: "opponent-tamer" },
          ],
          hand: [{ card: "BT12-084", as: "opponent-evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("opponent-base").permanentId,
        instanceId: s.inst("opponent-evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").stack.length === 0 && s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-092");
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toContain("BT12-094");
  });
});
