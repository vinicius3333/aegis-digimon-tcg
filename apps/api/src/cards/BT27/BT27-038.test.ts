import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { requireCardDefinition } from "@aegis/shared/cards/registry";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, setupEngine, settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { compiled } from "#api/cards/BT27/BT27-038";
import "#api/cards/index";

type Session = ReturnType<typeof setupEngine>;

const quetzalmon = "BT27-038";
const kurataTamer = "BT27-098";
const traitlessTamer = "BT1-085";
const yellowRookie = "BT1-045";
const filler = Array(20).fill("BT1-013");
const securityFiller = Array(3).fill("BT1-009");

function findQuetzalmon(s: Session) {
  return s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === quetzalmon);
}

function trashIds(s: Session, seat: 0 | 1) {
  return s.state.players[seat]!.trash.map(({ instanceId }) => instanceId);
}

async function playQuetzalmon(s: Session) {
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("quetzalmon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => findQuetzalmon(s) !== undefined && !s.state.pendingDecision);
}

function weakenBoard(options: Parameters<typeof setupEngine>[1]) {
  return setupEngine(
    {
      0: {
        hand: [{ card: quetzalmon, as: "quetzalmon" }, "BT1-013"],
        battleArea: [{ card: "BT1-009", as: "fodder" }],
        deck: filler,
        security: securityFiller,
      },
      1: {
        battleArea: [
          { card: "BT1-024", as: "attacker" },
          { card: "BT1-042", as: "bystander" },
        ],
        deck: filler,
        security: securityFiller,
      },
    },
    options,
  );
}

function preferTargets(s: Session, preferred: string[]) {
  preferred.push(
    s.perm("fodder").permanentId,
    s.perm("fodder").topCard.instanceId,
    s.perm("attacker").permanentId,
    s.perm("attacker").topCard.instanceId,
  );
}

describe("Quetzalmon gives Security A. -1, deletes a chosen own Digimon, and gives -6000 DP", () => {
  it("prints yellow and purple Armor Form stats and compiles the shared once-per-turn body", () => {
    expect(requireCardDefinition(quetzalmon)).toMatchObject({
      nameEn: "Quetzalmon",
      nameJp: "クアトルモン",
      colors: ["Yellow", "Purple"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      forms: ["Armor Form"],
      attributes: ["Free"],
      types: ["Mythical Beast", "Kurata's Army", "Bio"],
      rarity: "U",
    });
    expect(requireCardDefinition(quetzalmon).inheritedEffectText).toBeUndefined();
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { baseIsTamer: true, traits: ["Kurata's Army"], cost: 2, isAlternate: true },
    ]);
    const bodies = compiled.effects.filter(({ sharedUseKey }) => sharedUseKey === "BT27-038/security-delete-weaken");
    expect(bodies.map(({ trigger }) => trigger)).toEqual(["OnPlay", "WhenDigivolving", "WhenAttacking"]);
    expect(bodies.every(({ frequency }) => frequency === "OncePerTurn")).toBe(true);
  });

  it("has Armor Purge in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: quetzalmon, as: "quetzalmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("quetzalmon"), "Armor Purge")).toBe(true);
  });

  it.each([
    ["a Kurata's Army Tamer for 2", kurataTamer, true, true, 2],
    ["a traitless Tamer", traitlessTamer, true, false, 0],
    ["a yellow level 3 Digimon for its printed 3", yellowRookie, false, true, 3],
    ["a red level 3 Digimon", "BT1-009", false, false, 0],
  ])("digivolves from %s", async (_label, base, useAlternateCost, allowed, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: quetzalmon, as: "quetzalmon" }],
          deck: filler,
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("quetzalmon").instanceId,
      useAlternateCost,
    });
    expect(result.ok).toBe(allowed);
    if (allowed) await settle(() => s.perm("base").topCard.cardId === quetzalmon && !s.state.pendingDecision);
    expect(s.state.memory).toBe(5 - cost);
    expect(s.perm("base").topCard.cardId).toBe(allowed ? quetzalmon : base);
  });

  it("gives the chosen Digimon Security A. -1 and -6000 DP until the end of their turn", async () => {
    const preferred: string[] = [];
    const s = weakenBoard({ autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferTargets(s, preferred);
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const fodder = s.perm("fodder").topCard.instanceId;
    await playQuetzalmon(s);
    expect(trashIds(s, 0)).toContain(fodder);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(-1);
    expect(s.perm("attacker").currentDP).toBe(4000);
    expect(observe(s.engine).keywordAmount(s.perm("bystander"), "SecurityAttack")).toBe(0);
    expect(s.perm("bystander").currentDP).toBe(10000);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(-1);
    expect(s.perm("attacker").currentDP).toBe(4000);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
    expect(s.perm("attacker").currentDP).toBe(10000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("deletes an opposing Digimon reduced to 0 DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: quetzalmon, as: "quetzalmon" }], battleArea: [{ card: "BT1-009", as: "fodder" }] },
        1: { battleArea: [{ card: "BT1-041", as: "weakened" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("fodder").permanentId, s.perm("fodder").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();
    const weakened = s.perm("weakened").topCard.instanceId;
    await playQuetzalmon(s);
    expect(trashIds(s, 1)).toContain(weakened);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("keeps Security A. -1 but skips deletion and the DP loss when no Digimon is chosen", async () => {
    const preferred: string[] = [];
    const s = weakenBoard({
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: preferred,
      declinePrompts: ["SelectBind"],
    });
    preferTargets(s, preferred);
    s.state.memory = 5;
    await s.ready();
    await playQuetzalmon(s);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(-1);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("fodder").permanentId,
    );
    expect(s.perm("attacker").currentDP).toBe(10000);
    expect(s.perm("bystander").currentDP).toBe(10000);
  });

  it("shares one use per turn between When Digivolving and When Attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: quetzalmon, as: "quetzalmon" }],
          battleArea: [
            { card: "BT1-009", as: "fodder" },
            { card: yellowRookie, as: "base" },
            { card: "BT1-013", as: "second" },
          ],
          deck: filler,
          security: securityFiller,
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "attacker" },
            { card: "BT1-042", as: "bystander" },
          ],
          security: securityFiller,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferTargets(s, preferred);
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quetzalmon").instanceId,
      }).ok,
    ).toBe(true);
    const fodder = s.perm("fodder").topCard.instanceId;
    await settle(() => !s.state.pendingDecision && trashIds(s, 0).includes(fodder));

    const prompts = s.decisions.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.state.players[1]!.security.length === 2);
    expect(s.decisions.slice(prompts).filter(({ req }) => req.sourceCardId === quetzalmon)).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(-1);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("second").permanentId,
    );
  });
});

