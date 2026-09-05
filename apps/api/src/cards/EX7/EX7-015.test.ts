import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-015.js";
import "../index.js";
import "../BT2/BT2-112.js";
import "../ST13/ST13-16.js";

describe("EX7-015 Otamamon", () => {
  it("permanently restricts play-cost reduction", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "RestrictCostReduction", seat: "any", costType: "play", duration: "permanent" }],
    }));

  it("makes a printed play reduction unavailable to either player", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX7-015"], hand: [{ card: "BT2-112", as: "target" }] },
      1: { battleArea: [{ card: "BT1-084", dp: 10000 }] },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("target").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT2-112"));
    expect(s.state.memory).toBe(-9);
  });

  it("does not block an effect that plays a Digimon without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX7-015", "ST13-12"],
          hand: [
            { card: "ST13-16", as: "alliance" },
            { card: "ST13-04", as: "legendArm" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("alliance").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST13-04"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST13-04")).toBe(true);
    expect(s.state.memory).toBe(6);
  });
});
