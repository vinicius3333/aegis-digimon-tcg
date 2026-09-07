import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-011.js";
import "../index.js";

describe("BT24-011 Cyclonemon", () => {
  it("grants Rush and Raid as printed", () => {
    const staticKeywords = compiled.effects
      .filter((effect) => !effect.isInherited)
      .flatMap((effect) => effect.keywords ?? []);
    expect(staticKeywords.map((keyword) => keyword.keyword)).toEqual(["Rush", "Raid"]);
  });

  it("grants inherited Raid and keeps the TS level-3 alternate requirement", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Raid");
    expect(compiled.digivolutionRequirement ?? []).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("exposes printed and inherited keywords through observable game state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-011", as: "cyclonemon" },
          { card: "BT1-009", as: "host", under: ["BT24-011"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("cyclonemon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("cyclonemon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(false);
  });

  it("digivolves from a level 3 TS Digimon for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "tsBase" }],
        hand: [{ card: "BT24-011", as: "cyclonemon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("cyclonemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("cyclonemon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("rejects a public alternate evolution from a non-TS level 3 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-029", as: "base" }], hand: [{ card: "BT24-011", as: "cyclonemon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cyclonemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-029");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cyclonemon").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("can play and immediately attack a suspended Digimon with Rush", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-011", as: "cyclonemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyclonemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("cyclonemon").instanceId),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cyclonemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses Raid from a public attack to redirect to the opponent highest DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-011", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "high", dp: 4000 },
            { card: "BT1-009", as: "low", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const highId = s.perm("high").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === highId));
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).not.toContain(highId);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("low").permanentId)).toBe(true);
  });

  it("retains inherited Raid through a legal red level-5 evolution stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-011", as: "base" }], hand: [{ card: "BT1-020", as: "host" }] },
        1: { battleArea: [{ card: "BT1-009", as: "high", dp: 4000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const highId = s.perm("high").permanentId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("host").instanceId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT24-011"]);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toContain(highId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === highId));
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).not.toContain(highId);
  });

  it("may decline Raid and continue the original player attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-011", as: "attacker" }] },
        1: { security: [{ card: "BT1-009", as: "removed" }], battleArea: [{ card: "BT1-009", as: "high", dp: 4000 }] },
      },
      { autoDeclineOptional: true },
    );
    const removedId = s.inst("removed").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const raid = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(raid.options?.min).toBe(0);
    expect(raid.options?.candidateInstanceIds).toEqual([s.inst("high").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: raid.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === removedId));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(removedId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
