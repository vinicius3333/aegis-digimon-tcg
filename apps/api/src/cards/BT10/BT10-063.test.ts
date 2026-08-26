import { describe, expect, it } from "vitest";
import { requireCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-063.js";

describe("BT10-063 Hi-VisionMonitamon", () => {
  it("matches its catalog and exact three-slot DigiXros IR", () => {
    const definition = requireCardDefinition("BT10-063");
    expect([definition.colors, definition.level, definition.playCost, definition.dp]).toEqual([["Black"], 4, 6, 7000]);
    expect(definition.evoCosts).toEqual([{ color: "Black", level: 3, memoryCost: 2 }]);
    expect([definition.forms, definition.attributes, definition.types]).toEqual([
      ["Champion"],
      ["Data"],
      ["LCD", "Twilight", "Xros Heart"],
    ]);
    expect(compiled).toEqual({
      effects: [],
      coverage: "full",
      residual: [],
      digiXrosRequirement: [
        {
          materials: [{ names: ["Monitamon"] }, { names: ["Monitamon"] }, { names: ["Monitamon"] }],
          count: 2,
        },
      ],
    });
  });

  it("places three exact Monitamon materials and reduces the play cost to zero", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT10-063", as: "source" },
          { card: "BT10-058", as: "first" },
          { card: "BT7-057", as: "second" },
          { card: "BT10-058", as: "third" },
        ],
      },
    });
    const sourceId = s.inst("source").instanceId;
    const materialIds = [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId];
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: sourceId,
        digiXros: { materialInstanceIds: materialIds },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        ({ topCard, stack }) => topCard.instanceId === sourceId && stack.length === 3,
      ),
    );

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === sourceId)!;
    expect(new Set(played.stack.map(({ instanceId }) => instanceId))).toEqual(new Set(materialIds));
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("rejects a fourth Monitamon because the recipe has exactly three slots", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT10-063", as: "source" },
          { card: "BT10-058", as: "first" },
          { card: "BT7-057", as: "second" },
          { card: "BT10-058", as: "third" },
          { card: "BT7-057", as: "fourth" },
        ],
      },
    });
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [
            s.inst("first").instanceId,
            s.inst("second").instanceId,
            s.inst("third").instanceId,
            s.inst("fourth").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });
});
