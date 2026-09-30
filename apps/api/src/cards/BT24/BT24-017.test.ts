import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-017.js";
import "../index.js";
import "../BT19/BT19-006.js";
import "../BT19/BT19-020.js";

describe("BT24-017 Medusamon", () => {
  it("deletes the lowest-DP Digimon, pays the exact two-card trash cost, and scales DP", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, colors: ["Red"], cost: 3, isAlternate: false }]);
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")!;
    expect(effect.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestDP" } },
    });
    expect(effect.actions?.[1]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "return", target: { count: 2 } },
      actions: [
        { kind: "PlayToken", tokens: ["Petrification Token"], count: 2, placedAs: "opponentDigimon" },
        { kind: "ModifyDP", amount: 2000, scaling: { per: 1, unit: "cards" } },
      ],
    });
  });

  it("deletes the lowest opposing Digimon and returns two opposing trash cards for tokens", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-017", as: "source", dp: 11000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 3000 },
            { card: "BT1-009", as: "higher", dp: 5000 },
          ],
          trash: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    const lowestId = s.perm("lowest").permanentId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("higher").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    const tokens = s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard?.cardId.startsWith("TOKEN-"));
    expect(tokens).toHaveLength(2);
    expect(tokens.every((token) => token.controllerSeat === 1 && token.currentDP === 3000)).toBe(true);
    expect(s.perm("source").currentDP).toBe(17000);
  });

  it("resolves the complete clause chain through public digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-016", as: "base" }], hand: [{ card: "BT24-017", as: "medusamon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 3000 },
            { card: "BT1-010", as: "higher", dp: 5000 },
          ],
          trash: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowestId = s.perm("lowest").permanentId;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT24-017");
    expect(s.perm("base").topCard.cardId).toBe("BT24-017");
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowestId)).toBe(false);
    expect(s.state.players[1]!.battleArea.filter((p) => p.topCard.cardId === "TOKEN-Petrification-Token")).toHaveLength(
      2,
    );
    expect(s.state.memory).toBe(2);
  });

  it("uses the activating player’s ordered trash choices and expires the DP boost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-016", as: "base" }], hand: [{ card: "BT24-017", as: "medusamon" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "lowest", dp: 3000 }],
          trash: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("second").instanceId, s.inst("first").instanceId);
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT24-017");
    expect(s.state.players[1]!.deck.slice(-2).map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    expect(s.perm("base").currentDP).toBe(15000);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("base").currentDP).toBe(11000);
  });

  it("does not play tokens or gain DP when the two-card return cost is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-017", as: "source", dp: 11000 }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }],
          trash: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("source").currentDP).toBe(11000);
  });

  it("requires exactly two trash cards for the token and DP branch", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-017", as: "source", dp: 11000 }] },
        1: {
          trash: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("source").currentDP).toBe(11000);
  });

  it("Q5593 returns a deleted card before its pending On Deletion can activate", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-016", as: "base" }],
          hand: [{ card: "BT24-017", as: "medusamon" }],
        },
        1: {
          battleArea: [{ card: "BT19-020", as: "pending", dp: 1000 }],
          hand: [{ card: "BT19-019", as: "kiriha" }],
          trash: [{ card: "BT1-010", as: "filler" }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const deletedId = s.perm("pending").topCard.instanceId;
    preferred.push(deletedId, s.inst("filler").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT24-017");

    expect(s.perm("base").topCard.cardId).toBe("BT24-017");
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([deletedId, s.inst("filler").instanceId]),
    );
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === deletedId)).toBe(false);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("kiriha").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT19-020")).toBe(false);
  });

  // CR 4-11-2 / 15-10-1-1: the token's "you"/"your" is the player using it, i.e. the opponent
  // whose battle area it sits in, not the Medusamon player who supplied the token (Q5594).
  it("gives Petrification Tokens their printed suspension lock and security-trash deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-017", as: "source" }], security: ["BT1-012", "BT1-013"] },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000 }],
          trash: ["BT1-009", "BT1-010"],
          security: ["BT1-014", "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    const token = s.state.players[1]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token",
    )!;
    expect(observe(s.engine).isRestricted(token, "suspend")).toBe(false);
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).isRestricted(token, "suspend")).toBe(true);
    await advance(s.engine).verb.deletePermanent([token.permanentId], "byEffect");

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("exposes Raid, Progress, and Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-017", as: "medusamon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("medusamon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("medusamon"), "Progress")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("medusamon"))).toBe(true);
  });
});

