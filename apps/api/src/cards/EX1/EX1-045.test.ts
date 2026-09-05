import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-045.js";

describe("EX1-045 Hagurumon", () => {
  it("may trash a Machine or Cyborg Digimon from hand to draw 2 on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-045", as: "hagurumon" },
            { card: "BT1-042", as: "machine" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("machine").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("machine").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("honors refusal and leaves an eligible Machine in hand without drawing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-045", as: "hagurumon" },
            { card: "BT1-042", as: "machine" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-045"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("machine").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("machine").instanceId)).toBe(false);
  });

  it("accepts a Cyborg Digimon as the public discard cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-045", as: "hagurumon" },
            { card: "BT1-024", as: "cyborg" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cyborg").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cyborg").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("does not accept a non-Machine/Cyborg Digimon as the trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-045", as: "hagurumon" },
            { card: "BT1-009", as: "wrongTrait" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-045"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wrongTrait").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wrongTrait").instanceId)).toBe(false);
  });
});
