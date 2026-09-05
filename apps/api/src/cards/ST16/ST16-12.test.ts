import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./ST16-12.js";

describe("ST16-12 MetalGarurumon", () => {
  it("exposes Blast Digivolve from hand at Counter timing", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("gains 1 memory for each card actually trashed by its digivolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-11", as: "weregarurumon" }],
          hand: [
            { card: "ST16-12", as: "metalgarurumon" },
            { card: "BT1-001", as: "costOne" },
          ],
          deck: [{ card: "BT1-002", as: "drawnCost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("weregarurumon").permanentId,
        instanceId: s.inst("metalgarurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("costOne").instanceId, s.inst("drawnCost").instanceId]),
    );
    // The printed Purple Lv.5 digivolution costs 3 memory (10 → 7); exactly two cards
    // are available after the draw, so the effect restores 2 (7 → 9).
    expect(s.state.memory).toBe(9);
  });

  it("trashes one hand card and deletes the opponent's lowest-level Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-12", as: "metalgarurumon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "ST16-08", as: "lowest", suspended: true },
            { card: "ST16-11", as: "higher", suspended: true },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalgarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST16-08"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["ST16-11"]);
  });

  it("Blast Digivolves from hand during a real Counter window onto a Garurumon-name level 5", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST16-11", as: "attacker" }] },
        1: {
          battleArea: [{ card: "ST16-11", as: "base" }],
          hand: [{ card: "ST16-12", as: "metalgarurumon" }],
          security: ["BT1-001"],
          deck: ["ST1-02", "ST1-02"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 0;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("metalgarurumon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(s.perm("base").topCard.cardId).toBe("ST16-12");
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });
});
