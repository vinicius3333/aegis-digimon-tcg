import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-022.js";

describe("BT5-022 Bulucomon", () => {
  it("gains 1 memory when your effect trashes an opponent's digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }] },
      1: { battleArea: [{ card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] }] },
    });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    await (s.engine as any).primitives.trashDigivolutionCards(
      s.perm("opponent").permanentId,
      [s.inst("source").instanceId],
      { byEffectSeat: 0 },
    );
    await settle(() => s.state.memory !== before);
    expect(s.state.memory - before).toBe(1);
  });

  it("does not gain memory when the opponent trashes their own source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }] },
      1: { battleArea: [{ card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] }] },
    });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    await (s.engine as any).primitives.trashDigivolutionCards(
      s.perm("opponent").permanentId,
      [s.inst("source").instanceId],
      { byEffectSeat: 1 },
    );
    await settle();
    expect(s.state.memory).toBe(before);
  });

  it("does not gain memory during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }] },
      1: { battleArea: [{ card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;

    await (s.engine as any).primitives.trashDigivolutionCards(
      s.perm("opponent").permanentId,
      [s.inst("source").instanceId],
      { byEffectSeat: 0 },
    );
    await settle();

    expect(s.state.memory).toBe(before);
  });

  it("does not count returning a Digimon to hand as trashing its sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }] },
      1: { battleArea: [{ card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] }] },
    });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    await (s.engine as any).primitives.returnToHand([s.perm("opponent").topCard.instanceId]);
    await settle();
    expect(s.state.memory).toBe(before);
  });

  it("gains memory only once when sources of two opponent Digimon are trashed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }] },
      1: {
        battleArea: [
          { card: "BT4-073", as: "first", under: [{ card: "BT1-009", as: "source-a" }] },
          { card: "BT4-073", as: "second", under: [{ card: "BT1-010", as: "source-b" }] },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    await (s.engine as any).primitives.trashDigivolutionCards(
      s.perm("first").permanentId,
      [s.inst("source-a").instanceId],
      { byEffectSeat: 0 },
    );
    await (s.engine as any).primitives.trashDigivolutionCards(
      s.perm("second").permanentId,
      [s.inst("source-b").instanceId],
      { byEffectSeat: 0 },
    );
    await settle(() => s.state.memory !== before);
    expect(s.state.memory - before).toBe(1);
  });
});
