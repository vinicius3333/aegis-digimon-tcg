import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
          scaling: { per: 10, unit: "cards", filter: { zone: "trash", controller: "any" } },
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
          battleArea: [{ card: "ST7-09", as: "base" }],
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
  it("digivolves through the printed Lv.6 [Gallantmon] route for cost 4 with the bonus draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-09", as: "base" }],
          hand: [{ card: "BT17-018", as: "crimson" }],
          deck: Array(12).fill("BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const baseId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("crimson").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-018");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(11);
  });

  it("still digivolves from a Lv.6 red Digimon without [Gallantmon] in its name at the catalog cost 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-017", as: "base" }],
          hand: [{ card: "BT17-018", as: "crimson" }],
          deck: Array(12).fill("BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("crimson").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-018");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT8-017"]);
  });

  it("does not apply the reduced cost to a Lv.6 source without [Gallantmon] in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-017", as: "base" }],
        hand: [{ card: "BT17-018", as: "crimson" }],
        deck: Array(12).fill("BT1-009"),
      },
    });
    s.state.memory = 5;
    await s.ready();

    // `useAlternateCost` is a hint the server revalidates: no printed alternate path accepts
    // this source, so the catalog Lv.6 red cost of 5 is charged instead of the reduced 4.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("crimson").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-018");

    expect(s.state.memory).toBe(0);
  });

  it("refuses an off-color Lv.6 source that no printed route accepts", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-080", as: "base" }],
        hand: [{ card: "BT17-018", as: "crimson" }],
        deck: Array(12).fill("BT1-009"),
      },
    });
    s.state.memory = 8;
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("crimson").instanceId,
    });

    expect(result.ok).toBe(false);
    expect(s.perm("base").topCard.cardId).toBe("BT1-080");
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT17-018"]);
  });

  it("deletes only one Digimon when a second would push the total past 15000", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-018", as: "crimson" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 9000 },
            { card: "BT1-009", as: "second", dp: 9000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredTargets },
    );
    preferredTargets.push(s.perm("first").topCard.instanceId, s.perm("second").topCard.instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimson").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-018"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes security only on the first attack each turn and again on the next own turn", async () => {
    const filler = Array.from({ length: 10 }, () => ({ card: "BT1-009" }));
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-018", as: "crimson" }],
          trash: filler,
          deck: Array(12).fill("BT1-009"),
        },
        1: {
          trash: filler,
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: Array(12).fill("BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const crimsonId = s.perm("crimson").permanentId;
    const attack = (): void => {
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: crimsonId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
    };

    attack();
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    // Two trashed by the effect (20 cards across both trashes) plus one from the security check.
    expect(s.state.players[1]!.security).toHaveLength(5);

    await advance(s.engine).verb.unsuspend([crimsonId]);
    attack();
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    // Once Per Turn refuses the second activation: only the security check removes a card.
    expect(s.state.players[1]!.security).toHaveLength(4);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    s.state.memory = 3;

    await advance(s.engine).verb.unsuspend([crimsonId]);
    attack();
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
