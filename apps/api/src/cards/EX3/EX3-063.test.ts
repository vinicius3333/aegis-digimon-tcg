import { EffectTiming, getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-063.js";
import "./EX3-073.js";

interface DecisionPayload {
  candidateInstanceIds?: string[];
  min?: number;
  max?: number;
  timing?: string;
  effectText?: string;
  promptKey?: string;
}

function payload(s: EngineSetup): DecisionPayload {
  return JSON.parse(s.state.pendingDecision!.payloadJson) as DecisionPayload;
}

function respond(s: EngineSetup, response: DecisionResponse): void {
  expect(
    s.engine.applyIntent(s.state.pendingDecision!.seat, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX3-063 Imperialdramon: Dragon Mode", () => {
  it("matches the official errata identity, evolution routes, DNA materials, and full text", () => {
    const definition = getCardDefinition("EX3-063")!;
    expect(definition).toMatchObject({
      cardId: "EX3-063",
      nameEn: "Imperialdramon: Dragon Mode",
      colors: ["Purple", "Red"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Ancient Dragon"],
      rarity: "SR",
      imageId: "EX3-063-Errata",
    });
    expect(definition.evoCosts).toEqual([
      { color: "Purple", level: 5, memoryCost: 4 },
      { color: "Red", level: 5, memoryCost: 4 },
    ]);
    expect(definition.effectText).toContain("DNA Digivolution: 0 from purple Lv.5 + red Lv.5");
    expect(definition.effectText).toContain("your opponent chooses 1 of their Digimon");
    expect(definition.effectText).toContain("Delete all of their other Digimon. Then, ＜Blitz＞");
    expect(definition.effectText).toContain("[When Attacking][Once Per Turn]");
  });

  it("DNA digivolves for 0, lets the opponent choose the survivor, deletes the others, and gains Blitz", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-010", as: "redLevel5" },
            { card: "EX3-061", as: "purpleLevel5" },
          ],
          hand: [{ card: "EX3-063", as: "dragonMode" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "first" },
            { card: "BT1-029", as: "survivor" },
            { card: "BT1-030", as: "third" },
          ],
        },
      },
      { autoAcceptOptional: false, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    await s.ready();
    const firstCard = s.perm("first").topCard.instanceId;
    const thirdCard = s.perm("third").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("redLevel5").permanentId, s.perm("purpleLevel5").permanentId],
        instanceId: s.inst("dragonMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(s.state.pendingDecision?.kind).toBe("chooseTargets");

    expect(s.state.pendingDecision?.seat).toBe(1);
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "chooseTargets",
      seat: 1,
      sourceCardId: "EX3-063",
      options: { min: 1, max: 1, timing: "WhenDigivolving" },
    });
    expect(payload(s).candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.perm("first").permanentId,
        s.perm("survivor").permanentId,
        s.perm("third").permanentId,
      ]),
    );
    expect(payload(s).effectText).toContain("your opponent chooses 1 of their Digimon");
    respond(s, { kind: "chooseTargets", instanceIds: [s.perm("survivor").permanentId] });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 1 &&
        observe(s.engine).hasKeyword(s.state.players[0]!.battleArea[0]!, "Blitz"),
    );

    const dragonMode = s.state.players[0]!.battleArea[0]!;
    expect(s.state.memory).toBe(2);
    expect(dragonMode.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX3-010", "EX3-061"]));
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("survivor").permanentId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([firstCard, thirdCard]),
    );
    expect(observe(s.engine).hasKeyword(dragonMode, "Blitz")).toBe(true);
    assertNoLoudGap(s);
  });

  it("ordinary digivolution costs 4 and grants neither deletion nor Blitz", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-061", as: "base" }],
        hand: [{ card: "EX3-063", as: "dragonMode" }],
        deck: ["BT1-001"],
      },
      1: {
        battleArea: [
          { card: "BT1-028", as: "first" },
          { card: "BT1-029", as: "second" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dragonMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-063" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(false);
    expect(s.decisions).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("Q2891: DNA effects may resolve on the opponent's turn, but Blitz still cannot authorize an attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-063", as: "dragonMode" }] },
      1: { security: ["BT1-001"] },
    });
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("dragonMode"), {
      isDnaDigivolve: true,
      subjectPermanentId: s.perm("dragonMode").permanentId,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("dragonMode"), "Blitz"));

    expect(observe(s.engine).hasKeyword(s.perm("dragonMode"), "Blitz")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dragonMode").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "not-your-turn" });
    assertNoLoudGap(s);
  });

  it("When Attacking gains +2000 DP, may pay 2 to become Fighter Mode, and preserves the buff", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-063", under: ["EX3-061", "EX3-010"], as: "dragonMode" }],
          hand: [
            { card: "EX3-073", as: "fighterMode" },
            { card: "EX3-073", as: "otherFighterMode" },
            { card: "BT3-031", as: "wrongImperialdramon" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: false, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dragonMode").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.pendingDecision?.kind).toBe("optional");
    expect(s.perm("dragonMode").currentDP).toBe(14000);
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-063",
      options: { timing: "WhenAttacking" },
    });
    expect(payload(s).effectText).toContain("may digivolve into [Imperialdramon: Fighter Mode]");
    respond(s, { kind: "optional", accept: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.state.pendingDecision?.kind).toBe("selectCards");
    expect(s.decisions.at(-1)!.req).toMatchObject({
      sourceCardId: "EX3-063",
      options: {
        candidateInstanceIds: [s.inst("fighterMode").instanceId, s.inst("otherFighterMode").instanceId],
        visibleInstanceIds: [
          s.inst("fighterMode").instanceId,
          s.inst("otherFighterMode").instanceId,
          s.inst("wrongImperialdramon").instanceId,
        ],
        min: 1,
        max: 1,
        timing: "WhenAttacking",
      },
    });
    respond(s, { kind: "selectCards", instanceIds: [s.inst("fighterMode").instanceId] });

    // Fighter Mode's own optional When Digivolving cost is the next prompt and is declined here.
    await settle(() => s.perm("dragonMode").topCard.cardId === "EX3-073");
    expect(s.perm("dragonMode").topCard.cardId).toBe("EX3-073");
    if (s.state.pendingDecision?.kind === "optional") respond(s, { kind: "optional", accept: false });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("dragonMode").currentDP).toBe(15000);
    expect(s.perm("dragonMode").stack.map(({ cardId }) => cardId)).toContain("EX3-063");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("wrongImperialdramon").instanceId,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("otherFighterMode").instanceId,
    );
    assertNoLoudGap(s);
  });

  it("may decline Fighter Mode while keeping the +2000 DP, then does not trigger again that turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-063", as: "dragonMode" }],
        hand: [{ card: "EX3-073", as: "fighterMode" }],
      },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dragonMode").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.pendingDecision?.kind).toBe("optional");
    respond(s, { kind: "optional", accept: false });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.security.length === 1 &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("dragonMode").currentDP).toBe(14000);

    await advance(s.engine).verb.unsuspend([s.perm("dragonMode").permanentId]);
    const decisionCount = s.decisions.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dragonMode").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("dragonMode").currentDP).toBe(14000);
    expect(s.decisions).toHaveLength(decisionCount);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("fighterMode").instanceId);
    assertNoLoudGap(s);
  });

  it("without Fighter Mode in hand, the mandatory DP bonus resolves with no impossible prompt", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-063", as: "dragonMode" }],
        hand: [{ card: "BT3-031", as: "otherImperialdramon" }],
      },
      1: { security: ["BT1-001"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dragonMode").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 0);

    expect(s.perm("dragonMode").currentDP).toBe(14000);
    expect(s.decisions).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
