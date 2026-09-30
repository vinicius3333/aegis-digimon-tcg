import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("P-221 engine behavior", () => {
  it("naturally DNA digivolves from Yellow and Purple Lv.6 materials and records DNA immunity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-013", as: "yellowMaterial" },
            { card: "BT16-065", as: "purpleMaterial" },
          ],
          hand: [{ card: "P-221", as: "chaosmon" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellowMaterial").permanentId, s.perm("purpleMaterial").permanentId],
        instanceId: s.inst("chaosmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-221"));
    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "P-221")!;
    expect(observe(s.engine).isRestricted(result, "beAffected")).toBe(true);
  });

  it("reduces an opposing Digimon by exactly 10000 DP on When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-221", as: "chaosmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 15000 }] },
      },
      { autoSelectCards: true },
    );
    const base = s.perm("target").currentDP;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("chaosmon"), {
      isDnaDigivolve: true,
    });
    await settle();
    expect(s.perm("target").currentDP).toBe(base - 10000);
    expect(observe(s.engine).isRestricted(s.perm("chaosmon"), "beAffected")).toBe(true);
  });

  it("reduces an opposing Digimon by exactly 10000 DP when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-221", as: "chaosmon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 15000 }], security: ["BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chaosmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("can choose an immune opposing Digimon, but its DP is not changed (Q5766)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-221", as: "source" }] },
      1: { battleArea: [{ card: "P-221", as: "immuneTarget", dp: 15000 }] },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("immuneTarget"), {
      isDnaDigivolve: true,
    });
    const before = s.perm("immuneTarget").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("immuneTarget").currentDP).toBe(before);
  });
});
import "./P-221.js";
import "./P-222.js";
import "./P-240.js";
import "../BT16/BT16-034.js";
import "../EX10/EX10-010.js";

describe("P-221 Chaosmon", () => {
  it("has Security Attack +1 and the printed Partition requirement", () => {
    const card = runtimeCompiledCard("P-221")!;
    expect(card.effects.slice(0, 2).map((effect) => effect.keywords)).toEqual([
      [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      [{ keyword: "Partition", raw: "＜Partition (Yellow Lv.6 & Purple/Black Lv.6)＞" }],
    ]);
  });

  it("grants DNA-only immunity to itself until the opponent's turn ends", () => {
    expect(
      runtimeCompiledCard("P-221")!.effects.find(
        (effect) => effect.trigger === "WhenDigivolving" && effect.actions[0]?.kind === "Restrict",
      ),
    ).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          restriction: "beAffected",
          duration: "untilOpponentTurnEnd",
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          condition: { kind: "isDnaDigivolving" },
        },
      ],
    });
  });

  it("gives one opposing Digimon -10000 DP on digivolution and when attacking", () => {
    const card = runtimeCompiledCard("P-221")!;
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      expect(
        card.effects.find((effect) => effect.trigger === trigger && effect.actions[0]?.kind === "ModifyDP"),
      ).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -10000,
            duration: "untilOpponentTurnEnd",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          },
        ],
      });
    }
  });
});

describe("P-221 continuous behavior", () => {
  it("grants Security Attack +1 to a resident Chaosmon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-221", as: "chaosmon" }] } });
    await s.ready();
    const ledger = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(ledger.hasKeyword(s.perm("chaosmon").permanentId, "SecurityAttack")).toBe(true);
    expect(ledger.hasKeyword(s.perm("chaosmon").permanentId, "Partition")).toBe(true);
  });
});

