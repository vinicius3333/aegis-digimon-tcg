import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-081.js";
import "./index.js";

describe("BT20-081 Fenriloogamon: Takemikazuchi", () => {
  it("provides Blast DNA Digivolve from hand", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDNADigivolve" }],
    });
  });

  it("publishes ACE stats, evolution costs, and Overflow", () => {
    expect(getCardDefinition("BT20-081")).toMatchObject({
      level: 7,
      playCost: 9,
      dp: 16000,
      isAce: true,
      overflowMemory: 5,
      evoCosts: [
        { color: "Purple", level: 6, memoryCost: 6 },
        { color: "Yellow", level: 6, memoryCost: 6 },
      ],
    });
  });

  it("gives two distinct opposing Digimon -10000 DP and conditionally deletes one at 10000 DP or lower", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -10000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
      });
      expect(actions[1]).toMatchObject({
        kind: "Delete",
        condition: { kind: "selfDigivolutionStackCountAtLeast", count: 1, filter: { kind: ["Tamer"] } },
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 10000 } }, count: 1 },
      });
    }
  });

  it("trashes the top security card to optionally reactivate one When Digivolving effect when attacking", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      actions: [
        {
          kind: "ReactivateEffect",
          fromTrigger: "WhenDigivolving",
          count: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
        },
      ],
    });
  });

  it("applies the DP reduction to two distinct recipients before the conditional delete is eligible", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", as: "host" }],
          hand: [{ card: "BT20-081", as: "takemikazuchi" }],
        },
        1: {
          battleArea: [
            { card: "BT10-055", as: "first" },
            { card: "BT8-017", as: "second" },
            { card: "BT1-080", as: "third" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId);
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("takemikazuchi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-081");

    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(3000);
    expect(s.perm("third").currentDP).toBe(12000);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
  });

  it("resolves the same two-target reduction on public play and evolution timing", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(mode === "digivolve" ? { battleArea: [{ card: "BT20-080", as: "host" }] } : {}),
            hand: [{ card: "BT20-081", as: "takemikazuchi" }],
          },
          1: {
            battleArea: [
              { card: "BT10-055", as: "first" },
              { card: "BT8-017", as: "second" },
              { card: "BT1-080", as: "third" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = mode === "play" ? 9 : 6;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takemikazuchi").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("host").permanentId,
              instanceId: s.inst("takemikazuchi").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.perm("first").currentDP === 3000 && s.perm("second").currentDP === 3000);
      expect(s.perm("third").currentDP).toBe(12000);
      expect(s.state.players[1]!.battleArea).toHaveLength(3);
    }
  });

  it("naturally gives two distinct opposing Digimon -10000, then deletes one after the Tamer check", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", under: ["BT20-085"], as: "host" }],
          hand: [{ card: "BT20-081", as: "takemikazuchi" }],
        },
        1: {
          battleArea: [
            // Use printed-DP vanilla Digimon: `ready()` and the digivolve seam recompute
            // currentDP from the authoritative card definition, so a fixture-only `dp: 20000`
            // override would be lost before the -10000 effect resolves.
            { card: "BT10-055", as: "first" },
            { card: "BT8-017", as: "second" },
            { card: "BT1-080", as: "third" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId);
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("takemikazuchi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-081");

    const remaining = s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId);
    expect(remaining).toHaveLength(2);
    expect(remaining).toContain("BT1-080");
    expect(remaining).toContain("BT8-017");
    expect(s.perm("third").currentDP).toBe(12000);
    expect(s.perm("second").currentDP).toBe(3000);
  });

  it("pays the top-security cost to reactivate When Digivolving during an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", under: ["BT20-085"], as: "host" }],
          hand: [{ card: "BT20-081", as: "takemikazuchi" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT10-055", as: "first" },
            { card: "BT8-017", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("takemikazuchi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-081");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
    // The reactivated When Digivolving effect applies its second -10000/delete pass,
    // so both opposing Digimon are gone after the attack.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("public Counter Blast DNA consumes Fenriloogamon field plus Kazuchimon hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", as: "fenriloogamon" }],
          hand: [
            { card: "BT20-035", as: "kazuchimon" },
            { card: "BT20-081", as: "takemikazuchi" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT20-010", as: "attacker" }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.findLast((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const choice = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("takemikazuchi").instanceId);
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice!.instanceId,
        effectKey: choice!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-081"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT20-035");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-081")).toBe(true);
  });

  it("passing the Blast DNA counter preserves both materials and Examon while the attack resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", as: "fenriloogamon" }],
          hand: [
            { card: "BT20-035", as: "kazuchimon" },
            { card: "BT20-081", as: "takemikazuchi" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT20-010", as: "attacker" }], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT20-035", "BT20-081"]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT20-080"]);
  });

  it("requires exact named materials and a battle-area field material", async () => {
    for (const setup of [
      {
        // The result names [Fenriloogamon] exactly; its near-name
        // [Fenriloogamon: Takemikazuchi] must not fill that material slot.
        battleArea: [{ card: "BT17-101", as: "nearName" }],
        hand: [
          { card: "BT20-035", as: "handMaterial" },
          { card: "BT20-081", as: "result" },
        ],
      },
      {
        breeding: { card: "BT20-080", as: "breeding" },
        hand: [
          { card: "BT20-035", as: "hand" },
          { card: "BT20-081", as: "result" },
        ],
      },
    ]) {
      const s = setupEngine(
        { 0: setup, 1: { battleArea: [{ card: "BT20-010", as: "attacker" }], security: ["BT1-009"] } },
        { autoDeclineOptional: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !s.events.some((event) => event.kind === "counterWindowOpened") ||
          s.events.some((event) => event.kind === "securityChecked"),
      );
      expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
    }
  });
});
