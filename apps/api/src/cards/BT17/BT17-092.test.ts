import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import "../BT15/BT15-090.js";
import "../BT10/BT10-022.js";
import { compiled } from "./BT17-092.js";

describe("BT17-092 Menoa Bellucci", () => {
  it("trashes Morphomon or Eosmon to draw two on play", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: { zone: "hand", nameOrTrait: [{ tokens: ["Morphomon", "Eosmon"], match: "nameExact" }] },
            },
          },
        },
      ],
    });
  });

  it("uses a live All Turns timing mask for opponent Tamer On Play effects while Eosmon is present", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Eosmon"], match: "nameExact" }] } },
      actions: [
        {
          kind: "DisableTimingEffect",
          target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: "all" },
          timings: ["onPlay"],
          duration: "permanent",
        },
      ],
    });
  });

  it("prevents only an opponent-effect departure and pays by deleting another Eosmon", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "byOpponentEffect",
          sourceFilter: { nameOrTrait: [{ tokens: ["Eosmon"], match: "nameExact" }] },
          actions: [
            {
              kind: "Prevent",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    excludeSelf: true,
                    excludeLeavingSubject: true,
                    nameOrTrait: [{ tokens: ["Eosmon"], match: "nameExact" }],
                  },
                  count: 1,
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("naturally trashes a Morphomon and draws two when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-044", as: "morphomon" },
          ],
          deck: [
            { card: "BT1-001", as: "drawnOne" },
            { card: "BT1-002", as: "drawnTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("menoa").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("morphomon").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("morphomon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawnOne").instanceId, s.inst("drawnTwo").instanceId]),
    );
  });

  it("naturally suppresses an opponent Tamer's On Play effect while Eosmon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-074", as: "eosmon" },
          ],
        },
        1: { hand: [{ card: "BT17-087", as: "marcus" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-087"));

    expect(observe(s.engine).timingEffectDisabled(s.perm("marcus"), "onPlay")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(false);
  });

  it("naturally uses the once-per-turn replacement only for an opponent-effect departure", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-074", as: "protectedEosmon" },
            { card: "BT17-074", as: "otherEosmon" },
          ],
        },
        1: {
          hand: [
            { card: "BT17-017", as: "firstAncient" },
            { card: "BT17-017", as: "secondAncient" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 30;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstAncient").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074").length === 1,
    );
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074")).toHaveLength(
      1,
    );

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondAncient").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074").length === 0,
    );
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074")).toHaveLength(
      0,
    );
  });

  it("naturally masks only the On Play window of an opponent Tamer with two timings (Q2875)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-074", as: "eosmon" },
          ],
          hand: [
            { card: "BT1-009", as: "handOne" },
            { card: "BT1-010", as: "handTwo" },
            { card: "BT1-011", as: "handThree" },
            { card: "BT1-012", as: "handFour" },
            { card: "BT1-013", as: "handFive" },
            { card: "BT1-014", as: "handSix" },
            { card: "BT1-009", as: "handSeven" },
            { card: "BT1-010", as: "handEight" },
          ],
        },
        1: {
          battleArea: [{ card: "BT4-021", as: "gaomon" }],
          hand: [
            { card: "BT4-093", as: "thomas" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [{ card: "BT1-001", as: "blockedDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("thomas").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT4-093"));

    // [On Play] Draw 1 never activated: the card stays on top of the deck.
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("blockedDraw").instanceId);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toContain(s.inst("blockedDraw").instanceId);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(observe(s.engine).timingEffectDisabled(s.perm("thomas"), "onPlay")).toBe(true);
    // Q2875: the [Main] timing is untouched, so the Tamer still offers an activatable effect.
  });

  // Q2876: "would leave the battle area" also covers a return to the hand, which the test below
  // proves through a real opponent Option (BT15-090 Fox Fire) rather than the deletion route only.
  it("Q2876: prevents an opponent bounce by deleting another Eosmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-074", as: "eosmonOne" },
            { card: "BT17-074", as: "eosmonTwo" },
          ],
        },
        1: {
          battleArea: [{ card: "BT10-022", as: "blueSource" }],
          hand: [
            { card: "BT15-090", as: "foxFire" },
            { card: "BT1-009", as: "spare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("foxFire").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT15-090"));

    // The bounce is prevented: no Eosmon reaches seat 0's hand, one Eosmon stays on the field and
    // the other was deleted as the prevention cost.
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074")).toHaveLength(
      1,
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT17-074"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resets the once-per-turn prevention on the next opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-074", as: "eosmonOne" },
            { card: "BT17-074", as: "eosmonTwo" },
            { card: "BT17-074", as: "eosmonThree" },
            { card: "BT17-074", as: "eosmonFour" },
          ],
          hand: [{ card: "BT1-010", as: "ownSpare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          hand: [
            { card: "BT17-017", as: "firstDeleter" },
            { card: "BT17-017", as: "secondDeleter" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const turns = advance(s.engine);
    s.state.turnSeat = 1;
    s.state.memory = 30;
    await s.ready();

    // First opponent turn: the replacement pays with one Eosmon, so two Eosmon are consumed.
    const firstOpponentTurn = s.engine.runOneTurn();
    await turns.waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstDeleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074")).toHaveLength(
      3,
    );
    turns.endMainPhaseIfOpen(1);
    await firstOpponentTurn;

    // The harness chains hand-laid turns: the caller sets the seat and memory before each turn.
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await turns.runTurn(0);

    // Second opponent turn: the once-per-turn use is available again.
    s.state.turnSeat = 1;
    s.state.memory = 30;
    const secondOpponentTurn = s.engine.runOneTurn();
    await turns.waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondDeleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);
    turns.endMainPhaseIfOpen(1);
    await secondOpponentTurn;

    // Two deletions, two prevention costs paid, and two Eosmon still standing.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT17-074", "BT17-074"]);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074")).toHaveLength(
      2,
    );
  });

  it("cannot prevent the departure when no other Eosmon can pay the deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-074", as: "loneEosmon" },
          ],
        },
        1: {
          hand: [
            { card: "BT17-017", as: "ancient" },
            { card: "BT1-009", as: "spare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 30;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT17-074"));

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074")).toHaveLength(
      0,
    );
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT17-074")).toHaveLength(1);
  });

  it("leaves a non-Eosmon departure untouched and keeps the Eosmon fuel in play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-092", as: "menoa" },
            { card: "BT17-074", as: "eosmon" },
            { card: "BT1-009", as: "bystander" },
          ],
        },
        1: {
          hand: [
            { card: "BT17-017", as: "ancient" },
            { card: "BT1-010", as: "spare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 30;
    await s.ready();
    preferred.push(s.inst("bystander").instanceId);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("bystander").instanceId));

    // The replacement is scoped to [Eosmon]: the Monodramon leaves and no Eosmon is spent.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("bystander").instanceId]);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT17-074")).toHaveLength(
      1,
    );
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("naturally plays itself from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT17-092", as: "securityMenoa" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-092"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-092")).toBe(true);
  });
});
