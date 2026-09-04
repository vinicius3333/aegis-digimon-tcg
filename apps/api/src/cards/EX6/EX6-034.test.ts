import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-034.js";

describe("EX6-034 Antylamon", () => {
  it("has Alliance and plays a level 3 yellow or green Digimon on digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Alliance");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { colors: ["Yellow", "Green"], levels: [3] } },
    });
  });
  it("inherits once-per-turn Beast revival by returning another suspended Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          cost: { kind: "return", target: { filter: { excludeSelf: true, suspended: true } } },
        },
      ],
    }));
  it("publicly plays a level-3 yellow Digimon from hand when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-034", as: "anty" }], hand: [{ card: "EX6-016", as: "rookie" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("anty"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("rookie").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("rookie").instanceId),
    ).toBe(true);
  });

  it("does not play a wrong-color level-3 Digimon from hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-034", as: "anty" }], hand: [{ card: "BT1-009", as: "wrongColor" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("anty"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wrongColor").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("wrongColor").instanceId),
    ).toBe(false);
  });

  it("publicly returns another suspended Digimon to play a Beast from its inherited end-of-attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-060", as: "antyHost", under: ["EX6-034"], suspended: true },
            { card: "BT1-009", as: "returned", suspended: true },
          ],
          hand: [{ card: "BT1-031", as: "beast" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("antyHost"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("beast").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returned").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("beast").instanceId)).toBe(
      true,
    );
  });

  it("publicly replays the returned Digimon itself when it is a level-3 Beast", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-060", as: "antyHost", under: ["EX6-034"], suspended: true },
            { card: "BT1-031", as: "returned", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("antyHost"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-031"));
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("returned").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returned").instanceId)).toBe(false);
  });

  it("keeps the suspended Digimon when the inherited return cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-060", as: "antyHost", under: ["EX6-034"], suspended: true },
            { card: "BT1-031", as: "returned", suspended: true },
          ],
          hand: [{ card: "BT1-031", as: "beast" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("antyHost"));
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("returned").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("beast").instanceId)).toBe(true);
  });
});
