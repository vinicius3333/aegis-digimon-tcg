import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-072.js";

describe("EX6-072 Mega Digimon Assembly!", () => {
  it("waives color requirements against a level 6 or higher opposing Digimon and DNA digivolves a level 6 plus hand card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "opponentHas" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "DnaDigivolve",
      optional: true,
      payCost: true,
      materials: [
        { zone: "battleArea", count: 1 },
        { zone: "hand", count: 1 },
      ],
      into: { levels: [7], zone: "hand" },
    });
  });
  it("returns a level 6 or higher Digimon from trash and adds itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      { kind: "Return", to: "hand", target: { filter: { zone: "trash", levelComparison: { op: "gte", value: 6 } } } },
      { kind: "AddToHandSelf" },
    ]));
  it("publicly performs the Main DNA digivolution with a level 6 field material and hand material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-056", as: "fieldMaterial" },
            { card: "BT11-095", as: "whiteSource" },
          ],
          hand: [
            { card: "EX6-072", as: "option" },
            { card: "BT1-009", as: "handMaterial" },
            { card: "EX6-062", as: "result" },
          ],
        },
        1: { battleArea: [{ card: "EX6-056", as: "opponentLevel6" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("result").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("result").instanceId),
    ).toBe(true);
  });
});
