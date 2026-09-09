import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-004.js";

describe("BT17-004 Argomon", () => {
  it("matches every catalog field and carries its only printed clause in IR", () => {
    expect(getCardDefinition("BT17-004")).toMatchObject({
      cardId: "BT17-004",
      nameEn: "Argomon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      attributes: ["-"],
      types: ["Mutant"],
      inheritedEffectText: "[Opponent's Turn] While this Digimon is [Argomon], it gains ＜Blocker＞.",
    });
    expect(getCardDefinition("BT17-004")?.effectText).toBeUndefined();
    expect(compiled.effects).toEqual([
      {
        trigger: "OpponentsTurn",
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            effect: { kind: "keyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } },
            while: { kind: "selfHasName", names: ["Argomon"], raw: "this Digimon is [Argomon]" },
          },
        ],
        isInherited: true,
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("grants Blocker to an [Argomon] host only during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-042", as: "host", under: ["BT17-004"] }] } });

    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);

    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);

    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });

  it("does not grant Blocker to a non-[Argomon] host during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-043", as: "host", under: ["BT17-004"] }] } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });

  it("lets the [Argomon] host actually block an opponent's player attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-042", as: "host", under: ["BT17-004"], dp: 20_000 }],
        security: ["BT1-009", "BT1-013"],
      },
      1: { battleArea: [{ card: "BT1-013", as: "attacker" }], security: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: hostId })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The block redirected the attack: security is untouched and the 5000 DP attacker
    // lost the battle against the 20000 DP blocker.
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the block when the host is not [Argomon]", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-043", as: "host", under: ["BT17-004"], dp: 20_000 }],
        security: ["BT1-009", "BT1-013"],
      },
      1: { battleArea: [{ card: "BT1-013", as: "attacker" }], security: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId }).ok).toBe(
      false,
    );
    await settle(() => !observe(s.engine).isAttacking());

    // Unblocked: the top security card was checked, leaving only the second one.
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
  });

  it("carries ＜Blocker＞ through the real Digi-Egg route beside a non-[Argomon] peer stack", async () => {
    // Peer/stack case, public intents only for every zone change: `hatchEgg` puts BT17-004 in
    // the breeding area, the Green Lv.3 [Argomon] BT17-042 digivolves onto it there, and
    // `moveFromBreeding` carries the stack into the battle area on the next own turn. Beside it
    // stands a Terriermon carrying the same Digi-Egg — same colour, same egg, wrong name — and
    // only the [Argomon] stack gains ＜Blocker＞ on the opponent's turn.
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT17-004", as: "egg" }],
          battleArea: [{ card: "BT17-043", as: "peer", under: ["BT17-004"] }],
          hand: [{ card: "BT17-042", as: "argomon" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-012", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT17-004");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("argomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT17-042");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const carrier = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT17-042")!;
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    // Own turn: neither stack blocks.
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(carrier, "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Blocker")).toBe(false);

    // Opponent's turn: only the [Argomon] carrier gains the keyword.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(carrier, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Blocker")).toBe(false);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
