import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-024.js";
import "./EX3-074.js";

function candidateIds(decision: { options?: { candidateInstanceIds?: string[] } }): string[] {
  return decision.options?.candidateInstanceIds ?? [];
}

describe("EX3-074 Examon", () => {
  it("matches the official identity, DNA requirement, traits, and every printed clause", () => {
    const definition = getCardDefinition("EX3-074")!;
    expect(definition).toMatchObject({
      cardId: "EX3-074",
      nameEn: "Examon",
      colors: ["Green", "Blue"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      types: ["Holy Warrior", "Royal Knight"],
      rarity: "SEC",
      imageId: "EX3-074",
    });
    expect(definition.effectText).toContain("DNA Digivolution: 0 from green Lv.6 + blue Lv.6");
    expect(definition.effectText).toContain("as its bottom digivolution card");
    expect(definition.effectText).toContain("When DNA digivolving");
    expect(definition.effectText).toContain("12000 DP or less");
    expect(definition.effectText).toContain("[All Turns][Once Per Turn]");
  });

  it("Q3436: normal digivolution may place a Dramon at the bottom but cannot use the DNA-only play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-045", as: "greenLevelSix" }],
          hand: [
            { card: "EX3-074", as: "examon" },
            { card: "AD1-024", as: "bottomDramon" },
            { card: "EX3-044", as: "wouldBePlayed" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("bottomDramon").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenLevelSix").permanentId,
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.perm("greenLevelSix").stack.some(({ instanceId }) => instanceId === s.inst("bottomDramon").instanceId),
    );

    expect(s.perm("greenLevelSix").topCard.cardId).toBe("EX3-074");
    expect(s.perm("greenLevelSix").stack[0]!.instanceId).toBe(s.inst("bottomDramon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("wouldBePlayed").instanceId);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-044")).toBe(false);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });

  it("DNA digivolves for 0, places one Dramon at bottom, and plays a different eligible Dramon free", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-045", as: "greenLevelSix" },
            { card: "EX3-024", as: "blueLevelSix" },
          ],
          hand: [
            { card: "EX3-074", as: "examon" },
            { card: "AD1-024", as: "bottomDramon" },
            { card: "EX3-044", as: "playedDramon" },
            { card: "BT10-028", as: "alternatePlayableDramon" },
            { card: "BT8-032", as: "overDpDramon" },
            { card: "EX3-073", as: "wrongColorDramon" },
            { card: "EX3-043", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("bottomDramon").instanceId, s.inst("playedDramon").instanceId);
    const greenId = s.perm("greenLevelSix").permanentId;
    const blueId = s.perm("blueLevelSix").permanentId;
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [greenId, blueId],
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-044") &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-074"),
    );

    const examon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-074")!;
    expect(examon.stack[0]!.instanceId).toBe(s.inst("bottomDramon").instanceId);
    expect(examon.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX3-045", "EX3-024"]));
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(greenId);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(blueId);
    expect(s.state.memory).toBe(4);

    const selections = s.decisions.filter(({ req }) => req.sourceCardId === "EX3-074" && req.kind === "selectCards");
    expect(selections).toHaveLength(2);
    expect(candidateIds(selections[0]!.req)).toEqual(
      expect.arrayContaining([
        s.inst("bottomDramon").instanceId,
        s.inst("playedDramon").instanceId,
        s.inst("overDpDramon").instanceId,
      ]),
    );
    expect(candidateIds(selections[0]!.req)).not.toEqual(
      expect.arrayContaining([s.inst("wrongColorDramon").instanceId, s.inst("unrelated").instanceId]),
    );
    expect(candidateIds(selections[1]!.req)).toContain(s.inst("playedDramon").instanceId);
    expect(candidateIds(selections[1]!.req)).toContain(s.inst("alternatePlayableDramon").instanceId);
    expect(candidateIds(selections[1]!.req)).not.toContain(s.inst("overDpDramon").instanceId);
    assertNoLoudGap(s);
  });

  it("DNA When Digivolving effects may both be declined without moving either hand Dramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-045", as: "greenLevelSix" },
            { card: "EX3-024", as: "blueLevelSix" },
          ],
          hand: [
            { card: "EX3-074", as: "examon" },
            { card: "AD1-024", as: "bottomDramon" },
            { card: "EX3-044", as: "playedDramon" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("greenLevelSix").permanentId, s.perm("blueLevelSix").permanentId],
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-074"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottomDramon").instanceId, s.inst("playedDramon").instanceId]),
    );
    assertNoLoudGap(s);
  });

  it("unsuspends itself and suspends exactly one chosen opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-074", as: "examon" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "chosen" },
            { card: "BT1-029", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("examon").permanentId]);
    await settle(() => !s.perm("examon").isSuspended && s.perm("chosen").isSuspended);

    expect(s.perm("untouched").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("the suspension watcher is self-scoped and fires only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-074", as: "examon" },
            { card: "BT1-010", as: "other" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "first" },
            { card: "BT1-029", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("other").permanentId]);
    expect(s.perm("first").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("examon").permanentId]);
    await settle(() => s.perm("first").isSuspended);
    await advance(s.engine).verb.suspend([s.perm("examon").permanentId]);
    await settle();

    expect(s.perm("examon").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-074")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("still unsuspends itself when the opponent has no Digimon to suspend", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-074", as: "examon" }] } });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("examon").permanentId]);
    await settle(() => !s.perm("examon").isSuspended);

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-074")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("Q3399/Q3401: Slayerdramon can expose suspended Examon as the forced attack target before it unsuspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-024", as: "slayerdramon" },
          { card: "EX3-074", as: "examon" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-029", as: "attacker" },
          { card: "BT1-030", as: "otherAttacker" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    const flow = advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("slayerdramon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    let pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("examon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.seat === 1 && s.state.pendingDecision.kind === "chooseTargets");
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("attacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.seat === 1 && s.state.pendingDecision.kind === "selectCards");
    pending = s.state.pendingDecision!;
    expect(candidateIds(s.decisions.at(-1)!.req)).toContain(s.perm("examon").permanentId);
    expect(s.perm("examon").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [s.perm("examon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.seat === 0 && s.decisions.at(-1)?.req.sourceCardId === "EX3-074");
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("otherAttacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await flow;

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-029");
    expect(s.perm("examon").isSuspended).toBe(false);
    expect(s.perm("otherAttacker").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
