import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { type SeatSpec, setupEngine, settle } from "../../engine/testkit/harness.js";
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

describe("ST15-02 Agumon — KB Q&A rulings", () => {
  async function runMainPhaseStart(opponent: SeatSpec) {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-02", as: "agumon" }] },
      1: opponent,
    });
    s.state.memory = 5;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const gainedMemory = s.events.some(
      (event) => event.kind === "memoryChanged" && event.reason === "gainMemory" && event.from === 5 && event.to === 6,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    return gainedMemory;
  }

  async function attackAndBlock(options: { attackerIsHost: boolean }) {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST15-12", as: "host", under: ["ST15-02"] },
          { card: "BT1-009", as: "otherAttacker" },
        ],
      },
      1: {
        battleArea: [{ card: "ST15-05", dp: 1000, as: "blocker" }],
        security: ["BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 0;
    const attacker = options.attackerIsHost ? s.perm("host") : s.perm("otherAttacker");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const memoryBeforeBlock = s.state.memory;
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    return { memoryBeforeBlock, memoryAfterBlock: s.state.memory };
  }

  it("does not gain memory when the opponent only has a Digimon in the breeding area (Q807)", async () => {
    expect(await runMainPhaseStart({ breeding: { card: "BT1-009" } })).toBe(false);
    expect(await runMainPhaseStart({ battleArea: [{ card: "BT1-009" }] })).toBe(true);
  });

  it("gains 1 memory when the opponent blocks the Digimon that has this card as a source (Q808)", async () => {
    const { memoryBeforeBlock, memoryAfterBlock } = await attackAndBlock({ attackerIsHost: true });
    expect(memoryBeforeBlock).toBe(0);
    expect(memoryAfterBlock).toBe(1);
  });

  it("gains 1 memory when another Digimon's attack target is switched by a block (Q809)", async () => {
    const { memoryBeforeBlock, memoryAfterBlock } = await attackAndBlock({ attackerIsHost: false });
    expect(memoryBeforeBlock).toBe(0);
    expect(memoryAfterBlock).toBe(1);
  });
});
