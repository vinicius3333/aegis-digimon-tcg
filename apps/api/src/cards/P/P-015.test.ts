import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-015.js";
describe("P-015 Infermon", () => {
  it("de-digivolves exactly one card and leaves the bottom source intact", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-015", as: "source" }] },
        1: {
          battleArea: [
            {
              card: "BT4-019",
              under: [
                { card: "BT1-009", as: "bottom", faceUp: true },
                { card: "BT1-014", as: "upper", faceUp: true },
              ],
              as: "target",
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const removedTopId = s.perm("target").topCard!.instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === removedTopId));

    expect(s.perm("target").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("does nothing to a level 3 Digimon with no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-015", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "level-3" }] },
      },
      { autoSelectCards: true },
    );
    const topId = s.perm("level-3").topCard!.instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("level-3").topCard?.instanceId).toBe(topId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});
