import { describe, expect, it } from "vitest";
import { EffectTiming, Phase, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-082.js";
import "../EX4/EX4-074.js";
import "../index.js";

const REVEALED = ["BT16-090", "BT1-009", "BT1-090"];

function hasTrashed(s: EngineSetup, seat: Seat, alias: string): boolean {
  return s.state.players[seat]!.trash.some((card) => card.instanceId === s.inst(alias).instanceId);
}

/**
 * Seat 1's [ShineGreymon: Ruin Mode] resolves its [When Digivolving] on seat 1's turn, so every
 * Digimon of seat 0 — including one that enters later — has -5000 DP through seat 0's next turn.
 * Seat 0 then opens its breeding phase with the given breeding Digimon and Ukkomon placement.
 */
async function breedingUnderRuinMode(board: {
  battleArea: { card: string; as: string; dp?: number }[];
  breeding: { card: string; as: string; dp?: number };
}): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: { ...board, deck: [...REVEALED], eggDeck: [{ card: "BT1-001", as: "egg" }] },
      1: { battleArea: [{ card: "EX4-074", as: "ruin" }] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  await s.ready();
  s.state.turnSeat = 1;
  await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("ruin"));
  s.state.turnSeat = 0;
  s.state.phase = Phase.Breeding;
  return s;
}

describe("BT16-082 Ukkomon", () => {
  it("watches your breeding move once per turn, searches three, then may hatch", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenMovedFromBreeding",
          actions: [{ kind: "RevealAdd" }, { kind: "Hatch", optional: true }],
        },
      ],
    });
  });

  it("adds a Digimon or Tamer, bottoms the rest, and may hatch after a natural move", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-082", as: "ukko" }],
          breeding: { card: "BT1-009", as: "moved" },
          deck: ["BT16-090", "BT1-009", "BT1-090"],
          eggDeck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.phase = Phase.Breeding;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("moved").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]?.hand.length === 1 &&
        s.state.players[0]?.deck.length === 2 &&
        s.state.players[0]?.breeding?.topCard?.cardId === "BT1-001",
    );
    expect(s.state.players[0]?.hand).toHaveLength(1);
    expect(s.state.players[0]?.deck).toHaveLength(2);
    expect(s.state.players[0]?.breeding?.topCard?.cardId).toBe("BT1-001");
  });
});

describe("BT16-082 Ukkomon — KB Q&A rulings", () => {
  it("activates when Ukkomon itself moves from the breeding area to the battle area (Q2668)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT16-082", as: "ukko" },
          deck: [...REVEALED],
          eggDeck: [{ card: "BT1-001", as: "egg" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("ukko").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("egg").instanceId);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT16-082"]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("resolves during the breeding phase, and Main opens only after it finishes (Q2669)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-082", as: "ukko" }],
        breeding: { card: "BT1-009", as: "moved" },
        deck: ["BT1-010", "BT1-010", ...REVEALED],
        eggDeck: [{ card: "BT1-001", as: "egg" }],
        security: ["BT1-010", "BT1-010"],
      },
      1: { deck: ["BT1-010", "BT1-010"], security: ["BT1-010", "BT1-010"] },
    });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    const handBeforeMove = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("moved").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const reveal = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;

    expect(s.state.phase).toBe(Phase.Breeding);
    expect(s.state.pendingDecision?.decisionId).toBe(reveal.decisionId);

    const candidates = reveal.options?.candidateInstanceIds ?? [];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: reveal.decisionId,
        response: { kind: "selectCards", instanceIds: candidates.slice(0, 1) },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === handBeforeMove + 1);
    expect(s.state.phase).toBe(Phase.Breeding);

    const hatch = s.decisions.at(-1)!.req;
    expect(hatch.kind).toBe("optional");
    expect(s.state.pendingDecision?.decisionId).toBe(hatch.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: hatch.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.players[0]!.hand).toHaveLength(handBeforeMove + 1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("still activates when the moved Digimon is deleted at 0 DP by an all-Digimon DP reduction (Q2670)", async () => {
    const s = await breedingUnderRuinMode({
      battleArea: [{ card: "BT16-082", as: "ukko", dp: 8000 }],
      breeding: { card: "BT1-009", as: "moved", dp: 3000 },
    });
    expect(s.perm("ukko").currentDP).toBe(3000);

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("moved").permanentId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();

    expect(hasTrashed(s, 0, "moved")).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT16-082"]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("cannot activate when Ukkomon itself is moved and deleted at 0 DP before the effect resolves (Q2671)", async () => {
    const deleted = await breedingUnderRuinMode({
      battleArea: [],
      breeding: { card: "BT16-082", as: "ukko" },
    });

    expect(
      deleted.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: deleted.perm("ukko").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => hasTrashed(deleted, 0, "ukko"));
    await drainMicrotasks();

    expect(deleted.state.players[0]!.hand).toHaveLength(0);
    expect(deleted.state.players[0]!.deck).toHaveLength(3);
    expect(deleted.state.players[0]!.eggDeck).toHaveLength(1);
    expect(deleted.state.players[0]!.breeding).toBeUndefined();

    const survivor = await breedingUnderRuinMode({
      battleArea: [],
      breeding: { card: "BT16-082", as: "ukko", dp: 6000 },
    });
    expect(
      survivor.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: survivor.perm("ukko").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => survivor.state.players[0]!.breeding?.topCard?.instanceId === survivor.inst("egg").instanceId);

    expect(survivor.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT16-082"]);
    expect(survivor.state.players[0]!.hand).toHaveLength(1);
  });
});
