import { compiledEffects, getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import type { GameEngine } from "../../engine/GameEngine.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-040.js";
import "./BT11-106.js";

describe("BT11-040 Sukamon", () => {
  it("matches the exact catalog and complete direct/shared contracts", () => {
    expect(getCardDefinition("BT11-040")).toEqual({
      cardId: "BT11-040",
      set: "BT11",
      nameEn: "Sukamon",
      colors: ["Yellow", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 2 },
        { color: "Black", level: 3, memoryCost: 2 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Abnormal"],
      effectText:
        "[On Deletion] Reveal the top 3 cards of your deck. Add 1 card with [Chuumon], [Sukamon], or [Etemon] in its name among them to your hand. Trash the rest.",
      inheritedEffectText:
        "[All Turns] When this Digimon would be deleted, by deleting 1 other Digimon with [Sukamon] in its name, prevent that deletion.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT11-040",
      nameJp: "スカモン",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnDeletion",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    nameOrTrait: [
                      { tokens: ["Chuumon", "Sukamon"], match: "name" },
                      { tokens: ["Etemon"], match: "name" },
                    ],
                  },
                  count: 1,
                  to: "hand",
                },
              ],
              rest: "trash",
            },
          ],
        },
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "Replacement",
              event: "wouldBeDeleted",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "Prevent",
                  cost: {
                    kind: "deleteOwn",
                    target: {
                      filter: {
                        controller: "any",
                        excludeSelf: true,
                        kind: ["Digimon"],
                        nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
                      },
                      count: 1,
                    },
                    raw: "by deleting 1 other Digimon with [Sukamon] in its name",
                  },
                  optional: true,
                  abortOnDecline: true,
                },
              ],
            },
          ],
          isInherited: true,
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(compiledEffects["BT11-040"]).toEqual(compiled);
  });

  it("reveals exactly 3, adds one matching name, and trashes the rest", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-040", as: "sukamon" }],
          deck: [
            { card: "BT11-036", as: "chuumon" },
            { card: "BT1-001", as: "nonmatch" },
            { card: "BT11-041", as: "etemon" },
            { card: "BT1-002", as: "below" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("etemon").instanceId);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("sukamon").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("nonmatch").instanceId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("etemon").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("sukamon").instanceId,
        s.inst("chuumon").instanceId,
        s.inst("nonmatch").instanceId,
      ]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("below").instanceId]);
  });

  it.each([
    ["friendly", 0],
    ["opposing (Q2073)", 1],
  ] as const)("deletes a %s Sukamon to prevent its inherited host's deletion", async (_label, costSeat) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-042", as: "host", under: ["BT11-040"] },
            ...(costSeat === 0 ? ([{ card: "BT11-040", as: "cost" }] as const) : []),
          ],
        },
        1: { battleArea: costSeat === 1 ? [{ card: "BT11-040", as: "cost" }] : [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const costId = s.perm("cost").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(true);
    expect(s.state.players[costSeat]!.battleArea.some(({ permanentId }) => permanentId === costId)).toBe(false);
  });

  it("allows the inherited prevention cost to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-042", as: "host", under: ["BT11-040"] },
            { card: "BT11-040", as: "cost" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("cost").permanentId);
  });

  it("Q2074: does not recursively reactivate one immediate prevention during its resolution", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-043", as: "a", under: ["BT11-040"] },
            { card: "BT11-043", as: "b", under: ["BT11-040"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const aId = s.perm("a").permanentId;
    const bId = s.perm("b").permanentId;
    preferInstanceIds.push(s.inst("b").instanceId, s.inst("a").instanceId);

    await advance(s.engine).verb.deletePermanent([aId], "byEffect");

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === aId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === bId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("evolves from both printed colors for 2 and plays for 3 with 1000 DP", async () => {
    for (const base of ["BT11-037", "BT11-060"] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT11-040", as: "sukamon" }],
          deck: ["BT1-001"],
        },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("sukamon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT11-040");
      expect(s.state.memory).toBe(2);
      expect(s.perm("base").currentDP).toBe(1000);
    }

    const played = setupEngine({ 0: { hand: [{ card: "BT11-040", as: "sukamon" }] } });
    played.state.memory = 5;
    expect(played.engine.applyIntent(0, { type: "playCard", instanceId: played.inst("sukamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => played.state.players[0]!.battleArea.length === 1);
    expect(played.state.memory).toBe(2);
    expect(played.perm("sukamon").currentDP).toBe(1000);
  });
});

/**
 * Q1g repro/diagnosis. Found incidentally in Q1f: deleting BT11-040 (Sukamon) after it received
 * a granted "[On Deletion] ..." custom effect appeared to hang `deletePermanent` indefinitely.
 *
 * Root cause: BT11-040 already has its OWN native `OnDeletion` effect (RevealAdd). Once it is
 * also the recipient of a granted `OnDeletion` custom effect, deleting it makes TWO simultaneous
 * same-timing triggered effects fire off the SAME permanent, which correctly raises an
 * `orderTriggers` decision ("Multiple effects triggered. Choose which to resolve first.") per
 * `resolverDecisions.chooseOrder` / `stack.ts`'s `pickNext`. Nothing card- or Sukamon-specific
 * about this: ANY permanent carrying 2+ simultaneous mandatory same-timing effects hits the same
 * decision. It is NOT a cycle in `recomputeContinuousEffects` — that function's own re-entrancy
 * guard (`this.recomputing`) already makes a nested call a no-op, and it is not in play here at
 * all once the watcher has installed.
 *
 * The apparent "hang" is an unanswered decision, not an infinite loop: `GameEngine` always
 * constructs its `DecisionManager` with the real 60-second `DEFAULT_DECISION_TIMEOUT_MS`
 * (`GameEngine.ts`), which auto-resolves a stalled `orderTriggers` decision with a safe default
 * (`{ order: [] }`). `stack.ts`'s `pickNext` already coerces that decline to index 0 when not
 * every simultaneous effect is optional (exactly this case: BT11-040's own RevealAdd is
 * mandatory), so production self-heals in <=60s. Only a hand-rolled test/harness call that
 * forgets to answer the `orderTriggers` decision (no `autoOrderTriggers`, no manual
 * `respondDecision`) sees a promise that never settles within the test process.
 */
describe("Q1g — BT11-040 as a grant recipient (diagnosis, not a bug)", () => {
  function setup(options: { autoOrderTriggers?: boolean } = {}) {
    return setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-040", dp: 1000, as: "recipient" }],
          hand: [{ card: "BT11-106", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000 }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: options.autoOrderTriggers ?? false,
      },
    );
  }

  async function installGrantAndDelete(
    s: ReturnType<typeof setup>,
  ): Promise<{ del: Promise<number>; recipient: ReturnType<typeof s.perm> }> {
    const p0 = s.state.players[0]!;
    const option = s.inst("option");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as Pick<GameEngine, "applyIntent"> & {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.memory = 5;
    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(
      () =>
        !p0.hand.some((c) => c.instanceId === option.instanceId) &&
        engine.continuous.listCustomEffectGrants().length > 0,
      3000,
    );

    // Reset to a clean baseline AFTER the play cost was paid, so the memory assertion below
    // isolates the granted effect's own delta from the card's own play cost (BT11-106.test.ts
    // follows the same pattern).
    s.state.memory = 5;

    await engine.recomputeContinuousEffects();

    const del = engine.primitives.deletePermanent([recipient.permanentId], "byEffect");
    return { del, recipient };
  }

  it("resolves simultaneous native and granted On Deletion effects without a stale order decision", async () => {
    const s = setup({ autoOrderTriggers: true });
    const recipientInstanceId = s.perm("recipient").topCard!.instanceId;
    const { del } = await installGrantAndDelete(s);

    const timeout = new Promise<"TIMED_OUT">((resolve) => setTimeout(() => resolve("TIMED_OUT"), 2000));
    const result = await Promise.race([del.then(() => "DONE" as const), timeout]);

    expect(result).toBe("DONE");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === recipientInstanceId)).toBe(true);
  }, 10_000);

  it("resolves the production order decision without leaving a stale prompt", async () => {
    const s = setup({ autoOrderTriggers: true });
    const { del, recipient } = await installGrantAndDelete(s);

    const deleted = await del;
    expect(deleted).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === recipient.permanentId)).toBe(false);
  }, 15_000);
});
