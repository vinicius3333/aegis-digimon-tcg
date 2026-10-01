import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT25-103.js";

describe("BT25-103 GraceNovamon", () => {
  it("digivolves for 5 from a red or blue level 6 stack but not a same-trait level 5", async () => {
    for (const base of ["BT25-018", "BT25-028"]) {
      const legal = setupEngine({
        0: {
          battleArea: [{ card: base, under: [base === "BT25-018" ? "BT24-014" : "BT24-074"], as: "base" }],
          hand: [{ card: "BT25-103", as: "grace" }],
          deck: ["AD1-001"],
        },
      });
      legal.state.memory = 5;
      expect(
        legal.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: legal.perm("base").permanentId,
          instanceId: legal.inst("grace").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => legal.perm("base").topCard.cardId === "BT25-103");
      expect(legal.state.memory).toBe(0);
      expect(legal.perm("base").stack.map((card) => card.cardId)).toEqual([
        base === "BT25-018" ? "BT24-014" : "BT24-074",
        base,
      ]);
      expect(legal.state.players[0]!.hand).toHaveLength(1);
    }

    const nearMatch = setupEngine({
      0: {
        battleArea: [{ card: "BT25-016", as: "sameTraitsWrongLevel" }],
        hand: [{ card: "BT25-103", as: "grace" }],
      },
    });
    nearMatch.state.memory = 5;
    expect(
      nearMatch.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nearMatch.perm("sameTraitsWrongLevel").permanentId,
        instanceId: nearMatch.inst("grace").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("returns an eligible opponent Digimon during a real digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-018", under: ["BT24-014"], as: "base" }],
          hand: [{ card: "BT25-103", as: "grace" }],
        },
        1: { battleArea: [{ card: "BT24-014", under: ["BT24-010"], as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard!.instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grace").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "BT25-103" &&
        s.state.players[1]!.deck.some((card) => card.instanceId === targetId),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(false);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("models the shared When Attacking/Counter once-per-turn effect per this stack", () => {
    const attack = compiled.effects.find(
      (entry) => entry.trigger === "WhenAttacking" && entry.frequency === "OncePerTurn",
    );
    const counter = compiled.effects.find((entry) => entry.trigger === "Counter");

    expect(attack).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "BT25-103/trash-sources-end-attack",
    });
    expect(attack?.actions).toMatchObject([
      {
        kind: "TrashDigivolution",
        amount: 1,
        scope: "acrossDigimon",
        optional: true,
        scaling: { per: 1, unit: "digivolutionCards" },
      },
      { kind: "EndAttack", optional: true },
    ]);
    expect(counter).toMatchObject({
      trigger: "Counter",
      frequency: "OncePerTurn",
      sharedUseKey: "BT25-103/trash-sources-end-attack",
    });
  });

  it("returns an opponent Digimon with no more digivolution cards to deck bottom when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-103", under: ["BT24-014", "BT25-018"], as: "grace" }] },
        1: { battleArea: [{ card: "BT24-014", under: ["BT24-010"], as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard!.instanceId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("grace"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === targetId)).toBe(false);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("enforces the exact source-count boundary and ignores a Tamer with the same stack size", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-103", under: ["BT24-014", "BT25-018"], as: "grace" }] },
        1: {
          deck: [{ card: "AD1-001", as: "oldBottom" }],
          battleArea: [
            { card: "BT24-014", under: ["BT24-009", "BT24-010"], as: "equal" },
            { card: "BT25-018", under: ["BT24-009", "BT24-010", "BT24-014"], as: "tooMany" },
            { card: "BT1-085", under: ["BT24-009", "BT24-010"], as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("equal").permanentId);
    const returnedId = s.perm("equal").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("grace"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([s.perm("tooMany").permanentId, s.perm("tamer").permanentId]),
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === returnedId)).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(returnedId);
  });

  it("exposes its printed Security Attack, Ice Clad, and Partition keywords", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT25-103", as: "grace" }] } });
    await s.ready();
    const continuous = (
      s.engine as unknown as {
        continuous: {
          hasKeyword(id: string, keyword: string): boolean;
          grantedKeywords(id: string): { keyword: string; amount?: number }[];
        };
      }
    ).continuous;
    const id = s.perm("grace").permanentId;
    expect(continuous.hasKeyword(id, "IceClad")).toBe(true);
    expect(continuous.hasKeyword(id, "Partition")).toBe(true);
    expect(
      continuous.grantedKeywords(id).some((grant) => grant.keyword === "SecurityAttack" && grant.amount === 1),
    ).toBe(true);
  });

  it("trashes one freely chosen opponent source per own source across multiple hosts, then ends its attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-103", under: ["BT24-014", "BT25-018"], as: "grace" },
            { card: "BT25-018", under: ["BT24-009", "BT24-010", "BT24-014"], as: "unrelatedOwnStack" },
          ],
        },
        1: {
          security: ["AD1-001"],
          battleArea: [
            { card: "BT1-014", as: "returnTarget" },
            { card: "BT25-103", under: ["BT24-009", "BT24-010", "BT24-014", "BT25-018"], as: "firstHost" },
            { card: "BT25-103", under: ["BT24-009", "BT24-010", "BT24-014", "BT25-018"], as: "secondHost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstHost").stack[0]!.instanceId, s.perm("secondHost").stack[1]!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("grace").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 2);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(preferred));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(preferred));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(
      s.decisions
        .filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT25-103")
        .map(({ req }) => req.options?.effectTextPart),
    ).toEqual([
      "[When Attacking] [Counter] [Once Per Turn] For each of this Digimon's digivolution cards, you may trash any 1 digivolution card from your opponent's Digimon.",
      "Then, you may end this attack.",
    ]);
  });

  it("uses the same effect in the defending Counter window, ends the attack, and cannot reuse it that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-018", under: ["BT24-009", "BT24-010", "BT24-014"], as: "firstAttacker" },
            { card: "BT25-018", under: ["BT24-014"], as: "secondAttacker" },
          ],
        },
        1: {
          security: ["BT1-009", "BT1-019"],
          battleArea: [{ card: "BT25-103", under: ["BT24-014", "BT25-018"], as: "grace" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const graceCounter = opened.eligibleCounters.find(
      (entry) => entry.instanceId === s.perm("grace").topCard.instanceId,
    );
    expect(graceCounter).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: graceCounter!.instanceId,
        effectKey: graceCounter!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(2);

    const openedCount = s.events.filter((event) => event.kind === "counterWindowOpened").length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.events.filter((event) => event.kind === "counterWindowOpened")).toHaveLength(openedCount);
  });

  it("digivolves from a non-Red/Blue Lv.6 [TS] Digimon for cost 5 and rejects a non-[TS] base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-041", as: "base" }], hand: [{ card: "BT25-103", as: "source" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT25-103");
    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT5-084", as: "base" }], hand: [{ card: "BT25-103", as: "source" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});

describe("BT25-103 GraceNovamon — KB Q&A rulings", () => {
  const GRACE = "BT25-103";
  const END_ATTACK_KEY = "trash-sources-end-attack";

  /**
   * GraceNovamon (Sangomon's inherited [End of Attack] gains 1 memory) attacks the player. The
   * opponent has a Digimon with no sources to return and an unsuspended Blocker.
   */
  async function graceAttacks(options: SetupEngineOptions) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GRACE, as: "grace", under: ["BT19-017", "BT24-014"] }] },
        1: {
          security: ["BT1-009", "BT1-010"],
          battleArea: [
            { card: "BT1-014", as: "returnTarget" },
            { card: "BT25-018", as: "sourceHost", under: ["BT24-009"] },
            { card: "BT25-085", as: "blocker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred, ...options },
    );
    preferred.push(s.perm("returnTarget").permanentId);
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("grace").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    return s;
  }

  const returnedToDeck = (s: ReturnType<typeof setupEngine>) =>
    s.state.players[1]!.deck.some((card) => card.cardId === "BT1-014");

  it.each([
    { firstKey: END_ATTACK_KEY, returnsHost: true },
    { firstKey: "ir-", returnsHost: false },
  ])(
    "lets its controller order its simultaneous When Attacking effects (first: $firstKey) (Q6488)",
    async ({ firstKey, returnsHost }) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: { battleArea: [{ card: GRACE, as: "grace", under: ["BT24-014"] }] },
          1: {
            security: ["BT1-009"],
            battleArea: [
              { card: "BT1-014", as: "returnTarget" },
              { card: "BT25-018", as: "sourceHost", under: ["BT24-009", "BT24-010"] },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred, autoOrderTriggers: false },
      );
      preferred.push(s.perm("sourceHost").permanentId, s.perm("sourceHost").stack[0]!.instanceId);
      const hostCardId = s.perm("sourceHost").topCard.instanceId;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("grace").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const pending = s.state.pendingDecision!;
      const keys = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req.options!.triggerKeys!;
      expect(keys).toHaveLength(2);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "orderTriggers", order: [keys.find((key) => key.includes(`${GRACE}/${firstKey}`))!] },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(s.state.players[1]!.deck.some((card) => card.instanceId === hostCardId)).toBe(returnsHost);
      expect(returnedToDeck(s)).toBe(!returnsHost);
    },
  );

  it("still activates its [When Digivolving] [When Attacking] effect after its [Counter] effect ends the attack (Q6490)", async () => {
    const s = await graceAttacks({ preferTriggerKeys: [END_ATTACK_KEY] });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(returnedToDeck(s)).toBe(true);
  });

  it("resolves the derived [End of Attack] effect before the pending [When Attacking] effect (Q6490)", async () => {
    const s = await graceAttacks({ preferTriggerKeys: [END_ATTACK_KEY] });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const memoryGained = s.events.findIndex((event) => event.kind === "memoryChanged" && event.reason === "gainMemory");
    const returned = s.events.findIndex((event) => event.kind === "cardsMoved" && event.to === "deckBottom");
    expect(memoryGained).toBeGreaterThanOrEqual(0);
    expect(memoryGained).toBeLessThan(returned);
  });

  it("moves straight to the end of attack: no block timing and no security check (Q6491)", async () => {
    const s = await graceAttacks({ preferTriggerKeys: [END_ATTACK_KEY] });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("still triggers [End of Attack] effects after an effect ends the attack (Q6493)", async () => {
    const s = await graceAttacks({ preferTriggerKeys: [END_ATTACK_KEY] });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.events).toContainEqual(expect.objectContaining({ kind: "effectTriggered", sourceCardId: "BT19-017" }));
    expect(s.state.memory).toBe(1);
  });

  /** The opponent attacks; the defending GraceNovamon is eligible for its [Counter] effect. */
  async function attackIntoGrace(options: SetupEngineOptions = {}) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", dp: 20000, as: "attacker", under: ["BT1-010", "BT1-011"] }],
        },
        1: {
          security: ["BT1-009", "BT1-019"],
          battleArea: [
            { card: GRACE, as: "grace", under: ["BT24-014", "BT25-018"] },
            { card: "BT25-085", as: "beel", suspended: true, under: ["BT25-085"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, ...options },
    );
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
    const counterOf = (alias: string) =>
      opened.eligibleCounters.find((entry) => entry.instanceId === s.perm(alias).topCard.instanceId)!;
    return Object.assign(s, { counterOf });
  }

  it("ends an attack by a Digimon that isn't affected by effects (Q6492)", async () => {
    const s = await attackIntoGrace();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("attacker").permanentId,
      "beAffected",
      EffectDuration.Permanent,
    );
    await advance(s.engine).recompute();
    const graceCounter = s.counterOf("grace");

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: graceCounter.instanceId,
        effectKey: graceCounter.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("attacker").stack).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
  });

  it("allows no second [Counter] effect in the same attack after its own (Q6717)", async () => {
    const s = await attackIntoGrace({ declinePrompts: ["EndAttack"] });
    const graceCounter = s.counterOf("grace");
    const beelCounter = s.counterOf("beel");
    expect(beelCounter).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: graceCounter.instanceId,
        effectKey: graceCounter.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: beelCounter.instanceId,
        effectKey: beelCounter.effectKey,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.perm("beel").isSuspended).toBe(true);
    expect(s.events.filter((event) => event.kind === "counterWindowOpened")).toHaveLength(1);
  });
});
