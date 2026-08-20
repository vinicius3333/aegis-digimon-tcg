import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-098.js";

describe("BT22-098 Unique Emblem: Fable Waltz", () => {
  it("requires both Puppet and LIBERATOR traits for the Delay digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    const watcher = effect?.actions[0] as any;
    const digivolve = watcher.actions[0];

    expect(effect?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(digivolve).toMatchObject({ kind: "Digivolve", reduceCost: 3, optional: true });
    expect(digivolve.into.and).toEqual([
      { nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] },
      { nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
    ]);
  });

  it("places itself after the optional Main play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.actions).toMatchObject([
      { kind: "PlayWithoutCost", optional: true },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    expect((effect?.actions[1] as any).optional).toBeUndefined();
  });

  it("activates its Main effects from Security", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(effect).toMatchObject({ isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });

  it("plays Shoemon and places the same Option through its public Main resolution", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-098", as: "emblem" },
            { card: "BT22-029", as: "shoemon" },
          ],
          battleArea: ["BT22-029"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const emblemId = s.inst("emblem").instanceId;
    const shoemonId = s.inst("shoemon").instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === emblemId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shoemonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === emblemId)).toBe(true);
  });
});
