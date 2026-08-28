import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-047.js";
import "../index.js";

describe("BT16-047", () => {
  it("suspends and prevents unsuspending an opposing Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }],
    });
  });

  it("trashes security or gains memory after a battle deletion", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "SecurityManipulation", op: "trashTop", condition: { kind: "securityAtLeast", value: 3 } },
            { kind: "GainMemory", amount: 2, condition: { kind: "securityAtMost", value: 3 } },
          ],
        },
      ],
    });
    expect(digivolutionRequirementsFor("BT16-047")).toEqual([{ level: 5, texts: ["Pulsemon"], cost: 3, isAlternate: true }]);
  });

  it("activates both security branches at exactly three security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-047", as: "achilles" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }], security: ["BT1-009"] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("achilles").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(7);
  });

  it("trashes security but does not gain memory above three security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-047", as: "achilles" }], security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }], security: ["BT1-009"] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("achilles").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(5);
  });

  it("resolves suspension and restriction when digivolving from a level-5 Insectoid", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-045", as: "base" }], hand: [{ card: "BT16-047", as: "achilles" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("achilles").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT16-047");

    expect(s.state.memory).toBe(1);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("does not react when another Digimon deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-047", as: "achilles" },
          { card: "BT1-009", as: "other", dp: 11000 },
        ],
        security: ["BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }], security: ["BT1-009"] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
