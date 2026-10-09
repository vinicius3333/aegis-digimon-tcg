import { expect, it } from "vitest";
import "../../cards/index.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, settleAcrossTimers, assertNoLoudGap } from "../testkit/harness.js";

it.each(["EX13-021", "BT20-025", "BT20-027"])(
  "Discord 1557631388650315826: named Examon Blast DNA after KingSukamon transforms %s",
  async (material) => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009"],
          battleArea: [{ card: material, as: "material" }],
          hand: [
            { card: "BT20-044", as: "break" },
            { card: "BT20-045", as: "examon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT20-010", as: "attacker" }],
          hand: [{ card: "BT11-043", as: "king" }],
          trash: ["BT11-040", "BT11-040", "BT11-040"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("material").originalNameOverride === "Sukamon" && !s.state.pendingDecision);
    expect(observe(s.engine).effectiveColors(s.perm("material"))).toEqual(["White"]);
    expect(s.perm("material").currentDP).toBe(3000);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    if (material === "BT20-027") {
      await settleAcrossTimers(() => !observe(s.engine).isAttacking());
      expect(
        s.events.some(
          (e) =>
            e.kind === "counterWindowOpened" &&
            e.eligibleCounters.some((c) => c.instanceId === s.inst("examon").instanceId),
        ),
      ).toBe(false);
      expect(observe(s.engine).effectiveNames(s.perm("material"))).toEqual(["sukamon"]);
      expect(s.state.players[0]!.hand.map((c) => c.cardId).sort()).toEqual(["BT20-044", "BT20-045"]);
      assertNoLoudGap(s);
      return;
    }
    await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
    const counter = s.events.findLast((e) => e.kind === "counterWindowOpened");
    if (counter?.kind !== "counterWindowOpened") throw new Error("Expected public Counter window");
    const eligible = counter.eligibleCounters.find((e) => e.instanceId === s.inst("examon").instanceId);
    expect(observe(s.engine).effectiveNames(s.perm("material"))).toContain("slayerdramon");
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-045") && !observe(s.engine).isAttacking(),
    );
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-045")!;
    expect(result.stack.map((c) => c.cardId).sort()).toEqual([material, "BT20-044"].sort());
    expect(s.state.players[0]!.hand).toHaveLength(1); // DNA draws once; both actual materials were consumed.
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    assertNoLoudGap(s);
  },
);
