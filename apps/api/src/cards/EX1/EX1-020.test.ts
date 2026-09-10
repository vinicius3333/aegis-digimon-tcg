import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT14/BT14-083.js";
import "../ST4/ST4-13.js";
import "./EX1-020.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>, alias: string): string {
  const source = (s.engine as unknown as { cardSourceOf: (card: unknown) => unknown }).cardSourceOf(
    s.perm(alias).topCard,
  );
  return effectsOf(EffectTiming.OnDeclaration, source as never).find((effect) =>
    effect.effectKey.startsWith("ST4-13/"),
  )!.effectKey;
}

describe("EX1-020 Plesiomon", () => {
  it("can attack an opponent's unsuspended Digimon without digivolution cards on your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-020", as: "plesiomon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("plesiomon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plesiomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("does not use the permission against own, stacked, or breeding Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-020", as: "plesiomon" },
          { card: "BT1-009", as: "ownTarget" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-032", as: "stackedTarget", under: ["BT1-029"] }],
        breeding: { card: "BT1-009", as: "breedingTarget" },
      },
    });
    await s.ready();
    for (const alias of ["ownTarget", "stackedTarget", "breedingTarget"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("plesiomon").permanentId,
          target: { kind: "permanent", permanentId: s.perm(alias).permanentId },
        }),
      ).toEqual({ ok: false, reason: "illegal-target" });
    }
  });

  it("retains the ordinary attack permission against a suspended opponent Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-020", as: "plesiomon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "suspendedTarget", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plesiomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("suspendedTarget").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("draws 2 when an opponent's digivolution card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-020", as: "plesiomon" }],
          hand: [{ card: "BT14-083", as: "de-digivolver" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-032", under: ["BT1-009"], as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("de-digivolver").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").stack.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("does not draw when your own digivolution card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-020", as: "plesiomon" },
            { card: "ST4-13", as: "own", under: ["ST4-03", "ST4-08"] },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("own").topCard.instanceId,
        effectKey: mainEffectKey(s, "own"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("own").stack.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("reacts only to an opponent's battle-area source, not own or breeding sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-020", as: "plesiomon" },
            { card: "ST4-13", as: "ownHost", under: ["ST4-03", "ST4-08"] },
          ],
          hand: [{ card: "BT14-083", as: "joe" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-032", as: "battleHost", under: ["BT1-029"] }],
          breeding: { card: "BT1-032", as: "breedingHost", under: ["BT1-029"] },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("joe").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("battleHost").stack.length === 0 && s.state.pendingDecision === undefined);
    expect(s.perm("ownHost").stack).toHaveLength(2);
    expect(s.perm("breedingHost").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("may refuse Draw 2 without moving the once-per-turn budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-020", as: "plesiomon" }],
          hand: [{ card: "BT14-083", as: "joe" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-032", as: "opponent", under: ["BT1-029"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("joe").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").stack.length === 0 && s.state.pendingDecision === undefined);
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "EX1-020")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("draws only once when two opponent sources are trashed in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-020", as: "plesiomon" }],
          hand: [
            { card: "BT14-083", as: "first" },
            { card: "BT14-083", as: "second" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-032", as: "firstTarget", under: ["BT1-009"] },
            { card: "BT1-032", as: "secondTarget", under: ["BT1-009"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").stack.length === 0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("secondTarget").stack.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX1-020")).toHaveLength(1);
  });

  it("resets Draw 2 on the next own turn through the public turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-020", as: "plesiomon" }],
          hand: [
            { card: "BT14-083", as: "first" },
            { card: "BT14-083", as: "second" },
            { card: "BT14-083", as: "third" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-032", as: "firstTarget", under: ["BT1-029"] },
            { card: "BT1-032", as: "secondTarget", under: ["BT1-029"] },
            { card: "BT1-032", as: "thirdTarget", under: ["BT1-029"] },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    s.state.memory = 20;
    const play = async (alias: string, targetAlias: string) => {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle(() => s.perm(targetAlias).stack.length === 0 && s.state.pendingDecision === undefined);
    };
    await play("first", "firstTarget");
    const afterFirst = s.state.players[0]!.hand.length;
    await play("second", "secondTarget");
    expect(s.state.players[0]!.hand.length).toBe(afterFirst - 1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    await play("third", "thirdTarget");
    expect(s.state.players[0]!.hand.length).toBe(afterFirst + 1);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX1-020")).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves from a blue level-5 source and keeps the source below Plesiomon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-018", as: "source" }],
        hand: [{ card: "EX1-020", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX1-020");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX1-018"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("rejects evolution from a non-blue level-5 source without changing state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "invalidSource" }],
        hand: [{ card: "EX1-020", as: "evo" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-021");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-020"]);
  });

  it("does not draw during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-020", as: "plesiomon" }], hand: ["BT1-009"], deck: ["BT1-009"] },
        1: {
          battleArea: [{ card: "ST4-13", as: "opponent", under: ["ST4-03", "ST4-08"] }],
          hand: ["BT1-009"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "activateEffect",
        sourceInstanceId: s.perm("opponent").topCard.instanceId,
        effectKey: mainEffectKey(s, "opponent"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").stack.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
