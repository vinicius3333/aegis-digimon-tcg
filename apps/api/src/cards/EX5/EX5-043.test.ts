import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-043.js";
import "./EX5-043.js";

describe("EX5-043 Leopardmon (X Antibody)", () => {
  it("registers once-per-turn When Digivolving and Main play effects plus the play-triggered bounce effect", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-043",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-043")!;
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]?.maxPerTurn).toBe(1);
    expect(module.effectsForTiming(EffectTiming.OnDeclaration, source)[0]?.maxPerTurn).toBe(1);
    const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn");
    expect(watcher?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed" });
    for (const trigger of ["Main", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toContainEqual(
        expect.objectContaining({
          kind: "PlayWithoutCost",
          reduceCostBy: 4,
          reduceCostByIf: {
            amount: 3,
            condition: expect.objectContaining({
              kind: "selfDigivolutionStackHasTrait",
              filter: {
                nameOrTrait: [
                  { tokens: ["Leopardmon"], match: "name" },
                  { tokens: ["X Antibody"], match: "nameExact" },
                ],
              },
            }),
          },
        }),
      );
    }
    if (watcher === undefined) throw new Error("EX5-043 play watcher is missing");
    const watcherAction = watcher.actions[0];
    if (watcherAction?.kind !== "SubTrigger") throw new Error("EX5-043 play watcher action is missing");
    expect(watcherAction.actions).toContainEqual(
      expect.objectContaining({ kind: "Return", dpCeilingScaling: expect.objectContaining({ amount: 3000 }) }),
    );
  });

  it("returns an opposing 5000 DP Digimon when your Digimon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-043", as: "source" }], hand: [{ card: "BT1-009", as: "played" }] },
        1: { battleArea: [{ card: "BT1-021", dp: 5000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-021")).toBe(false);
  });

  it("leaves an opposing 6000 DP Digimon when no other own Digimon raises the ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-043", as: "source" }], hand: [{ card: "BT1-009", as: "played" }] },
        1: { battleArea: [{ card: "BT1-021", dp: 9000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)).toBe(true);
  });
});
