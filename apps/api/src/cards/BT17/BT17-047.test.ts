import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-047.js";
import "./index.js";

describe("BT17-047 Parrotmon", () => {
  it("matches the catalog identity and evolution route", () => {
    expect(getCardDefinition("BT17-047")).toMatchObject({
      cardId: "BT17-047",
      colors: ["Green"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
    });
  });

  it("plays itself from security at battle end only when you have no Digimon", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { filter: { isSelfRef: true }, isSelf: true },
      condition: { kind: "youHaveNone", filter: { controllerDefault: "mine", kind: ["Digimon"] } },
    });
  });

  it("suspends one opposing Digimon on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
  });

  it("once per turn unsuspends after deleting an opponent's Digimon in battle", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ event: "whenDeletesInBattle", actions: [{ kind: "Unsuspend", target: { isSelf: true } }] }],
    });
  });

  it("plays itself after its security battle when its owner has no Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT17-047", as: "parrotmon" }] },
      1: { battleArea: [{ card: "BT4-035", dp: 12000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const parrotmonId = s.inst("parrotmon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === parrotmonId),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === parrotmonId)).toBe(false);
  });

  it("suspends an opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-047", as: "parrotmon" }] },
        1: { battleArea: [{ card: "BT1-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("parrotmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("unsuspends its evolved host after deleting an opponent in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-048", dp: 12000, under: ["BT17-047"], as: "host" }] },
        1: { battleArea: [{ card: "BT1-020", dp: 6000, suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
