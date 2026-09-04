import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-069.js";

describe("EX6-069 Rise of the Seven Great Demon Lords", () => {
  it("scopes the Delay play to a Gate of Deadly Sins in breeding, plus Security placement", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("Seven Great Demon Lords");
    expect(text).toContain("Gate of Deadly Sins");
    expect(text).toContain("onDeletionOf");
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      actions: [
        {
          kind: "PlayWithoutCost",
          source: "breeding",
          target: { filter: { zone: "digivolutionCards", hostFilter: { zone: "breeding" } } },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      position: "bottom",
    });
    expect(text).toContain("PlaceInBattleAreaSelf");
  });
  it("publicly places a Seven Great Demon Lords card under the breeding Gate", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "gate" },
          battleArea: [{ card: "EX6-056", as: "source" }],
          hand: [
            { card: "EX6-069", as: "option" },
            { card: "EX6-059", as: "lord" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-069"));
    expect(s.state.players[0]!.breeding?.stack.some((card) => card.instanceId === s.inst("lord").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-069")).toBe(true);
  });
  it("publicly still places itself when the optional breeding placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "gate" },
          battleArea: [{ card: "EX6-056", as: "source" }],
          hand: [
            { card: "EX6-069", as: "option" },
            { card: "EX6-059", as: "lord" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-069"));
    expect(s.state.players[0]!.breeding?.stack.some((card) => card.instanceId === s.inst("lord").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-069")).toBe(true);
  });
});
