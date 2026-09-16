import { describe, it, expect } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./BT11-093.js";

describe("BT11-093 Yuuya Kuga", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-093")).toMatchObject({
      cardId: "BT11-093",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3 }] },
      { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

  it("has complete registered IR coverage", () => {
    const compiled = runtimeCompiledCard("BT11-093")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toHaveLength(0);
  });

  it("[Start of Your Turn] sets memory to 3 when memory <= 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-093", dp: 0 }],
          deck: Array.from({ length: 5 }, () => "BT1-009"),
          hand: ["AD1-001"],
        },
        1: { deck: Array.from({ length: 5 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 1;
    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = true;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();

    expect(s.state.memory).toBe(3);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("[Your Turn] when a Greymon-named Digimon digivolves, Yuuya suspends and grants +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-093", dp: 0, as: "yuuyaPerm" },
            { card: "ST15-11", dp: 8000, as: "metalGreymon" },
          ],
          deck: ["BT1-009"],
          hand: [{ card: "BT2-065", as: "warGreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const yuuyaPerm = s.perm("yuuyaPerm");
    const metalGreymon = s.perm("metalGreymon");
    const warGreymon = s.inst("warGreymon");
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: metalGreymon.permanentId,
      instanceId: warGreymon.instanceId,
    });

    expect(result).toEqual({ ok: true });

    await settle(() => yuuyaPerm.isSuspended && metalGreymon.currentDP > 11000);

    expect(yuuyaPerm.isSuspended).toBe(true);
    expect(metalGreymon.currentDP).toBe(13000);
  });

  it("grants opponent Option immunity after a same-level Greymon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-093", as: "yuuya" },
            { card: "BT5-010", as: "greymon" },
          ],
          hand: [{ card: "BT11-064", as: "greymonX" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("greymonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("yuuya").isSuspended && observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Option"),
    );

    expect(observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Option")).toBe(true);
  });
});