describe("BT24-017 Medusamon — KB Q&A rulings", () => {
  function medusamonBoard(opponentTrash: { card: string; as: string }[], opponentExtra: object = {}) {
    return {
      0: { battleArea: [{ card: "BT24-017", as: "source", dp: 11000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "lowest", dp: 3000 }], trash: opponentTrash, ...opponentExtra },
    };
  }

  function petrificationTokens(s: ReturnType<typeof setupEngine>) {
    return s.state.players[1]!.battleArea.filter(
      (permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token",
    );
  }

  it("lets the activating player choose which opposing trash cards return and in what order (Q5589)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      medusamonBoard([
        { card: "BT1-010", as: "first" },
        { card: "BT1-011", as: "skipped" },
        { card: "BT1-012", as: "second" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("second").instanceId, s.inst("first").instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    const trashChoice = s.decisions.find(({ req }) =>
      (req.options?.candidateInstanceIds ?? []).includes(s.inst("skipped").instanceId),
    );
    expect(trashChoice?.seat).toBe(0);
    expect(s.decisions.filter(({ seat }) => seat === 1)).toEqual([]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("skipped").instanceId);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });

  it("counts a Digi-Egg sent to the Digi-Egg deck as one of the two returned cards (Q5590)", async () => {
    const s = setupEngine(
      medusamonBoard([
        { card: "BT24-005", as: "egg" },
        { card: "BT1-010", as: "card" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[1]!.eggDeck.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("card").instanceId]);
    expect(petrificationTokens(s)).toHaveLength(2);
    expect(s.perm("source").currentDP).toBe(15000);
  });

  it("skips the tokens and the DP gain after 'after' when the two-card return is not paid (Q5591)", async () => {
    const s = setupEngine(
      medusamonBoard([
        { card: "BT1-010", as: "first" },
        { card: "BT1-011", as: "second" },
      ]),
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(petrificationTokens(s)).toEqual([]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(s.perm("source").currentDP).toBe(11000);
  });

  it("cannot pay the cost by returning only 1 card, so it plays no tokens and gains no DP (Q5592)", async () => {
    const s = setupEngine(medusamonBoard([]), { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(petrificationTokens(s)).toEqual([]);
    expect(s.perm("source").currentDP).toBe(11000);
  });

  // Q5594's "token of the activating player" is the physical token card, returned to that player
  // outside the game. In play the opponent uses it (CR 4-11-2), and CR 4-21-5 removes it from the
  // game when it leaves the field, so no zone of either player ever receives it.
  it("plays the tokens under the opponent's control, and a removed token goes to no one's cards (Q5594)", async () => {
    const s = setupEngine(
      medusamonBoard([
        { card: "BT1-010", as: "first" },
        { card: "BT1-011", as: "second" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    const [token] = petrificationTokens(s);
    expect(petrificationTokens(s).map((permanent) => permanent.controllerSeat)).toEqual([1, 1]);
    const tokenId = token!.topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([token!.permanentId], "byEffect");

    expect(petrificationTokens(s)).toHaveLength(1);
    const zones = [...s.state.players].flatMap((player) => [player.hand, player.deck, player.trash, player.security]);
    expect(zones.some((zone) => zone.some((card) => card.instanceId === tokenId))).toBe(false);
  });

  it("still plays the tokens after its own Crimson Blaze stopped the opponent playing Digimon by effects (Q5595)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-016", as: "base" }],
          hand: [
            { card: "BT8-097", as: "crimsonBlaze" },
            { card: "BT24-017", as: "medusamon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000 },
            { card: "BT1-010", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimsonBlaze").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => petrificationTokens(s).length === 2);

    expect(petrificationTokens(s).every((token) => token.controllerSeat === 1)).toBe(true);
    expect(s.perm("base").currentDP).toBe(15000);
  });

  it("finishes the part after 'then' even when a would-leave effect removed Medusamon mid-resolution (Q6027)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-017", as: "source", dp: 11000 }] },
        1: {
          battleArea: [
            { card: "BT24-008", as: "lowest" },
            { card: "BT24-018", as: "styracomon" },
          ],
          trash: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT24-017");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("lowest").permanentId,
    );
    expect(petrificationTokens(s)).toHaveLength(2);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });
});
