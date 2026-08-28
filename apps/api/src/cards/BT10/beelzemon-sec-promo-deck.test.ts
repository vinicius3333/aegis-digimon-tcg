import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-111.js";
import "../EX2/EX2-074.js";
import "../P/P-040.js";
import "../P/P-071.js";
import "../EX2/EX2-039.js";
import "./BT10-081.js";

describe("Beelzemon SEC and promo deck through BT10", () => {
  it("uses promo Impmon's security effect to establish the EX2 Impmon evolution line", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT2-111", as: "beelzemon" }],
          trash: [
            { card: "EX2-039", as: "trashImpmon" },
            "BT1-001",
            "BT1-002",
            "BT1-003",
            "BT1-004",
            "BT1-005",
            "BT1-006",
            "BT1-007",
            "BT1-008",
            "BT1-009",
            "BT1-010",
          ],
          security: [{ card: "P-071", as: "promoImpmon" }],
          deck: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const trashImpmonId = s.inst("trashImpmon").instanceId;
    const promoImpmonId = s.inst("promoImpmon").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === trashImpmonId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === promoImpmonId) &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === trashImpmonId)!
          .permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("beelzemon").instanceId,
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("beelzemon").instanceId,
      ),
    ).toBe(true);
  });

  it("mills Blast Mode with Baalmon, deletes a level 4, then plays Beelzemon after crossing 10 trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-081", as: "baalmon" }],
          deck: [{ card: "EX2-074", as: "blastMode" }, "BT1-001", "BT1-002", "BT1-003"],
          trash: [
            { card: "BT2-111", as: "beelzemon" },
            "BT1-004",
            "BT1-005",
            "BT1-006",
            "BT1-007",
            "BT1-008",
            "BT1-009",
            "BT1-010",
          ],
        },
        1: {
          battleArea: [
            { card: "EX2-021", as: "level4" },
            { card: "EX2-023", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("baalmon"));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blastMode").instanceId)).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("level5").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-021")).toBe(false);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("baalmon").permanentId])).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("beelzemon").instanceId,
      ),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT2-111")).toBe(true);
  });

  it("uses Purple Memory Boost to find Baalmon and gains 2 memory with Delay on a later turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-068", as: "purpleSource" }],
          hand: [{ card: "P-040", as: "memoryBoost" }],
          deck: [
            { card: "BT10-081", as: "baalmon" },
            "BT1-001",
            "BT1-002",
            "BT1-003",
            { card: "BT1-004", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("memoryBoost").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("baalmon").instanceId));
    await settle();
    expect(s.state.memory).toBe(7);

    const boost = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "P-040")!;
    const source = (s.engine as any).cardSourceOf(boost.topCard);
    const delayKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    s.state.turnCount += 1;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: boost.topCard.instanceId,
        effectKey: delayKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("memoryBoost").instanceId));
    await settle();

    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("unrevealed").instanceId);
  });
});