describe("Quetzalmon official rulings", () => {
  async function digivolveFromTamer(s: Session) {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("quetzalmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard.cardId === quetzalmon && !s.state.pendingDecision);
  }

  it("digivolves from a Tamer while a Digimon can't digivolve, but not from a restricted Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007" },
          battleArea: [
            { card: kurataTamer, as: "tamer" },
            { card: yellowRookie, as: "rookie" },
          ],
          hand: [
            { card: quetzalmon, as: "quetzalmon" },
            { card: quetzalmon, as: "other" },
          ],
          deck: filler,
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("other").instanceId,
      }).ok,
    ).toBe(false);
    await digivolveFromTamer(s);
    expect(s.state.memory).toBe(8);
    expect(s.perm("rookie").topCard.cardId).toBe(yellowRookie);
  });

  it("does not trigger when one of your Digimon digivolves effects when digivolving from a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: kurataTamer, as: "tamer" },
            { card: "BT5-091", as: "watcher" },
          ],
          hand: [{ card: quetzalmon, as: "quetzalmon" }],
          deck: filler,
        },
      },
      { autoAcceptOptional: true, declinePrompts: ["Quetzalmon", "Give 1"] },
    );
    s.state.memory = 5;
    await s.ready();
    await digivolveFromTamer(s);
    expect(s.state.memory).toBe(3);
    expect(s.perm("watcher").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT5-091")).toBe(false);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: kurataTamer, as: "tamer" }],
          hand: [{ card: quetzalmon, as: "quetzalmon" }],
          deck: [{ card: "BT1-013", as: "drawn" }, "BT1-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    await digivolveFromTamer(s);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("can't attack after digivolving from a Tamer played this turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: kurataTamer, as: "tamerCard" },
            { card: quetzalmon, as: "quetzalmon" },
          ],
          deck: filler,
          security: securityFiller,
        },
        1: { deck: filler, security: securityFiller },
      },
      { autoDeclineOptional: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamerCard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && !s.state.pendingDecision);
    const host = s.state.players[0]!.battleArea[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("quetzalmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard.cardId === quetzalmon && !s.state.pendingDecision);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }).ok,
    ).toBe(false);
    expect(host.isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("trashes the Tamer under it as a digivolution card when the Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: kurataTamer, as: "tamer" }],
          hand: [{ card: quetzalmon, as: "quetzalmon" }],
          deck: filler,
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const tamerCard = s.perm("tamer").topCard.instanceId;
    await digivolveFromTamer(s);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([tamerCard]);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId]);
    await settle(() => s.state.pendingDecision !== undefined);
    expect(s.decisions.at(-1)!.req.options?.promptKey).toBe("armorPurge");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(trashIds(s, 0).sort()).toEqual([tamerCard, s.inst("quetzalmon").instanceId].sort());
  });

  it("gains the inherited effect of a Tamer among its digivolution cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: quetzalmon, as: "host", under: ["BT27-092"] },
            { card: "BT1-009", as: "fodder" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("fodder").permanentId, s.perm("victim").permanentId);
    const fodder = s.perm("fodder").topCard.instanceId;
    const victim = s.perm("victim").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("host"));
    await settle(() => !s.state.pendingDecision);
    expect(trashIds(s, 0)).toEqual([fodder]);
    expect(trashIds(s, 1)).toEqual([victim]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([quetzalmon]);
  });

  it("still gives -6000 DP after choosing itself and surviving through Armor Purge", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: yellowRookie, as: "base" }],
          hand: [{ card: quetzalmon, as: "quetzalmon" }],
          deck: filler,
        },
        1: { battleArea: [{ card: "BT1-009", as: "weakened", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("weakened").permanentId, s.perm("weakened").topCard.instanceId);
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quetzalmon").instanceId,
      }).ok,
    ).toBe(true);
    await settle(() => !s.state.pendingDecision && trashIds(s, 0).includes(s.inst("quetzalmon").instanceId));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([yellowRookie]);
    expect(s.perm("weakened").currentDP).toBe(4000);
    expect(observe(s.engine).keywordAmount(s.perm("weakened"), "SecurityAttack")).toBe(-1);
  });

  it("ends its attack when Armor Purge leaves only a Tamer, turning the attacker into that Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: quetzalmon, as: "attacker", under: [kurataTamer] }], security: securityFiller },
        1: { battleArea: [{ card: "BT1-009", as: "weakened", dp: 10000 }], security: securityFiller },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("weakened").permanentId, s.perm("weakened").topCard.instanceId);
    await s.ready();
    const purged = s.perm("attacker").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision);
    expect(s.perm("attacker").topCard.cardId).toBe(kurataTamer);
    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(trashIds(s, 0)).toEqual([purged]);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.perm("weakened").currentDP).toBe(4000);
  });
});
