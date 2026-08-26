import { describe, expect, it } from "vitest";
import { runStaticAction } from "../../engine/effects/interpreter/actions/statics.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
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
        filter: {
          nameOrTrait: [
            { match: "name", tokens: ["MetalGarurumon"] },
            { match: "trait", tokens: ["X Antibody"] },
          ],
        },
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
  it("grants later matching battle entrants exactly once through opponent-turn end", async () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0];
    const installs: unknown[] = [];
    const grants: unknown[][] = [];
    const sourcePermanent = {
      permanentId: "source-permanent",
      controllerSeat: 0,
      currentDP: 11000,
      stack: [{ cardId: "x-antibody-source", instanceId: "x-antibody-source-top", ownerSeat: 0 }],
      topCard: { cardId: "EX5-026", instanceId: "source-top", ownerSeat: 0 },
    };
    const currentOpponent = {
      permanentId: "current-opponent",
      controllerSeat: 1,
      currentDP: 3000,
      stack: [],
      topCard: { instanceId: "current-opponent-top", ownerSeat: 1 },
    };
    const laterOpponent = {
      permanentId: "later-opponent",
      controllerSeat: 1,
      currentDP: 3000,
      stack: [],
      topCard: { instanceId: "later-opponent-top", ownerSeat: 1 },
    };
    const ownEntrant = {
      permanentId: "own-entrant",
      controllerSeat: 0,
      currentDP: 3000,
      stack: [],
      topCard: { instanceId: "own-entrant-top", ownerSeat: 0 },
    };
    const permanents = new Map([
      [currentOpponent.permanentId, currentOpponent],
      [laterOpponent.permanentId, laterOpponent],
      [ownEntrant.permanentId, ownEntrant],
    ]);
    const definition = { kinds: ["Digimon"], colors: [], types: [] };
    const ctx = {
      source: { ownerSeat: 0, definition, permanent: () => sourcePermanent },
      game: {
        opponentOf: () => 1,
        permanentById: (id: string) => permanents.get(id),
        player: (seat: number) => ({ battleArea: seat === 1 ? [currentOpponent] : [], breeding: undefined }),
        definitionOf: (card: { cardId?: string }) =>
          card.cardId === "x-antibody-source" ? { ...definition, types: ["X Antibody"] } : definition,
      },
      fx: {
        grantCustomEffect: (...args: unknown[]) => grants.push(args),
        subscribeSubTrigger: (install: unknown) => (installs.push(install), 1),
      },
    } as any;
    if (action?.kind !== "GrantAuraToOpponents") throw new Error("missing EX5-026 timed aura");
    await runStaticAction(ctx, action);
    expect(grants).toHaveLength(1);
    expect(installs).toHaveLength(1);
    const watcher = installs[0] as {
      event: string;
      expiresOnTurnEndOf?: number;
      matches: (subCtx: unknown) => boolean;
      run: (subCtx: unknown) => Promise<void>;
    };
    expect(watcher.event).toBe("onEnterFieldAnyone");
    expect(watcher.expiresOnTurnEndOf).toBe(1);

    const entrantContext = (id: string) =>
      ({
        ...ctx,
        trigger: { subjectPermanentId: id, entryCause: "move" },
      }) as EffectContext;
    // Movement from breeding is an actual battle-area entry, but not a play.
    const laterContext = entrantContext("later-opponent");
    expect(watcher.matches(laterContext)).toBe(true);
    await watcher.run(laterContext);
    await watcher.run(laterContext);
    expect(grants).toHaveLength(2);

    // A friendly entrant never receives the opponent-only grant.
    expect(watcher.matches(entrantContext("own-entrant"))).toBe(false);
    // `expiresOnTurnEndOf` is swept by SubTriggerRegistry at the opponent's turn end;
    // retaining it here makes the cleanup boundary part of the card's focused contract.
    expect(watcher.expiresOnTurnEndOf).toBe((ctx as any).game.opponentOf((ctx as any).source.ownerSeat));
  });
});
