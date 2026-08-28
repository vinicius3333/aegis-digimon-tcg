import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-061.js";

interface SelectionPayload {
  candidateInstanceIds?: string[];
  visibleInstanceIds?: string[];
  min?: number;
  max?: number;
  timing?: string;
  effectText?: string;
}

function payload(s: EngineSetup): SelectionPayload {
  return s.decisions.at(-1)!.req.options as SelectionPayload;
}

function respond(s: EngineSetup, response: DecisionResponse): void {
  const request = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(request.seat, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX3-061 Dinobeemon", () => {
  it("matches the printed identity, evolution routes, DNA materials, and complete text", () => {
    const definition = getCardDefinition("EX3-061")!;

    expect(definition).toMatchObject({
      cardId: "EX3-061",
      nameEn: "Dinobeemon",
      colors: ["Purple", "Red"],
      level: 5,
      playCost: 8,
      dp: 8000,
      attributes: ["Free"],
      types: ["Mutant"],
      rarity: "U",
    });
    expect(definition.evoCosts).toEqual([
      { color: "Purple", level: 4, memoryCost: 4 },
      { color: "Red", level: 4, memoryCost: 4 },
    ]);
    expect(definition.effectText).toContain("DNA Digivolution: 0 from purple Lv.4 + red Lv.4");
    expect(definition.effectText).toContain("When DNA digivolving, you may play 1 [Paildramon]");
    expect(definition.effectText).toContain("[On Deletion] You may play 1 [Wormmon]");
    expect(definition.inheritedEffectText).toContain("attack your opponent's unsuspended Digimon");
  });

  it("DNA digivolves for 0 and offers exactly the Paildramon cards in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-058", as: "purple" },
            { card: "EX3-008", as: "red" },
          ],
          hand: [{ card: "EX3-061", as: "dinobeemon" }],
          trash: [
            { card: "EX3-010", as: "paildramon" },
            { card: "ST9-05", as: "otherPaildramon" },
            { card: "BT3-055", as: "wrongName" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("purple").permanentId, s.perm("red").permanentId],
        instanceId: s.inst("dinobeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-058", "EX3-008"]),
    );
    expect(s.state.pendingDecision?.kind).toBe("optional");
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-061",
      options: { timing: "WhenDigivolving" },
    });
    respond(s, { kind: "optional", accept: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.state.pendingDecision?.kind).toBe("selectCards");
    expect(payload(s)).toMatchObject({
      candidateInstanceIds: expect.arrayContaining([
        s.inst("paildramon").instanceId,
        s.inst("otherPaildramon").instanceId,
      ]),
      min: 1,
      max: 1,
      timing: "WhenDigivolving",
    });
    expect(payload(s).effectText).toContain("When DNA digivolving");
    expect(payload(s).candidateInstanceIds).not.toContain(s.inst("wrongName").instanceId);
    expect(payload(s).visibleInstanceIds).toEqual([
      s.inst("paildramon").instanceId,
      s.inst("otherPaildramon").instanceId,
      s.inst("wrongName").instanceId,
    ]);

    respond(s, { kind: "selectCards", instanceIds: [s.inst("paildramon").instanceId] });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-010"));
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("paildramon").instanceId)).toBe(
      false,
    );
    assertNoLoudGap(s);
  });

  it("may decline the DNA-only play without moving a card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-058", as: "purple" },
            { card: "EX3-008", as: "red" },
          ],
          hand: [{ card: "EX3-061", as: "dinobeemon" }],
          trash: [{ card: "EX3-010", as: "paildramon" }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("purple").permanentId, s.perm("red").permanentId],
        instanceId: s.inst("dinobeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.pendingDecision?.kind).toBe("optional");
    respond(s, { kind: "optional", accept: false });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("paildramon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("does not offer or play Paildramon after an ordinary 4-cost digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-058", as: "base" }],
        hand: [{ card: "EX3-061", as: "dinobeemon" }],
        trash: [{ card: "EX3-010", as: "paildramon" }],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dinobeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-061" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("paildramon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("On Deletion offers Wormmon from both the deleted stack and pre-existing trash, but no other Larva", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX3-061",
              as: "dinobeemon",
              under: [{ card: "EX3-055", as: "stackWormmon" }],
            },
          ],
          trash: [
            { card: "BT3-047", as: "trashWormmon" },
            { card: "BT11-075", as: "otherLarva" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();

    const deletedDinobeemonInstanceId = s.perm("dinobeemon").topCard.instanceId;
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("dinobeemon").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.pendingDecision?.kind).toBe("optional");
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-061",
      options: { timing: "OnDeletion" },
    });
    respond(s, { kind: "optional", accept: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.state.pendingDecision?.kind).toBe("selectCards");

    const candidates = payload(s).candidateInstanceIds!;
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-061");
    expect(payload(s)).toMatchObject({ min: 1, max: 1, timing: "OnDeletion" });
    expect(candidates).toEqual(
      expect.arrayContaining([s.inst("stackWormmon").instanceId, s.inst("trashWormmon").instanceId]),
    );
    expect(candidates).not.toContain(s.inst("otherLarva").instanceId);
    expect(payload(s).visibleInstanceIds).toEqual(
      expect.arrayContaining([
        s.inst("stackWormmon").instanceId,
        s.inst("trashWormmon").instanceId,
        s.inst("otherLarva").instanceId,
        deletedDinobeemonInstanceId,
      ]),
    );
    respond(s, { kind: "selectCards", instanceIds: [s.inst("stackWormmon").instanceId] });
    await deletion;
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("stackWormmon").instanceId),
    );

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("trashWormmon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("an Imperialdramon carrying Dinobeemon exposes and can use the unsuspended target in the UI state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-063", under: ["EX3-061"], as: "imperialdramon" }],
      },
      1: {
        battleArea: [{ card: "BT1-028", as: "unsuspended" }],
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    const attacker = s.perm("imperialdramon");
    const target = s.perm("unsuspended");
    await settle(() => attacker.attackablePermanentIds.includes(target.permanentId));
    expect(observe(s.engine).canAttackUnsuspended(attacker)).toBe(true);
    expect(observe(s.engine).hasKeyword(attacker, "Vortex")).toBe(false);
    expect(attacker.attackablePermanentIds).toContain(target.permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: target.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === target.permanentId));
    assertNoLoudGap(s);
  });

  it("the inherited permission follows the live Imperialdramon name and only applies on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-057", under: ["EX3-061"], as: "notImperialdramon" },
          { card: "EX3-063", under: ["EX3-061"], as: "imperialdramon" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-028", as: "unsuspended" }],
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    const targetId = s.perm("unsuspended").permanentId;
    expect(s.perm("notImperialdramon").attackablePermanentIds).not.toContain(targetId);
    expect(s.perm("imperialdramon").attackablePermanentIds).toContain(targetId);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("imperialdramon"))).toBe(false);
    expect(s.perm("imperialdramon").attackablePermanentIds).not.toContain(targetId);
    assertNoLoudGap(s);
  });

  it("Mutant-family control: a different Dinobeemon does not inherit EX3-061's permission", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-055", as: "mutantPeer" }] },
      1: { battleArea: [{ card: "BT1-028", as: "unsuspended" }] },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(getCardDefinition("BT3-055")!.types).toContain("Mutant");
    expect(observe(s.engine).canAttackUnsuspended(s.perm("mutantPeer"))).toBe(false);
    expect(s.perm("mutantPeer").attackablePermanentIds).not.toContain(s.perm("unsuspended").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mutantPeer").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    assertNoLoudGap(s);
  });
});
