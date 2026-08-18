import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT5/BT5-092.js";
import "./P-098.js";

describe("P-098 Seadramon", () => {
  it("protects exactly the chosen blue Digimon from battle deletion through the opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-027", dp: 3000, suspended: true, as: "protected" }],
          hand: [{ card: "P-098", as: "seadramon" }],
        },
        1: { battleArea: [{ card: "BT1-025", dp: 11000, as: "attacker" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("seadramon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("seadramon").instanceId,
    ));

    s.state.turnSeat = 1;
    const protectedId = s.perm("protected").permanentId;
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: protectedId },
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some(
      (permanent) => permanent.permanentId === protectedId,
    )).toBe(true);
    assertNoLoudGap(s);
  });

  it("applies the same battle protection from its When Digivolving timing", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "base" },
            { card: "BT1-027", dp: 3000, suspended: true, as: "protected" },
          ],
          hand: [{ card: "P-098", as: "seadramon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-025", dp: 11000, as: "attacker" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("seadramon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("seadramon").instanceId);

    s.state.turnSeat = 1;
    const protectedId = s.perm("protected").permanentId;
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: protectedId },
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some(
      (permanent) => permanent.permanentId === protectedId,
    )).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q4184 grants Rush when Nokia plays a Digimon by an effect, only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "host", under: ["P-098"] }],
          hand: [
            { card: "BT5-092", as: "firstNokia" },
            { card: "BT5-092", as: "secondNokia" },
            { card: "BT1-029", as: "firstGabumon" },
            { card: "EX1-011", as: "secondGabumon" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.turnCount = 1;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("firstNokia").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const firstPlay = s.decisions.at(-1)!.req;
    expect(firstPlay.sourceCardId).toBe("BT5-092");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: firstPlay.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("firstGabumon").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("firstGabumon").instanceId,
    ));
    const firstGabumon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("firstGabumon").instanceId,
    )!;
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const rushTarget = s.decisions.at(-1)!.req;
    expect(rushTarget.sourceCardId).toBe("P-098");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: rushTarget.decisionId,
      response: { kind: "chooseTargets", instanceIds: [firstGabumon.permanentId] },
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(firstGabumon, "Rush"));
    expect(observe(s.engine).hasKeyword(firstGabumon, "Rush")).toBe(true);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: firstGabumon.permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("secondNokia").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("secondGabumon").instanceId,
    ));
    const secondGabumon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("secondGabumon").instanceId,
    )!;

    expect(observe(s.engine).hasKeyword(secondGabumon, "Rush")).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "P-098")).toHaveLength(1);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: secondGabumon.permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: false, reason: "illegal-target" });
    assertNoLoudGap(s);
  });

  it("Q4184 does not react to an ordinary hand play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "host", under: ["P-098"] }],
        hand: [{ card: "BT1-029", as: "manualGabumon" }],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("manualGabumon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("manualGabumon").instanceId,
    ));
    await settle(() => false, 30);
    const manualGabumon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("manualGabumon").instanceId,
    )!;

    expect(observe(s.engine).hasKeyword(manualGabumon, "Rush")).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "P-098")).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
