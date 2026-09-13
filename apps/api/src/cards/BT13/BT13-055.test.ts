import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT13-055.js";
import "../BT1/BT1-080.js";
import "../BT1/BT1-083.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { effectsOf } from "../../engine/effects/collect.js";

function handMainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = observe(s.engine).cardSource(s.inst("lamort"));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT13-055/"))!
    .effectKey;
}

describe("BT13-055 Lamortmon", () => {
  it("uses hand digivolution cost 3 and trashes opponent security on inherited battle deletion", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Tamer"],
          nameOrTrait: [{ match: "nameExact", tokens: ["Ruli Tsukiyono"] }],
        },
      },
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          costOverride: 3,
          ignoreRequirements: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "nameExact", tokens: ["Angoramon"] }],
            },
            count: 1,
            fromSelectionRef: "lamortHost",
          },
          into: { controllerDefault: "mine", nameOrTrait: [{ match: "nameExact", tokens: ["Lamortmon"] }] },
          cost: {
            kind: "place",
            position: "bottom",
            host: "target",
            destination: "digivolutionStack",
            bindHostAs: "lamortHost",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "nameExact", tokens: ["Angoramon"] }],
            },
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("retains the inherited trigger seam after a battle deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-080", as: "host", under: ["BT13-055"] }] }, 1: { security: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => s.state.players[1]!.security.length === 0, 3000);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("with Ruli places hand SymbareAngoramon at the bottom and evolves Angoramon for 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-047", as: "angora" },
            { card: "BT10-091", as: "ruli" },
          ],
          hand: [
            { card: "BT13-055", as: "lamort" },
            { card: "BT13-052", as: "symbare" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.inst("lamort").activatableEffectsJson).not.toBe("");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("lamort").instanceId,
        effectKey: handMainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("angora").topCard.cardId === "BT13-055");
    expect(s.perm("angora").stack[0]!.cardId).toBe("BT13-052");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(2);
  });

  it("cannot activate without its own Ruli or without hand SymbareAngoramon", async () => {
    for (const [ownRuli, symbare] of [
      [false, true],
      [true, false],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT13-047", as: "angora" }, ...(ownRuli ? [{ card: "BT10-091", as: "ruli" }] : [])],
          hand: [{ card: "BT13-055", as: "lamort" }, ...(symbare ? ["BT13-052"] : [])],
        },
        1: { battleArea: ownRuli ? [] : [{ card: "BT10-091", as: "opponent-ruli" }] },
      });
      await s.ready();
      expect(s.inst("lamort").activatableEffectsJson).toBe("");
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.inst("lamort").instanceId,
          effectKey: handMainEffectKey(s),
        }).ok,
      ).toBe(false);
      expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-055")).toBe(true);
    }
  });

  it("does not treat SymbareAngoramon as an exact Angoramon host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-052", as: "symbareHost" },
          { card: "BT10-091", as: "ruli" },
        ],
        hand: [{ card: "BT13-055", as: "lamort" }, "BT13-052"],
      },
    });
    await s.ready();
    expect(s.inst("lamort").activatableEffectsJson).toBe("");
  });

  it("inherited security trash is own-turn once per turn and uses the exact top card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-080", as: "host", under: [{ card: "BT13-055", as: "source" }] }],
          security: ["BT1-011"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstTarget", suspended: true },
            { card: "BT1-010", as: "secondTarget" },
          ],
          security: [
            { card: "BT1-009", as: "firstSecurity" },
            { card: "BT1-010", as: "secondSecurity" },
            { card: "BT1-012", as: "thirdSecurity" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstSecurity").instanceId);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { subjectPermanentId: s.perm("host").permanentId });
    expect(s.state.players[1]!.security).toHaveLength(2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondTarget").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondSecurity").instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("trashes security before Piercing checks it after a battle deletion (Q2298)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-083", as: "host", under: ["BT13-055"] }] },
      1: {
        battleArea: [{ card: "BT13-049", as: "target", suspended: true }],
        security: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 3000);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(
      s.state.players[1]!.trash.findIndex(({ instanceId }) => instanceId === s.inst("first").instanceId),
    ).toBeLessThan(s.state.players[1]!.trash.findIndex(({ instanceId }) => instanceId === s.inst("second").instanceId));
  });

  it("normally digivolves from a green level 4 for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-051", as: "base" }], hand: [{ card: "BT13-055", as: "lamort" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lamort").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-055");
    expect(s.state.memory).toBe(1);
  });
});
