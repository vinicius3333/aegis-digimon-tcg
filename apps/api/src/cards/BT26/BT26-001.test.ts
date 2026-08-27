import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-001.js";
import "../index.js";

const CARD_ID = "BT26-001";

describe("BT26-001 Yokomon", () => {
  it("encodes the inherited once-per-turn Chronomon-text digivolution watcher", () => {
    expect(compiled.effects).toMatchObject([
      {
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        isInherited: true,
        actions: [
          {
            kind: "SubTrigger",
            event: "whenEffectAddsToDeck",
            actions: [{ kind: "Digivolve", from: ["hand"], costDelta: -1, optional: true }],
          },
        ],
      },
    ]);
  });

  it("Q6948/Q6951 publicly evolves after its effect adds an opponent's card to their deck, pays printed cost -1, and draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "host", under: [{ card: CARD_ID, as: "yokomon" }] }],
          hand: [
            { card: "BT26-060", as: "illegalChronomonText" },
            { card: "BT26-015", as: "chronomonText" },
          ],
          deck: [{ card: "BT1-001", as: "bonusDraw" }],
        },
        1: { trash: [{ card: "BT1-009", as: "opponentCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("opponentCard").instanceId]);

    expect(s.perm("host").topCard.cardId).toBe("BT26-015");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("illegalChronomonText").instanceId,
    );
  });

  it("does not offer a Chronomon-text Digimon that cannot evolve onto the current stack top", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "host", under: [CARD_ID] }],
          hand: [{ card: "BT26-060", as: "illegalChronomonText" }],
          trash: [{ card: "BT1-001", as: "moved" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("moved").instanceId]);

    expect(s.perm("host").topCard.cardId).toBe("BT26-013");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("illegalChronomonText").instanceId,
    );
  });

  it("may decline the triggered digivolution without spending memory or moving the candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "host", under: [CARD_ID] }],
          hand: [{ card: "BT26-015", as: "candidate" }],
          trash: [{ card: "BT1-001", as: "moved" }],
          deck: ["BT1-002"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("moved").instanceId]);

    expect(s.perm("host").topCard.cardId).toBe("BT26-013");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
  });

  it("does not react when an effect adds to a deck during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "host", under: [CARD_ID] }],
          hand: [{ card: "BT26-015", as: "candidate" }],
          trash: [{ card: "BT1-009", as: "moved" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("moved").instanceId]);

    expect(s.perm("host").topCard.cardId).toBe("BT26-013");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("moved").instanceId);
  });

  it("spends its once-per-turn budget only after a successful evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "host", under: [CARD_ID] }],
          hand: [
            { card: "BT26-015", as: "first" },
            { card: "BT26-015", as: "second" },
          ],
          trash: [
            { card: "BT1-001", as: "move1" },
            { card: "BT1-002", as: "move2" },
          ],
          deck: ["BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("move1").instanceId]);
    const evolvedTop = s.perm("host").topCard.instanceId;
    await advance(s.engine).verb.returnToDeck([s.inst("move2").instanceId], { toTop: true });

    expect(s.perm("host").topCard.instanceId).toBe(evolvedTop);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("second").instanceId)).toBe(true);
  });

  it("does not react when a revealed deck card is simply restored without a cards-moved event (Q6949)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-013", as: "host", under: [CARD_ID] }],
        hand: [{ card: "BT26-015", as: "candidate" }],
        deck: [{ card: "BT1-001", as: "revealed" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const revealed = s.state.players[0]!.deck.pop()!;
    s.state.players[0]!.deck.push(revealed);

    expect(s.perm("host").topCard.cardId).toBe("BT26-013");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.deck.at(-1)).toMatchObject({ instanceId: s.inst("revealed").instanceId, faceUp: false });
  });

  it("does not react when RevealAdd restores the unchosen revealed cards (Q6949)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "host", under: [CARD_ID] }],
          hand: [
            { card: "BT26-036", as: "revealer" },
            { card: "BT26-015", as: "candidate" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revealer").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("BT26-013");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
  });
});
