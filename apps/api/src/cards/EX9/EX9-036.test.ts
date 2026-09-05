import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-036.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-036", () => {
  it("does not reduce WG evolution in breeding (Q4788)", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX9-036", as: "source" }, hand: [{ card: "EX9-040", as: "evo" }], deck: ["BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-040");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-036"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not reduce a legal non-WG evolution in the battle area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-036", as: "source" }], hand: [{ card: "BT1-071", as: "evo" }], deck: ["BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("BT1-071");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-036"]);
    expect(s.perm("source").currentDP).toBe(7000);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces by 1 the cost to digivolve this battle-area Digimon into a WG Digimon during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          sourceFilter: { isSelfRef: true },
          into: { nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
          actions: [{ mode: "reduceCost", amount: 1 }],
        },
      ],
    }));
  it("inherits +1000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));

  it("applies the inherited +1000 DP to the host Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-071", as: "host", under: ["EX9-036"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("reduces a legal WG digivolution from this battle-area Digimon by exactly 1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-036", as: "source" }], hand: [{ card: "EX9-040", as: "evo" }] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX9-040");

    expect(s.perm("source").topCard.cardId).toBe("EX9-040");
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
