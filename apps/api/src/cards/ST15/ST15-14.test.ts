import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST15-14 Tai Kamiya", () => {
  it("sets memory to 3 only when the player has 2 or less", async () => {
    const positive = setupEngine({ 0: { battleArea: [{ card: "ST15-14", as: "tai" }] } });
    positive.state.memory = 2;
    const positiveTurn = positive.engine.runOneTurn();
    await settle(() =>
      positive.events.some((event) => event.kind === "memoryChanged" && event.from === 2 && event.to === 3),
    );
    expect(positive.events).toContainEqual(
      expect.objectContaining({ kind: "memoryChanged", from: 2, to: 3, reason: "setMemory" }),
    );
    advance(positive.engine).endMainPhaseIfOpen(0);
    await positiveTurn;

    const negative = setupEngine({ 0: { battleArea: [{ card: "ST15-14", as: "tai" }] } });
    negative.state.memory = 3;
    await negative.engine.runOneTurn();
    expect(negative.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "ST15-14")).toBe(
      false,
    );
  });

  it("suspends itself, draws 1, and gives one Digimon +2000 DP when an attack target switches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST15-14", as: "tai" },
            { card: "BT1-009", as: "digimon", dp: 3000 },
          ],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "ST15-12", dp: 1000, as: "blocker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tai = s.perm("tai");
    const digimon = s.perm("digimon");
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: digimon.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(tai.isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
    expect(digimon.currentDP).toBe(5000);
  });

  it("cannot pay the switch effect twice while Tai is already suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST15-14", as: "tai", suspended: true },
          { card: "BT1-009", as: "digimon", dp: 3000 },
        ],
        deck: ["BT1-001"],
      },
      1: { battleArea: [{ card: "ST15-12", dp: 1000, as: "blocker" }] },
    });
    const digimon = s.perm("digimon");
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: digimon.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.players[0]!.hand.length).toBe(handBefore);
    expect(digimon.currentDP).toBe(3000);
  });
});
