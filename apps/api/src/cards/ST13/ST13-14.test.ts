import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT9/BT9-047.js";
import "../BT9/BT9-112.js";
import "./ST13-06.js";
import "./ST13-09.js";
import "./ST13-14.js";

describe("ST13-14 BryweLudramon", () => {
  it("plays an eligible Legend-Arms Digimon from its top-3 digivolution reveal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-13", as: "base" }],
          hand: [{ card: "ST13-14", as: "brywe" }],
          deck: ["BT1-009", "ST13-09", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("brywe").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-09"));
    expect(s.perm("base").topCard.cardId).toBe("ST13-14");
  });

  it("may decline the revealed play and puts all three cards on the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-13", as: "base" }],
          hand: [{ card: "ST13-14", as: "brywe" }],
          deck: ["BT1-009", "ST13-07", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("brywe").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-010", "BT1-011", "ST13-07"]);
  });

  it("gains deletion and return protection when its controller's effect adds a source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-14", as: "brywe" }],
          hand: [{ card: "ST13-09", as: "ludomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ludomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("brywe").stack.some((card) => card.cardId === "ST13-09"));

    expect(observe(s.engine).isRestricted(s.perm("brywe"), "beDeleted")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("brywe"), "beReturned")).toBe(true);
  });

  it("does not gain protection when an opponent's effect adds the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST13-14", as: "brywe" }],
        hand: [{ card: "ST13-09", as: "source" }],
      },
    });
    await s.ready();

    advance(s.engine).verb.enterEffectResolution?.(1, ["Digimon"]);
    await advance(s.engine).verb.placeUnder(s.perm("brywe").permanentId, [s.inst("source").instanceId]);
    advance(s.engine).verb.leaveEffectResolution?.();

    expect(observe(s.engine).isRestricted(s.perm("brywe"), "beDeleted")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("brywe"), "beReturned")).toBe(false);
  });

  it("grants its RagnaLoardmon host opponent-Digimon-effect immunity only on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST13-06", as: "ragna", under: ["ST13-14"] }] } });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("ragna"), "beAffected")).toBe(false);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ragna"), "beAffected", "Digimon")).toBe(true);
  });
});

describe("ST13-14 BryweLudramon — KB Q&A rulings", () => {
  function digivolveIntoBrywe(options: { opponentBattleArea?: string[]; autoSelectCards?: boolean }) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-13", as: "base" }],
          hand: [{ card: "ST13-14", as: "brywe" }],
          deck: ["BT1-009", { card: "ST13-09", as: "legendArms" }, "BT1-010", "BT1-011"],
        },
        1: { battleArea: options.opponentBattleArea ?? [] },
      },
      {
        autoAcceptOptional: true,
        autoOrderCards: true,
        declineDigiXros: true,
        autoSelectCards: options.autoSelectCards ?? false,
      },
    );
    s.state.memory = 4;
    return s;
  }

  function digivolve(s: ReturnType<typeof setupEngine>) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("brywe").instanceId,
    });
  }

  async function answerRevealSelection(s: ReturnType<typeof setupEngine>, accept: boolean) {
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.decisions.at(-1)!.req;
    const legendArmsId = s.inst("legendArms").instanceId;
    expect(pending.options?.candidateInstanceIds).toContain(legendArmsId);
    expect(pending.options?.min ?? 0).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: accept ? [legendArmsId] : [] },
      }),
    ).toEqual({ ok: true });
  }

  it("may choose not to play the revealed Legend-Arms Digimon and then places it at the deck bottom with the rest (Q790)", async () => {
    const s = digivolveIntoBrywe({});
    await s.ready();

    expect(digivolve(s)).toEqual({ ok: true });
    await answerRevealSelection(s, false);
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["ST13-14"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-010", "BT1-011", "ST13-09"]);
  });

  it("cannot play the revealed Legend-Arms Digimon while BT9-047 Pomumon is in play, so it goes to the deck bottom (Q791)", async () => {
    const blocked = digivolveIntoBrywe({ opponentBattleArea: ["BT9-047"], autoSelectCards: true });
    await blocked.ready();
    expect(digivolve(blocked)).toEqual({ ok: true });
    await settle(() => blocked.state.pendingDecision === undefined && blocked.state.players[0]!.deck.length === 3);

    expect(blocked.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["ST13-14"]);
    expect(blocked.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-010", "BT1-011", "ST13-09"]);

    const unblocked = digivolveIntoBrywe({ autoSelectCards: true });
    await unblocked.ready();
    expect(digivolve(unblocked)).toEqual({ ok: true });
    await settle(() => unblocked.state.pendingDecision === undefined && unblocked.state.players[0]!.deck.length === 2);

    expect(unblocked.state.players[0]!.deck.map((card) => card.cardId)).not.toContain("ST13-09");
  });

  it("does not protect its RagnaLoardmon host from BT9-112 DeathXmon's [End of Opponent's Turn] deletion, which resolves on your own turn (Q792)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-06", as: "ragna", under: ["ST13-14"] }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: ["BT9-112"], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ragnaTopId = s.perm("ragna").topCard.instanceId;
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ragna"), "beAffected", "Digimon")).toBe(true);

    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(ragnaTopId);
  });
});
