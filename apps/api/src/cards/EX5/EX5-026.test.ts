import { describe, expect, it } from "vitest";
import { runStaticAction } from "../../engine/effects/interpreter/actions/statics.js";
import { compiled } from "./EX5-026.js";

describe("EX5-026 MetalGarurumon (X Antibody)", () => {
  it("has Blocker and gives opposing Digimon the conditional lose-four-memory attack effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Blocker" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      target: { count: "all" },
      effectText: "[When Attacking] Lose 4 memory",
      duration: "untilOpponentTurnEnd",
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: { nameOrTrait: [{ match: "name", tokens: ["MetalGarurumon", "X Antibody"] }] },
      },
    });
  });
  it("returns a trash Digimon to deck bottom and deletes an opposing Digimon of the returned level", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0];
    expect(action).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", levelEq: "returnedDigimonLevel" } },
      cost: { kind: "return", to: "deckBottom", storeAs: "returnedDigimonLevel" },
    });
    expect(action).not.toHaveProperty("optional");
  });
  it("installs a duration-bound entrant watcher alongside grants for current opponents", async () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0];
    const installs: unknown[] = [];
    const grants: unknown[] = [];
    const opponent = { permanentId: "opponent", topCard: { instanceId: "opponent-top", ownerSeat: 1 } };
    const ctx = {
      source: { ownerSeat: 0 },
      game: { opponentOf: () => 1, permanentById: (id: string) => (id === "opponent" ? opponent : undefined) },
      fx: {
        grantCustomEffect: (...args: unknown[]) => grants.push(args),
        subscribeSubTrigger: (install: unknown) => (installs.push(install), 1),
      },
    } as never;
    if (action?.kind !== "GrantAuraToOpponents") throw new Error("missing EX5-026 timed aura");
    await runStaticAction(ctx, action);
    expect(grants).toHaveLength(1);
    expect(installs).toHaveLength(1);
  });
});
