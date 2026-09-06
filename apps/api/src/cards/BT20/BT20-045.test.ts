import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-045.js";
import "./index.js";
import "../ST22/ST22-08.js";

describe("BT20-045 Examon ACE", () => {
  it("keeps Blast DNA Digivolve in hand and returns highest-DP opposing Digimon only on DNA digivolving", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDNADigivolve" }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Return",
          condition: { kind: "isDnaDigivolving" },
          to: "deckBottom",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }, count: "all" },
        },
      ],
    });
  });

  it("may unsuspend this battle-area Digimon when any Digimon suspends, once per turn", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "any", kind: ["Digimon"] },
          actions: [
            {
              kind: "Unsuspend",
              optional: true,
              target: { filter: { isSelfRef: true, zone: "battleArea" }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("carries ACE metadata and all four battle keywords", async () => {
    expect(getCardDefinition("BT20-045")).toMatchObject({ isAce: true, overflowMemory: 5, dp: 15000, playCost: 9 });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-045", as: "examon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("examon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("examon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("examon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("examon"), "Evade")).toBe(true);
  });

  it("charges printed Overflow -5 when Examon leaves the battle area in a public battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-045", dp: 1000, as: "examon" }] },
        1: { battleArea: [{ card: "BT20-010", dp: 5000, suspended: true, as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(-5);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT20-045");
  });

  it("publicly accepts the printed ordinary DNA route and returns all tied highest-DP opponents", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon" },
            { card: "BT20-027", as: "slayerdramon" },
          ],
          hand: [{ card: "BT20-045", as: "examon" }],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 8000, as: "highA" },
            { card: "BT20-011", dp: 8000, as: "highB" },
            { card: "BT20-012", dp: 7000, as: "low" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const breakdramonId = s.perm("breakdramon").permanentId;
    const slayerdramonId = s.perm("slayerdramon").permanentId;
    const breakdramonInstanceId = s.inst("breakdramon").instanceId;
    const slayerdramonInstanceId = s.inst("slayerdramon").instanceId;
    const highAId = s.perm("highA").permanentId;
    const highBId = s.perm("highB").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("breakdramon").permanentId, s.perm("slayerdramon").permanentId],
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-045") &&
        !s.state.players[1]!.battleArea.some((permanent) => [highAId, highBId].includes(permanent.permanentId)),
    );
    const examon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-045")!;
    expect(examon.stack).toHaveLength(2);
    expect(examon.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([breakdramonInstanceId, slayerdramonInstanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === breakdramonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === slayerdramonId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-012"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT20-010", "BT20-011"]);
    expect(s.state.memory).toBe(4); // Printed Green Lv.6 + Blue Lv.6 DNA cost 0.
  });

  it("rejects ordinary DNA when a material misses the printed level/color boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon" },
            { card: "BT20-036", as: "wrongMaterial" },
          ],
          hand: [{ card: "BT20-045", as: "examon" }],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 8000, as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("breakdramon").permanentId, s.perm("wrongMaterial").permanentId],
        instanceId: s.inst("examon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "BT20-044",
      "BT20-036",
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-045");
    expect(s.state.memory).toBe(4);
  });

  it("public Counter Blast DNA uses one field Breakdramon and one named hand Slayerdramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-044", as: "breakdramon" }],
          hand: [
            { card: "BT20-027", as: "slayerdramon" },
            { card: "BT20-045", as: "examon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-010", as: "attacker" },
            { card: "BT20-011", dp: 8000, as: "highA" },
            { card: "BT20-012", dp: 8000, as: "highB" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
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
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("examon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-045") && !observe(s.engine).isAttacking(),
    );
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-045")!;
    expect(result.stack.map((card) => card.cardId)).toEqual(["BT20-027", "BT20-044"]);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT20-010"]);
  });

  it("does not treat ordinary evolution as DNA: highest-DP opponents stay in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-044", as: "breakdramon" }],
          hand: [{ card: "BT20-045", as: "examon" }],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 8000, as: "highest" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("breakdramon").permanentId,
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breakdramon").topCard.cardId === "BT20-045" && s.state.pendingDecision === undefined);
    expect(s.perm("breakdramon").topCard.cardId).toBe("BT20-045");
    expect(s.perm("highest").topCard.cardId).toBe("BT20-010");
    expect(s.state.memory).toBe(0);
  });

  it("does not offer Blast DNA when a field-treated name is only present on a hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-027", as: "fieldSlayerdramon" }],
          hand: [
            { card: "BT20-042", as: "handGroundramon" },
            { card: "BT20-045", as: "examon" },
          ],
        },
        1: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-045");
  });

  it("uses the public combat lifecycle for Raid redirection and Piercing", async () => {
    const raid = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-045", as: "examon" }] },
        1: { battleArea: [{ card: "BT20-010", dp: 10000, as: "raidTarget" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await raid.ready();
    expect(
      raid.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: raid.perm("examon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !raid.state.players[1]!.battleArea.some((p) => p.permanentId === raid.perm("raidTarget").permanentId),
    );
    expect(raid.state.players[1]!.security).toHaveLength(0);

    const pierce = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-045", as: "examon" }] },
        1: { battleArea: [{ card: "BT20-010", dp: 10000, suspended: true, as: "target" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await pierce.ready();
    expect(
      pierce.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: pierce.perm("examon").permanentId,
        target: { kind: "permanent", permanentId: pierce.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => pierce.events.some((event) => event.kind === "securityChecked"));
    expect(pierce.state.players[1]!.security).toHaveLength(0);
    expect(pierce.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses public Blocker and Evade combat decisions", async () => {
    const blocker = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-045", as: "examon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT20-010", dp: 5000, as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    blocker.state.turnSeat = 1;
    await blocker.ready();
    expect(
      blocker.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: blocker.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => blocker.events.some((event) => event.kind === "blockWindowOpened"));
    const blockerWindow = blocker.events.findLast((event) => event.kind === "blockWindowOpened");
    if (blockerWindow?.kind !== "blockWindowOpened") throw new Error("block window did not open");
    expect(blockerWindow.eligibleBlockerIds).toContain(blocker.perm("examon").permanentId);
    expect(
      blocker.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: blockerWindow.eligibleBlockerIds[0]! }),
    ).toEqual({ ok: true });
    await settle(() => blocker.state.players[1]!.battleArea.length === 0);
    expect(blocker.state.players[0]!.security).toHaveLength(1);

    const evade = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-045", as: "examon" }] },
        1: { security: ["ST22-08"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await evade.ready();
    // Its attack suspends Examon, then its own once-per-turn effect unsuspends it before Security.
    expect(
      evade.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: evade.perm("examon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => evade.events.some((event) => event.kind === "evadePrompt"));
    expect(evade.events.some((event) => event.kind === "evadePrompt")).toBe(true);
    expect(
      evade.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId: evade.perm("examon").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(evade.engine).isAttacking());
    expect(evade.events.some((event) => event.kind === "evadeResolved")).toBe(true);
    expect(evade.perm("examon").isSuspended).toBe(true);
    expect(evade.state.players[1]!.hand.map((card) => card.cardId)).toContain("ST22-08");
  });

  it("unsuspends once when either player's Digimon suspends", async () => {
    for (const suspendingSeat of [0, 1] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-045", suspended: true, as: "examon" },
              ...(suspendingSeat === 0 ? [{ card: "BT20-010", as: "trigger" }] : []),
            ],
          },
          1: {
            battleArea: suspendingSeat === 1 ? [{ card: "BT20-010", as: "trigger" }] : [],
            security: ["BT1-001"],
          },
          ...(suspendingSeat === 0 ? { security: ["BT1-001"] } : {}),
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.turnSeat = suspendingSeat;
      expect(
        s.engine.applyIntent(suspendingSeat, {
          type: "attack",
          attackerPermanentId: s.perm("trigger").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "combatResolved"));
      expect(s.perm("examon").isSuspended).toBe(false);
    }
  });

  it("spends the public once-per-turn unsuspend, then resets after a completed turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-045", suspended: true, as: "examon" },
            { card: "BT20-010", as: "firstTrigger" },
            { card: "BT20-010", as: "secondTrigger" },
          ],
          security: ["BT1-001", "BT1-001"],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          hand: ["BT20-010"],
          security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT20-010", "BT20-010", "BT20-010", "BT20-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstTrigger").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("examon").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("examon").isSuspended).toBe(true);

    s.state.turnSeat = 0;
    s.state.memory = 10;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("examon").isSuspended).toBe(false); // own Unsuspend phase already readied it
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("examon").isSuspended).toBe(false); // self-suspension now gets a fresh use
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});
