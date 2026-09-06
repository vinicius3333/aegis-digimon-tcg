import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-082.js";
import "./index.js";

describe("BT20-082 DeathXmon", () => {
  it("has Security Attack +1, Reboot, and Blocker", () => {
    expect(
      compiled.effects
        .filter((effect) => effect.trigger === "Static")
        .flatMap((effect) => effect.keywords?.map((keyword) => keyword.keyword)),
    ).toEqual(["SecurityAttack", "Reboot", "Blocker"]);
  });

  it("prevents effect-caused departure by returning exactly three qualifying trash cards to deck bottom", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          mode: "prevent",
          leaveCause: "byEffect",
          cost: {
            kind: "return",
            position: "bottom",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Dex", "DeathX"], match: "name" }],
              },
              count: 3,
            },
          },
        },
      ],
    });
  });

  it("deletes all lowest-level Digimon once at the end of all turns", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Delete", target: { filter: { kind: ["Digimon"], superlative: "lowestLevel" }, count: "all" } },
      ],
    });
  });

  it("returns exactly three Dex/DeathX cards to keep this Digimon in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-082", as: "deathx" }],
          trash: ["BT17-065", "BT17-067", "BT17-073"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("deathx").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-082"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-065", "BT17-067", "BT17-073"]),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);

    const insufficient = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-082", as: "deathx" }],
          trash: ["BT17-065", "BT17-067"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await insufficient.ready();
    await advance(insufficient.engine).verb.deletePermanent([insufficient.perm("deathx").permanentId], "byEffect");
    await settle(() => insufficient.state.players[0]!.battleArea.length === 0);
    expect(insufficient.state.players[0]!.battleArea).toHaveLength(0);
    expect(insufficient.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-082", "BT17-065", "BT17-067"]),
    );
  });

  it("deletes every Digimon tied for the lowest level at End of All Turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-082", as: "deathx" },
          { card: "BT20-077", as: "ownLowest" },
        ],
      },
      1: { battleArea: [{ card: "BT20-079", as: "opponentLowest" }] },
    });
    await s.ready();
    await advance(s.engine).fireGlobal(EffectTiming.EndOfAllTurns);
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-082"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("reaches DeathXmon through its legal purple level-6 evolution route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-073", as: "purpleMega" }], hand: [{ card: "BT20-082", as: "deathx" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleMega").permanentId,
        instanceId: s.inst("deathx").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleMega").topCard.cardId === "BT20-082" && s.state.pendingDecision === undefined);
    expect(s.perm("purpleMega").stack.map((card) => card.cardId)).toEqual(["BT17-073"]);
    expect(s.state.memory).toBe(0);
  });

  it("publicly reboots and blocks during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-082", suspended: true, as: "deathx" }], security: ["BT1-010"] },
      1: { battleArea: [{ card: "BT20-047", as: "attacker" }], security: ["BT1-010", "BT1-010"], deck: ["BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("deathx").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "block" || s.events.some((event) => event.kind === "blockWindowOpened"),
    );
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("deathx").permanentId }),
    ).toMatchObject({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.security).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("performs two security checks from Security Attack +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-082", as: "deathx" }], security: ["BT1-010"], deck: ["BT1-010"] },
      1: { security: ["BT1-010", "BT1-010"], deck: ["BT1-010", "BT1-010"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deathx").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 2 &&
        s.events.some((event) => event.kind === "combatResolved"),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
