import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-098.js";
import "./index.js";

describe("BT17-098 Hacker Pride", () => {
  it("reveals Pulsemon-text cards and places the Option in the battle area", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ to: "hand", count: 1, filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } }],
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("uses Delay to place only the selected Digimon's top card into Security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            targetIsPermanent: true,
            detachPermanentTop: true,
            destination: "security",
            position: "top",
            target: {
              count: 1,
              filter: {
                levelComparison: { op: "gte", value: 4 },
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }],
              },
            },
          },
        },
      ],
    });
  });

  it("preserves the same reveal-and-place sequence in Security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "RevealAdd" }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("adds a Pulsemon-text card and places itself through the public Main flow", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [{ card: "BT17-098", as: "option" }],
          deck: [{ card: "BT17-069", as: "match" }, "BT1-001", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const matchId = s.inst("match").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === matchId)).toBe(true);
  });

  it("naturally activates Delay to place the selected host's top card into Security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-098", as: "option" },
            { card: "BT17-036", as: "pulseHost", under: ["BT17-080"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 0;
    s.state.memory = 0;
    const topId = s.perm("pulseHost").topCard!.instanceId;
    const effects = observe(s.engine).activatableEffects(s.perm("option")) as Array<{
      effectKey: string;
      description?: string;
    }>;
    const delay = effects[0];
    expect(delay).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("option").instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === topId));

    expect(s.state.players[0]!.security.some((card) => card.instanceId === topId)).toBe(true);
    expect(s.perm("pulseHost").topCard?.cardId).toBe("BT17-080");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("naturally reveals the same Pulsemon-text search and places itself from Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT17-098", as: "securityOption" }],
          deck: [{ card: "BT17-069", as: "match" }, "BT1-001", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-098") &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-098")).toBe(true);
  });
  it("returns the two unchosen revealed cards to the bottom of the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [{ card: "BT17-098", as: "option" }, "BT1-012"],
          deck: [
            { card: "BT17-069", as: "match" },
            { card: "BT1-011", as: "restA" },
            { card: "BT1-013", as: "restB" },
            { card: "BT1-014", as: "floor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId));

    const deck = s.state.players[0]!.deck;
    const bottomTwo = deck.slice(-2).map((card) => card.instanceId);
    expect(bottomTwo).toEqual(expect.arrayContaining([s.inst("restA").instanceId, s.inst("restB").instanceId]));
    expect(deck[0]!.instanceId).toBe(s.inst("floor").instanceId);
    expect(deck).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  // Q2892: "top card" means 1 or more cards WITH cards underneath, so a Digimon with no
  // digivolution cards is not a legal host. Engine seam: the routed place-as-cost branch in
  // apps/api/src/engine/effects/interpreter/costs.ts (payCost, `cost.destination !== undefined`
  // + `targetIsPermanent`) calls resolvePermanentTargets(ctx, cost.target) without requiring
  // `permanent.stack.length > 0` when `cost.detachPermanentTop === true`. Expected: the bare
  // Boutmon is not offered and the Delay cannot be paid. Actual: its only card is placed on the
  // security stack, the permanent leaves the battle area, and 2 memory is gained.
  it("refuses the Delay when the only [Pulsemon]-text host has no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-098", as: "option" },
            { card: "BT17-036", as: "bareHost" },
            { card: "BT17-030", as: "lowHost", under: ["BT1-009"] },
            { card: "BT1-009", as: "textlessHost", under: ["BT1-011"] },
          ],
          hand: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 0;
    s.state.memory = 0;
    const bareId = s.perm("bareHost").topCard!.instanceId;

    const effects = observe(s.engine).activatableEffects(s.perm("option")) as Array<{ effectKey: string }>;
    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.inst("option").instanceId,
      effectKey: effects[0]!.effectKey,
    });
    if (result.ok) await settle(() => true);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === bareId)).toBe(true);
  });

  it("picks the level 4 or higher [Pulsemon]-text host over the ineligible peers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-098", as: "option" },
            { card: "BT17-030", as: "lowHost", under: ["BT1-009"] },
            { card: "BT1-009", as: "textlessHost", under: ["BT1-011"] },
            { card: "BT17-034", as: "legalHost", under: ["BT17-080"] },
          ],
          hand: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 0;
    s.state.memory = 0;
    const legalTopId = s.perm("legalHost").topCard!.instanceId;
    const lowTopId = s.perm("lowHost").topCard!.instanceId;
    const textlessTopId = s.perm("textlessHost").topCard!.instanceId;

    const effects = observe(s.engine).activatableEffects(s.perm("option")) as Array<{ effectKey: string }>;
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("option").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === legalTopId));

    // Q2893: the Tamer underneath becomes the top card and stays in the battle area as a Tamer.
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(legalTopId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("legalHost").topCard?.cardId).toBe("BT17-080");
    expect(s.perm("legalHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === lowTopId)).toBe(false);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === textlessTopId)).toBe(false);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
