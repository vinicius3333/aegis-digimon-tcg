import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST13-09.js";
import "./ST13-14.js";

describe("ST13-14 BryweLudramon", () => {
  it("plays an eligible Legend-Arms Digimon from its top-3 digivolution reveal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-13", as: "base" }],
          hand: [{ card: "ST13-14", as: "brywe" }],
          deck: ["BT1-009", "ST13-07", "BT1-010", "BT1-011"],
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
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-07"));
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
