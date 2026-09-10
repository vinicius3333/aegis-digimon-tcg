import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-082.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-020.js";
import "../BT1/BT1-085.js";
import "../ST1/ST1-16.js";
import "./index.js";

describe("BT20-082 DeathXmon", () => {
  it("publishes the complete catalog identity and printed clauses", () => {
    expect(getCardDefinition("BT20-082")).toMatchObject({
      nameEn: "DeathXmon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Unanalyzable", "X Program"],
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 5 }],
      effectText: expect.stringContaining("returning 3 cards with [Dex]/[DeathX]"),
    });
    expect(getCardDefinition("BT20-082")?.effectText).toContain("[End of All Turns] [Once Per Turn]");
  });

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
          battleArea: [
            { card: "BT20-082", as: "deathx" },
            { card: "BT1-009", as: "lowestDecoy" },
          ],
          trash: ["BT17-065", "BT17-067", "BT17-073"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-085", as: "redSource" }],
          hand: [{ card: "ST1-16", as: "gaia" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const deathxId = s.perm("deathx").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.deck.length === 5 &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009") &&
        s.state.players[0]!.trash.filter((card) => card.cardId !== "BT1-009").length === 0,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === deathxId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-065", "BT17-067", "BT17-073"]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    const insufficient = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-082", as: "deathx" },
            { card: "BT1-009", as: "lowestDecoy" },
          ],
          trash: ["BT17-065", "BT17-067"],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-085", as: "redSource" }],
          hand: [{ card: "ST1-16", as: "gaia" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const insufficientId = insufficient.perm("deathx").permanentId;
    const insufficientLoop = insufficient.engine.startTurnLoop();
    await advance(insufficient.engine).waitForMainPhase(0);
    advance(insufficient.engine).endMainPhaseIfOpen(0);
    await advance(insufficient.engine).waitForMainPhase(1);
    insufficient.state.memory = 10;
    expect(
      insufficient.engine.applyIntent(1, { type: "playCard", instanceId: insufficient.inst("gaia").instanceId }),
    ).toEqual({ ok: true });
    await settle(
      () => !insufficient.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === insufficientId),
    );
    expect(insufficient.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-082", "BT17-065", "BT17-067"]),
    );
    expect(insufficient.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await insufficientLoop;
  });

  it("deletes every tied lowest-level Digimon and re-arms at the next end of turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-082", as: "deathx" },
          { card: "BT20-077", as: "ownLowest" },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT20-079", as: "opponentLowest" }],
        hand: [{ card: "BT20-047", as: "nextLowest" }],
        deck: ["BT1-009", "BT1-009"],
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-082"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("nextLowest").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-047"));
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
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
      0: {
        battleArea: [
          { card: "BT20-082", suspended: true, as: "deathx" },
          { card: "BT1-010", as: "inert" },
        ],
        security: ["BT1-010", "BT1-010"],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-020", as: "attacker" },
          { card: "BT1-009", as: "lowestDecoy" },
        ],
        security: ["BT1-010", "BT1-010"],
        deck: ["BT1-010", "BT1-010"],
      },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("deathx").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
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
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
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
    // This is a player-directed, unblocked attack, so it resolves through security checks
    // rather than emitting `combatResolved` (that event only fires for a resolved
    // Digimon-vs-Digimon battle; see combat/controller.ts's `completedCombat`).
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
