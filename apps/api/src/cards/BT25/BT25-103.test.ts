import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT25-103.js";

describe("BT25-103 GraceNovamon", () => {
  it("digivolves for 5 from a red or blue level 6 stack but not a same-trait level 5", async () => {
    for (const base of ["BT25-018", "BT25-028"]) {
      const legal = setupEngine({
        0: {
          battleArea: [{ card: base, under: ["BT24-010"], as: "base" }],
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
      expect(legal.perm("base").stack.map((card) => card.cardId)).toEqual(["BT24-010", base]);
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
        0: { battleArea: [{ card: "BT25-103", under: ["BT24-009", "BT24-010"], as: "grace" }] },
        1: { battleArea: [{ card: "BT24-014", under: ["BT24-009"], as: "target" }] },
      },
      { autoSelectCards: true },
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
        0: { battleArea: [{ card: "BT25-103", under: ["BT24-009", "BT24-010"], as: "grace" }] },
        1: {
          deck: [{ card: "AD1-001", as: "oldBottom" }],
          battleArea: [
            { card: "BT24-014", under: ["AD1-002", "AD1-003"], as: "equal" },
            { card: "BT24-015", under: ["AD1-001", "AD1-002", "AD1-003"], as: "tooMany" },
            { card: "BT1-085", under: ["BT1-009", "BT1-019"], as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
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
          battleArea: [{ card: "BT25-103", under: ["BT24-009", "BT24-010"], as: "grace" }],
        },
        1: {
          security: ["AD1-001"],
          battleArea: [
            { card: "BT24-014", under: ["AD1-001", "AD1-002", "AD1-003"], as: "firstHost" },
            { card: "BT24-015", under: ["BT1-009", "BT1-019", "BT1-051"], as: "secondHost" },
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
    expect(s.perm("firstHost").stack).toHaveLength(2);
    expect(s.perm("secondHost").stack).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses the same effect in the defending Counter window, ends the attack, and cannot reuse it that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-003", under: ["AD1-001", "AD1-002", "AD1-004"], as: "firstAttacker" },
            { card: "AD1-004", under: ["BT1-009"], as: "secondAttacker" },
          ],
        },
        1: {
          security: ["BT1-009", "BT1-019"],
          battleArea: [{ card: "BT25-103", under: ["BT24-009", "BT24-010"], as: "grace" }],
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
});