describe("P-221 Chaosmon — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;

  async function immunize(s: Setup) {
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("chaosmon"), {
      isDnaDigivolve: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(s.perm("chaosmon"), "beAffected")).toBe(true);
  }

  function opponentBoard(extra: { battleArea?: string[]; security?: number; preferred?: string[] } = {}) {
    return setupEngine(
      {
        0: {
          battleArea: (extra.battleArea ?? []).map((card) => ({ card, as: card, dp: 30000 })),
          security: extra.security ?? 5,
          deck: Array(10).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "P-221", as: "chaosmon" }, { card: "BT1-009", as: "fodder" }],
          deck: Array(10).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: extra.preferred ?? [] },
    );
  }

  it("keeps an unaffected Digimon from being suspended or losing DP to the chosen effect (Q5765)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-222", as: "rosemon", dp: 30000 },
            { card: "BT16-034", as: "tempomon", dp: 30000 },
          ],
          security: 5,
        },
        1: { battleArea: [{ card: "P-221", as: "chaosmon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    await immunize(s);
    preferred.push(s.perm("chaosmon").permanentId, s.perm("chaosmon").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("rosemon"));
    await settle(() => s.state.pendingDecision === undefined);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tempomon"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("chaosmon").isSuspended).toBe(false);
    expect(s.perm("chaosmon").currentDP).toBe(15000);
  });

  it("can be given an opponent's <Security A.> grant, but is not considered to have it (Q5767)", async () => {
    const preferred: string[] = [];
    const s = opponentBoard({ battleArea: ["BT16-034"], security: 2, preferred });
    await s.ready();
    await immunize(s);
    preferred.push(s.perm("chaosmon").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("BT16-034"));
    await settle(() => s.state.pendingDecision === undefined);

    const grantChoice = s.decisions.at(-1)!.req;
    expect(grantChoice.kind).toBe("chooseTargets");
    expect(grantChoice.options?.candidateInstanceIds).toContain(s.perm("chaosmon").permanentId);
    expect(observe(s.engine).keywordAmount(s.perm("fodder"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("chaosmon"), "SecurityAttack")).toBe(1);
  });

  it("stops being affected by an earlier DP reduction as soon as it gains the immunity (Q5768)", async () => {
    const s = opponentBoard({ battleArea: ["BT16-034"], security: 4 });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("BT16-034"));
    await settle(() => s.state.pendingDecision === undefined);
    const reduced = s.perm("chaosmon").currentDP;
    expect(reduced).toBeLessThan(15000);

    await immunize(s);
    await advance(s.engine).recompute();
    expect(s.perm("chaosmon").currentDP).toBe(15000);
  });

  it("is affected by the DP reduction as soon as the immunity ends (Q5769)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-034", as: "tempomon", dp: 30000 }],
          hand: ["BT1-009"],
          security: 4,
          deck: Array(10).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "P-221", as: "chaosmon" }],
          hand: ["BT1-009"],
          deck: Array(10).fill("BT1-009"),
          security: 5,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await immunize(s);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tempomon"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("chaosmon").currentDP).toBe(15000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("chaosmon"), "beAffected")).toBe(false);
    expect(s.perm("chaosmon").currentDP).toBe(11000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger a granted [Start of Your Main Phase] effect while unaffected by effects (Q5770)", async () => {
    // Chaosmon's own DNA immunity lapses when the granting player's turn ends, before the granted
    // [Start of Your Main Phase] can trigger. BlackWarGreymon stays unaffected by Digimon effects
    // while Arcturusmon (13000 DP) is in play, so it is unaffected when the gained effect triggers.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-240", as: "arcturusmon" }, "BT1-009"],
          trash: ["EX12-007", "EX12-013"],
          deck: Array(10).fill("BT1-009"),
          security: 5,
        },
        1: { battleArea: [{ card: "EX10-010", as: "blackWarGreymon" }], deck: Array(10).fill("BT1-009"), security: 5 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arcturusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("arcturusmon").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).customEffectGrants(s.perm("blackWarGreymon"))).toHaveLength(1);
    const immunityActiveDp = 12000 + 3000;
    expect(s.perm("blackWarGreymon").currentDP).toBe(immunityActiveDp);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("blackWarGreymon").currentDP).toBe(immunityActiveDp);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.perm("blackWarGreymon").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
