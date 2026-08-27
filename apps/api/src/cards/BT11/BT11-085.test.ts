import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-085.js";

describe("BT11-085 WaruSeadramon", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-085")).toMatchObject({
      cardId: "BT11-085", colors: ["Purple", "Blue"], level: 5, playCost: 8, dp: 8000, types: ["Aquatic"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"] }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"] }] },
      { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }] },
    ]);
  });

  it("plays a blue level 3 from an own blue Digimon's sources when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "base", under: [{ card: "BT1-029", as: "source" }] }],
          hand: [{ card: "BT11-085", as: "waru" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("waru").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("source").instanceId),
    );
  });
});
