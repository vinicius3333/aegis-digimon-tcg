import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-064.js";

describe("BT15-064", () => {
  it("reveals three to place one Machine/Cyborg/SoC under itself and add another to hand", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "trash",
          add: [{ to: "placeUnder", underFilter: { isSelfRef: true } }, { to: "hand" }],
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          add: [{ to: "placeUnder", underFilter: { isSelfRef: true } }, { to: "hand" }],
        },
      ],
    });
  });
  it("deletes a low-cost opposing card with SoC in stack and inherited de-digivolves", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Delete", condition: { kind: "selfDigivolutionStackHasTrait" } }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "DeDigivolve", stopAtLevel: 3 }],
    });
  });

  it("places the first qualifying reveal under this Megadramon, not another Machine host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-066", as: "otherHost" }],
          hand: [{ card: "BT15-064", as: "source" }],
          deck: [
            { card: "BT15-066", as: "underCandidate" },
            { card: "BT15-064", as: "handCandidate" },
            { card: "BT1-009", as: "filler" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.perm("source").stack.some(({ instanceId }) => instanceId === s.inst("underCandidate").instanceId),
    );

    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("underCandidate").instanceId);
    expect(s.perm("otherHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("handCandidate").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("filler").instanceId);
  });
});
