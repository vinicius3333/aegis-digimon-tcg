import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-063.js";

describe("BT14-063", () => {
  it("on deletion reveals three to add Monzaemon and play Numemon without cost", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { to: "hand", filter: { nameOrTrait: [{ tokens: ["Monzaemon"], match: "name" }] } },
        { to: "play", payCost: false, filter: { nameOrTrait: [{ tokens: ["Numemon"], match: "name" }] } },
      ],
    }));
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));

  it("exposes inherited Blocker on the host Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-042", as: "host", under: ["BT14-063"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("naturally resolves On Deletion by adding Monzaemon, playing Numemon, and bottom-decking the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-063", as: "source", suspended: true }],
          deck: ["BT1-038", "BT14-058", "BT14-089"],
        },
        1: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "BT1-038") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-058"),
    );

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-038");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-058")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT14-089"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-063")).toBe(true);
  });

  it("uses inherited Blocker in a natural attack and keeps the player attack off security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-067", as: "host", under: ["BT14-063"] }],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "attacker", dp: 4000 }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("host").permanentId],
    });

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-015"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId),
    ).toBe(true);
  });
});

describe("BT14-063 BlackKingNumemon — KB Q&A rulings", () => {
  const deleteBlackKingNumemonRevealing = async (deck: string[], autoSelectCards: boolean) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-063", as: "source", suspended: true }], deck },
        1: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 9000 }] },
      },
      { autoSelectCards },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    return s;
  };

  it("still adds or plays the one matching card when only one kind is revealed (Q2434)", async () => {
    const onlyMonzaemon = await deleteBlackKingNumemonRevealing(["BT1-038", "BT1-009", "BT14-089"], true);
    await settle(() => onlyMonzaemon.state.players[0]!.hand.some((card) => card.cardId === "BT1-038"));
    expect(onlyMonzaemon.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-038"]);
    expect(onlyMonzaemon.state.players[0]!.battleArea).toHaveLength(0);
    expect(onlyMonzaemon.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT14-089"]);

    const onlyNumemon = await deleteBlackKingNumemonRevealing(["BT14-058", "BT1-009", "BT14-089"], true);
    await settle(() =>
      onlyNumemon.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-058"),
    );
    expect(onlyNumemon.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT14-058"]);
    expect(onlyNumemon.state.players[0]!.hand).toHaveLength(0);
  });

  it("must both add the Monzaemon card and play the Numemon card when both are revealed (Q2435)", async () => {
    const s = await deleteBlackKingNumemonRevealing(["BT1-038", "BT14-058", "BT14-089"], false);
    const monzaemonId = s.state.players[0]!.deck[0]!.instanceId;
    const numemonId = s.state.players[0]!.deck[1]!.instanceId;

    const answerRefusingThenPicking = async (expectedCandidateId: string) => {
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const decision = s.decisions.at(-1)!.req;
      expect(decision.options).toMatchObject({ min: 1, max: 1, candidateInstanceIds: [expectedCandidateId] });
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }),
      ).toMatchObject({ ok: false });
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "selectCards", instanceIds: [expectedCandidateId] },
        }),
      ).toEqual({ ok: true });
    };

    await answerRefusingThenPicking(monzaemonId);
    await answerRefusingThenPicking(numemonId);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === numemonId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([monzaemonId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([numemonId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT14-089"]);
  });
});
