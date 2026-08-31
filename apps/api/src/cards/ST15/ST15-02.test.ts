import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST15-02 Agumon", () => {
  it("gains 1 memory at the start of main phase when the opponent has a battle-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-02", as: "agumon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 5;
    const turn = s.engine.runOneTurn();
    await settle(() => s.events.some((event) => event.kind === "memoryChanged" && event.from === 5 && event.to === 6));
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "memoryChanged", from: 5, to: 6, reason: "gainMemory" }),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not count an opponent's breeding-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-02", as: "agumon" }] },
      1: { breeding: { card: "BT1-009", as: "breeding" } },
    });
    s.state.memory = 5;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "ST15-02")).toBe(false);
  });

  it("gains inherited memory once when any attack target switches", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "host", under: ["BT1-009", "ST15-02"] }] },
      1: { battleArea: [{ card: "ST15-12", as: "blocker" }] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.memory).toBe(1);
  });
});
