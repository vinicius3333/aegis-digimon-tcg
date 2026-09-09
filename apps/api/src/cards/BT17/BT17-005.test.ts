import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-005.js";

describe("BT17-005 Tsumemon", () => {
  it("matches every catalog field and carries its only printed clause in IR", () => {
    expect(getCardDefinition("BT17-005")).toMatchObject({
      cardId: "BT17-005",
      nameEn: "Tsumemon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      attributes: ["-"],
      types: ["Unidentified"],
      inheritedEffectText: "[On Deletion] If this Digimon had the [Unidentified] trait, gain 1 memory.",
    });
    expect(getCardDefinition("BT17-005")?.effectText).toBeUndefined();
    expect(compiled.effects).toEqual([
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: {
              kind: "selfHasTrait",
              filter: { nameOrTrait: [{ tokens: ["Unidentified"], match: "trait" }] },
              raw: "this Digimon had the [Unidentified] trait",
            },
          },
        ],
        isInherited: true,
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains 1 memory when its [Unidentified] host loses a real battle", async () => {
    const s = setupEngine({
      // BT17-053 Keramon carries the [Unidentified] trait; its own printed clause only
      // watches the opponent playing a level 5+ Digimon, so it stays inert here.
      0: { battleArea: [{ card: "BT17-053", as: "host", under: ["BT17-005"] }] },
      1: { battleArea: [{ card: "BT1-013", as: "wall", suspended: true }] },
    });
    s.state.memory = 0;
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT17-053", "BT17-005"]),
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not gain memory when the deleted host lacks the [Unidentified] trait", async () => {
    const s = setupEngine({
      // BT17-052 Agumon is Reptile/SoC, not [Unidentified].
      0: { battleArea: [{ card: "BT17-052", as: "host", under: ["BT17-005"] }] },
      1: { battleArea: [{ card: "BT1-013", as: "wall", suspended: true }] },
    });
    s.state.memory = 0;
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("stays silent while the Digi-Egg is the top card of a surviving stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-053", as: "host", under: ["BT17-005"], dp: 20_000 }] },
      1: { battleArea: [{ card: "BT1-013", as: "wall", suspended: true }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("carries the inherited memory gain through the real Digi-Egg route beside a non-[Unidentified] peer stack", async () => {
    // Peer/stack case, public intents only for every zone change: `hatchEgg` puts BT17-005 in
    // the breeding area, the Black Lv.3 [Unidentified] BT17-053 digivolves onto it there
    // (Lv.2 Black, cost 0), and `moveFromBreeding` carries the stack to the battle area on the
    // next own turn. Beside it stands BT17-052 Agumon carrying the same Digi-Egg — same colour,
    // same egg, [Reptile]/[SoC] instead of [Unidentified]. Both die to the same 5000 DP wall;
    // only the [Unidentified] carrier gains memory.
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT17-005", as: "egg" }],
          battleArea: [{ card: "BT17-052", as: "peer", under: ["BT17-005"] }],
          hand: [{ card: "BT17-053", as: "keramon" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", suspended: true }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-012", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT17-005");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("keramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT17-053");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const carrier = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT17-053")!;
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    const wallPermanentId = s.perm("wall").permanentId;
    // The opponent's unsuspend phase readied the wall; suspend it again so it is a legal target.
    await advance(s.engine).verb.suspend([wallPermanentId]);

    // Near-miss host first: same egg beneath, wrong trait, no memory.
    const peerPermanentId = s.perm("peer").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: peerPermanentId,
        target: { kind: "permanent", permanentId: wallPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === peerPermanentId));
    expect(s.state.memory).toBe(3);

    // The routed [Unidentified] stack: the egg fires from under its real host.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "permanent", permanentId: wallPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(eggInstanceId);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
