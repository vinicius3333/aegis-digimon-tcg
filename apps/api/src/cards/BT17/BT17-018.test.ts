import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-018.js";

describe("BT17-018", () => {
  it("models Blast Digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("deletes opposing Digimon up to a total of 15000 DP", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Delete", target: { count: "all", totalDpCap: 15000 } });
    }
  });

  it("trashes security based on the number of cards in trash once per turn", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          scaling: { per: 10, unit: "cards" },
        },
      ],
    });
  });

  it("Blast Digivolves from hand during a natural Counter Timing and deletes up to 15000 DP", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-009", as: "nine", dp: 9000 },
            { card: "BT1-009", as: "six", dp: 6000 },
            { card: "BT1-009", as: "one", dp: 1000 },
          ],
        },
        1: {
          battleArea: [{ card: "BT17-016", as: "base" }],
          hand: [{ card: "BT17-018", as: "crimson" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredTargets },
    );
    preferredTargets.push(s.perm("nine").topCard.instanceId, s.perm("six").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("crimson").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-018");

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT17-018"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-009"]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("trashes two security cards from a natural attack after counting both players' trashes (Q2747)", async () => {
    const filler = Array.from({ length: 10 }, () => ({ card: "BT1-009" }));
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-018", as: "crimson" }], trash: filler },
        1: { trash: filler, security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("crimson").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    // The effect trashes two cards, then the attack's normal security check removes the last one.
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
