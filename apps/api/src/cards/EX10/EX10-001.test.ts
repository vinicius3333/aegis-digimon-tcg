import { EffectDuration, getCardDefinition, Phase, requireCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { linkCostOf } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX10-001.js";

describe("EX10-001 Flickmon inherited link-trash trigger", () => {
  it("matches the catalog and carries the printed inherited contract", () => {
    expect(getCardDefinition("EX10-001")).toMatchObject({
      cardId: "EX10-001",
      nameEn: "Flickmon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      forms: ["Appmon"],
      attributes: ["System"],
      types: ["Flick"],
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When effects trash any of this Digimon's link cards, gain 1 memory.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenLinkTrashed",
              sourceFilter: { isSelfRef: true },
              actions: [{ kind: "GainMemory", amount: 1 }],
              raw: "[Your Turn] [Once Per Turn] When effects trash any of this Digimon's link cards, gain 1 memory.",
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gains 1 memory when an effect trashes this Digimon's link card, once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            as: "host",
            dp: 20_000,
            under: [{ card: "EX10-001", as: "flickmon" }],
            linked: [
              { card: "BT1-009", as: "linkCard" },
              { card: "BT1-010", as: "secondLinkCard" },
            ],
          },
        ],
      },
    });
    const host = s.perm("host");
    const memoryBefore = s.state.memory;

    await s.ready();
    // FAILS-WHEN-REVERTED: drop the SubTrigger from EX10-001.ts => no memory gain at all.
    await advance(s.engine).verb.trash([s.inst("linkCard").instanceId], 0);
    await settle(() => host.linked.length === 1 && s.state.memory === memoryBefore + 1);

    expect(host.linked).toHaveLength(1);
    expect(host.linked[0]!.instanceId).toBe(s.inst("secondLinkCard").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("linkCard").instanceId);
    expect(s.state.memory).toBe(memoryBefore + 1);

    // [Once Per Turn]: the second link-card trash in the same turn pays nothing.
    await advance(s.engine).verb.trash([s.inst("secondLinkCard").instanceId], 0);
    await settle(() => false, 30);

    expect(host.linked).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("scopes the watcher to this Digimon's own link cards", () => {
    // FAILS-WHEN-REVERTED: dropping `sourceFilter` makes the watcher fire on every link-card
    // trash on the board, including the opponent's.
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinkTrashed",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("does not gain memory when another Digimon's link card is trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            as: "host",
            dp: 20_000,
            under: [{ card: "EX10-001", as: "flickmon" }],
            linked: [{ card: "BT1-009", as: "ownLink" }],
          },
          {
            card: "BT1-010",
            as: "neighbor",
            linked: [{ card: "BT1-010", as: "neighborLink" }],
          },
        ],
      },
      1: {
        battleArea: [
          {
            card: "BT1-010",
            as: "enemy",
            linked: [{ card: "BT1-009", as: "enemyLink" }],
          },
        ],
      },
    });
    const memoryBefore = s.state.memory;

    await s.ready();
    await advance(s.engine).verb.trash([s.inst("neighborLink").instanceId], 0);
    await settle(() => false, 30);
    expect(s.state.memory).toBe(memoryBefore);

    await advance(s.engine).verb.trash([s.inst("enemyLink").instanceId], 1);
    await settle(() => false, 30);
    expect(s.state.memory).toBe(memoryBefore);

    // The host's OWN link card still pays out, proving the gate is scoped, not disabled.
    await advance(s.engine).verb.trash([s.inst("ownLink").instanceId], 0);
    await settle(() => s.state.memory === memoryBefore + 1);
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.perm("host").linked).toHaveLength(0);
  });

  it("does not gain memory when a non-link card of the same carrier is trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            as: "host",
            dp: 20_000,
            under: [{ card: "EX10-001", as: "flickmon" }],
            linked: [{ card: "BT1-009", as: "ownLink" }],
          },
        ],
        hand: [{ card: "BT1-009", as: "handCard" }],
      },
    });
    const memoryBefore = s.state.memory;

    await s.ready();
    await advance(s.engine).verb.trash([s.inst("handCard").instanceId], 0);
    await settle(() => false, 30);

    expect(s.state.memory).toBe(memoryBefore);
    expect(s.perm("host").linked).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  /**
   * Q5006 — "Does this card's inherited effect trigger even when a card would get linked by
   * an effect to an already linked card whose link card is trashed and replaced?" A: "No, it
   * doesn't trigger." Linking past the link limit trashes the existing link card through the
   * §17-1-3-2-5 rule-check sweep (`GameEngine.trashExcessLinkCards`, byRule), not through an
   * effect, and the trash seam suppresses `whenLinkTrashed` for a rule trim.
   */
  it("Q5006: gains no memory when a link replacement trashes the old link card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT23-007",
            as: "host",
            dp: 20_000,
            under: [{ card: "EX10-001", as: "flickmon" }],
            linked: [{ card: "BT23-007", as: "oldLink" }],
          },
        ],
        hand: [{ card: "BT24-053", as: "newLink" }],
      },
    });
    const host = s.perm("host");
    s.state.memory = 10;
    const memoryBefore = s.state.memory;
    const linkCost = linkCostOf(requireCardDefinition("BT24-053"), 0);

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("newLink").instanceId,
        targetPermanentId: host.permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        host.linked.length === 1 &&
        host.linked[0]!.instanceId === s.inst("newLink").instanceId &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("oldLink").instanceId),
      10_000,
    );

    expect(host.linked.map((card) => card.instanceId)).toEqual([s.inst("newLink").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("oldLink").instanceId);
    // Exactly the link cost left memory: no +1 rode along with the replacement trash.
    expect(s.state.memory).toBe(memoryBefore - linkCost);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    // The same host still pays out for a genuine effect trash, so the gate is the rule-trim
    // provenance, not a dead watcher.
    const afterReplacement = s.state.memory;
    await advance(s.engine).verb.trash([s.inst("newLink").instanceId], 0);
    await settle(() => s.state.memory === afterReplacement + 1);
    expect(s.state.memory).toBe(afterReplacement + 1);
  });

  /**
   * [Your Turn] + [Once Per Turn] through the real turn loop: pays on your turn, refuses a
   * second payout in that same turn, stays silent for the whole of the opponent's turn, and
   * pays again on your next turn.
   */
  it("pays only on your turn and resets on your next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            as: "host",
            dp: 20_000,
            under: [{ card: "EX10-001", as: "flickmon" }],
            linked: [
              { card: "BT1-009", as: "l1" },
              { card: "BT1-010", as: "l2" },
              { card: "BT1-011", as: "l3" },
              { card: "BT1-012", as: "l4" },
            ],
          },
        ],
        hand: ["BT1-013"],
        deck: ["BT1-014", "BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        hand: ["BT1-013"],
        deck: ["BT1-014", "BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
    });
    // Keep all four seeded link cards legal so the §17-1-3-2-5 sweep never trims (and never
    // silently consumes) a link card the scenario still needs.
    advance(s.engine).ledgers.continuous.addLinkMaxGrant(s.perm("host").permanentId, 3, EffectDuration.Permanent);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const ownTurnBefore = s.state.memory;
    await advance(s.engine).verb.trash([s.inst("l1").instanceId], 0);
    await settle(() => s.state.memory === ownTurnBefore + 1);
    expect(s.state.memory).toBe(ownTurnBefore + 1);

    // Same turn, second link-card trash: [Once Per Turn] refuses.
    await advance(s.engine).verb.trash([s.inst("l2").instanceId], 0);
    await settle(() => false, 30);
    expect(s.state.memory).toBe(ownTurnBefore + 1);
    expect(s.perm("host").linked).toHaveLength(2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // [Your Turn]: silent for the whole of the opponent's turn, even on a fresh turn counter.
    const opponentTurnBefore = s.state.memory;
    await advance(s.engine).verb.trash([s.inst("l3").instanceId], 1);
    await settle(() => false, 30);
    expect(s.state.memory).toBe(opponentTurnBefore);
    expect(s.perm("host").linked).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // Back on your own turn: the once-per-turn counter has reset.
    const nextTurnBefore = s.state.memory;
    await advance(s.engine).verb.trash([s.inst("l4").instanceId], 0);
    await settle(() => s.state.memory === nextTurnBefore + 1);
    expect(s.state.memory).toBe(nextTurnBefore + 1);
    expect(s.perm("host").linked).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
  /**
   * The real Digi-Egg route, entirely through public intents and the production turn loop.
   *
   * §6-4-1 allows exactly ONE breeding action per turn, and both `hatchEgg` and
   * `moveFromBreeding` are gated on the Breeding phase, so the route spans two of the
   * controller's own turns: hatch on turn 1, digivolve in the breeding area during that
   * turn's Main phase, move the finished stack out on turn 3. Only after that move does the
   * inherited watcher live on a battle-area carrier, and the payout below is measured there.
   */
  it("hatches, digivolves in breeding, moves to the battle area, and pays out on that carrier", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX10-001", as: "egg" }],
        hand: [{ card: "BT21-047", as: "navimon" }, { card: "BT21-047", as: "linkCard" }, "BT1-013"],
        deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        hand: ["BT1-013"],
        deck: ["BT1-014", "BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
    });
    const eggInstanceId = s.inst("egg").instanceId;
    const loop = s.engine.startTurnLoop();

    // Turn 1, Breeding phase: the egg leaves the egg deck for the breeding area.
    await settleAcrossTimers(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[0]!.eggDeck.map((card) => card.cardId)).toEqual(["EX10-001"]);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX10-001");
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.breeding!.topCard!.instanceId).toBe(eggInstanceId);

    // Turn 1, Main phase: a Lv.3 digivolves onto the egg in the breeding area.
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("navimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT21-047");
    expect(s.state.players[0]!.breeding!.permanentId).toBe(breedingPermanentId);
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    // Turn 3, Breeding phase: the finished stack moves to the battle area.
    await settleAcrossTimers(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.permanentId).toBe(breedingPermanentId);
    expect(carrier.topCard!.cardId).toBe("BT21-047");
    expect(carrier.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);

    // Turn 3, Main phase: link a card onto the carrier through the public intent, then have an
    // effect trash it. The +1 is the inherited clause paying out on a carrier that reached the
    // battle area only by hatch -> digivolve -> move.
    await advance(s.engine).waitForMainPhase(0);
    const linkCost = linkCostOf(requireCardDefinition("BT21-047"), 0);
    const memoryBeforeLink = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkCard").instanceId,
        targetPermanentId: carrier.permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => carrier.linked.length === 1);
    expect(carrier.linked.map((card) => card.instanceId)).toEqual([s.inst("linkCard").instanceId]);
    expect(s.state.memory).toBe(memoryBeforeLink - linkCost);

    const memoryBeforeTrash = s.state.memory;
    await advance(s.engine).verb.trash([s.inst("linkCard").instanceId], 0);
    await settle(() => s.state.memory === memoryBeforeTrash + 1);

    expect(s.state.memory).toBe(memoryBeforeTrash + 1);
    expect(carrier.linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("linkCard").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /**
   * Carrier movement: the watcher binds to the PERMANENT carrying the egg, not to the card
   * that was on top when it was installed. Digivolving the carrier again keeps the same
   * permanent id, keeps the egg in the stack, and keeps the link card (the new top is still
   * an [Appmon], so the §17-1-3-2-6 link-legality sweep leaves it alone) — and the payout
   * still follows that permanent while a neighbour's link trash stays silent.
   */
  it("keeps the isSelfRef binding on the carrier permanent when the carrier digivolves again", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT21-047",
            as: "host",
            under: [{ card: "EX10-001", as: "flickmon" }],
            linked: [{ card: "BT21-047", as: "ownLink" }],
          },
          {
            card: "BT21-047",
            as: "neighbor",
            linked: [{ card: "BT21-047", as: "neighborLink" }],
          },
        ],
        hand: [{ card: "BT22-050", as: "roamon" }],
        deck: ["BT1-013", "BT1-014", "BT1-009"],
      },
    });
    await s.ready();
    const hostPermanentId = s.perm("host").permanentId;
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostPermanentId,
        instanceId: s.inst("roamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT22-050");

    // Same permanent, egg still in the stack under the new top, link card untouched.
    expect(s.perm("host").permanentId).toBe(hostPermanentId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX10-001", "BT21-047"]);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("ownLink").instanceId]);

    const memoryAfterDigivolve = s.state.memory;
    // The neighbour is a different permanent: still silent after the carrier moved up a level.
    await advance(s.engine).verb.trash([s.inst("neighborLink").instanceId], 0);
    await settle(() => false, 30);
    expect(s.state.memory).toBe(memoryAfterDigivolve);
    expect(s.perm("neighbor").linked).toHaveLength(0);

    // The carrier's own link card still pays out, so the binding followed the permanent.
    await advance(s.engine).verb.trash([s.inst("ownLink").instanceId], 0);
    await settle(() => s.state.memory === memoryAfterDigivolve + 1);
    expect(s.state.memory).toBe(memoryAfterDigivolve + 1);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
