import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./P-244.js";

describe("P-244 Unique Emblem: Ragnarok Attainer", () => {
  it("delays on an effect-added Vemmon card and uses normal reduced-cost digivolution requirements", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          addedDigivolutionCardFilter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }] },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand", "trash"],
              reduceCost: 3,
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(compiled)).not.toContain("ignoreRequirements");
  });

  it("uses from hand, plays a qualifying Vemmon/Zenith, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-061", as: "host" }],
          hand: [{ card: "P-244", as: "option" }],
          trash: [{ card: "BT11-061", as: "vemmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-244"), 500);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT11-061").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("plays EX11-066 Xeno from trash because its Rule also treats its name as Zenith", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-061", as: "host" }],
          hand: [{ card: "P-244", as: "option" }],
          trash: [{ card: "EX11-066", as: "xeno" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-244"), 500);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-066")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX11-066")).toBe(false);
  });
});
