import { describe, expect, it } from "vitest";
import { Phase, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-013.js";
import "../BT2/BT2-018.js";
import "../index.js";

describe("EX5-013 Zhuqiaomon", () => {
  it("matches the catalog and encodes Counter, the inclusive OR cost, shared OPT, and deletion", () => {
    expect(getCardDefinition("EX5-013")).toMatchObject({
      cardId: "EX5-013",
      nameEn: "Zhuqiaomon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 7,
      dp: 12000,
      types: ["Holy Bird", "Four Sovereigns"],
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
      effectText:
        "[Hand] [Counter] ＜Blast Digivolve＞ (Your Digimon may digivolve into this card without paying the cost).[When Digivolving] [When Attacking] [Once Per Turn] By deleting 1 Digimon with the [Deva]\u00a0trait or 6000 DP or less, this Digimon gains ＜Security Attack +1＞ (This Digimon checks 1 additional security card) for the turn.[On Deletion] Delete 1 of your opponent's Digimon with the highest DP.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
    });
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "GainKeyword",
            duration: "forTheTurn",
            optional: true,
            abortOnDecline: true,
            keyword: { keyword: "SecurityAttack", amount: 1 },
            cost: {
              kind: "deleteOwn",
              target: {
                count: 1,
                filter: {
                  kind: ["Digimon"],
                  or: [{ nameOrTrait: [{ match: "trait", tokens: ["Deva"] }] }, { dp: { op: "lte", value: 6000 } }],
                },
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toEqual([
      {
        kind: "Delete",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" } },
      },
    ]);
  });

  it("resolves a legal red evolution and Q3550's Deva branch against an opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-011", as: "base" }],
          hand: [{ card: "EX5-013", as: "zhuqiaomon" }],
        },
        1: { battleArea: [{ card: "EX5-009", as: "deva", dp: 12000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("deva").permanentId);
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zhuqiaomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "EX5-013" &&
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("deva").instanceId),
    );
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-011"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("deva").instanceId);
    expect(s.state.memory).toBe(6);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("honors the inclusive 6000-DP side of Q3550 and rejects a 6001-DP non-Deva", async () => {
    for (const [dp, shouldDelete] of [
      [6000, true],
      [6001, false],
    ] as const) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX5-011", as: "base" }],
            hand: [{ card: "EX5-013", as: "zhuqiaomon" }],
          },
          1: { battleArea: [{ card: "BT1-009", as: "target", dp }], security: ["BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm("target").permanentId);
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("zhuqiaomon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "EX5-013");
      if (shouldDelete) {
        await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId));
      }
      expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(
        shouldDelete,
      );
      expect(
        s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("target").instanceId),
      ).toBe(!shouldDelete);
      expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(shouldDelete ? 2 : 1);
      expect(s.state.memory).toBe(6);
      expect(s.state.pendingDecision).toBeUndefined();
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
    }
  });

  it("shares the Once Per Turn use between When Digivolving and When Attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-011", as: "base" },
            { card: "BT1-009", as: "attackCost", dp: 3000 },
          ],
          hand: [{ card: "EX5-013", as: "zhuqiaomon" }],
        },
        1: {
          battleArea: [{ card: "EX5-009", as: "evolutionCost", dp: 12000 }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("evolutionCost").permanentId);
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zhuqiaomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("evolutionCost").instanceId),
    );
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("attackCost").instanceId),
    ).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("allows the When Attacking effect again on the next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-013", as: "zhuqiaomon" },
            { card: "EX5-009", as: "firstCost" },
            { card: "BT1-009", as: "secondCost", dp: 3000 },
          ],
          security: ["BT1-010"],
          deck: ["BT1-014", "BT1-014"],
        },
        1: { security: ["BT1-011", "BT1-012", "BT1-013"], deck: ["BT1-014", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstCost").permanentId);
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zhuqiaomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstCost").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    preferred.push(s.perm("secondCost").permanentId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zhuqiaomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondCost").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("honors optional refusal for the attack cost without granting Security Attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-013", as: "zhuqiaomon" },
            { card: "BT1-009", as: "target", dp: 3000 },
          ],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zhuqiaomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("zhuqiaomon"), "SecurityAttack")).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("deletes the opposing highest-DP Digimon on deletion through a public play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-013", as: "source", dp: 4000 }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "high", dp: 13000 },
          { card: "BT1-010", as: "low", dp: 9000 },
        ],
        hand: [{ card: "BT2-018", as: "volcanicdramon" }],
      },
    });
    await s.ready();
    // Structural phase setup only; the public BT2-018 play and all resulting deletion effects
    // still resolve through production intents/interpreter paths.
    s.state.phase = Phase.Main;
    s.state.turnSeat = 1;
    s.state.memory = 20;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("volcanicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("high").instanceId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("source").instanceId),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("high").instanceId);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("low").instanceId)).toBe(
      true,
    );
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("volcanicdramon").instanceId),
    ).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Blast Digivolves from hand through a public Counter window without paying memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-011", as: "base" },
            { card: "EX5-009", as: "deva" },
          ],
          hand: [{ card: "EX5-013", as: "zhuqiaomon" }],
          security: ["BT1-009"],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-011", as: "attacker" }],
          security: ["BT1-012"],
          deck: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("deva").permanentId);
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("zhuqiaomon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-013");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-011"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("deva").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects an illegal level-4 normal evolution without changing the host stack or memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "EX5-013", as: "zhuqiaomon" }],
      },
    });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("zhuqiaomon").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
