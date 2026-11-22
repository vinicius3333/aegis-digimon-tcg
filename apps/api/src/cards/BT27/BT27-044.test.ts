import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { advance } from "#api/engine/testkit/advance";
import "#api/cards/index";

describe("Gekkomon evolution discount", () => {
  it.each([
    ["BT27-046", 1],
    ["BT27-058", 2],
    ["BT27-077", 2],
  ])("charges the correct evolution cost into %s", async (card, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-044", as: "base" }],
          hand: [{ card, as: "evolution" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === card && !s.state.pendingDecision);
    expect(s.state.memory).toBe(10 - cost);
    expect(s.perm("base").stack.map((c) => c.cardId)).toEqual(["BT27-044"]);
  });

  it.each([
    ["BT26-004", true],
    ["BT1-003", false],
  ])("honors the Glowing Dawn egg alternate evolution from %s", async (egg, allowed) => {
    const s = setupEngine({
      0: { breeding: { card: egg, as: "egg" }, hand: [{ card: "BT27-044", as: "card" }], deck: ["BT1-009"] },
    });
    await s.ready();
    s.state.memory = 10;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("egg").permanentId,
      instanceId: s.inst("card").instanceId,
    });
    expect(result.ok).toBe(allowed);
    if (allowed) await settle(() => s.perm("egg").topCard.cardId === "BT27-044");
    expect(s.state.memory).toBe(10);
  });

  it("adds 2000 DP only during the controller's turn when inherited", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT27-046", as: "host", under: ["BT27-044"] },
          { card: "BT27-044", as: "alone" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("alone").currentDP).toBe(2000);
  });
});

describe("Gekkomon official rulings", () => {
  it("does not reduce the digivolution cost while it is in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT27-044", as: "egg" },
          hand: [{ card: "BT27-046", as: "evolution" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT27-046" && !s.state.pendingDecision);
    expect(s.state.memory).toBe(8);
    expect(s.perm("egg").stack.map((c) => c.cardId)).toEqual(["BT27-044"]);
  });

  it("reduces the Monarchlizamon hand digivolution that ignores level to a cost of 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-044", as: "base" }, { card: "BT27-091" }],
          hand: [{ card: "BT27-050", as: "card" }],
          trash: ["BT27-046"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const effects: { effectKey: string }[] = JSON.parse(s.inst("card").activatableEffectsJson || "[]");
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("card").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT27-050" && !s.state.pendingDecision);
    expect(s.perm("base").stack.map((c) => c.cardId)).toEqual(["BT27-046", "BT27-044"]);
    expect(s.state.memory).toBe(8);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
