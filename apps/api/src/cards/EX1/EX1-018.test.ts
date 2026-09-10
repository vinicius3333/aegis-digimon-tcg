import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-018.js";

describe("EX1-018 Zudomon", () => {
  it("trashes the bottom digivolution card when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-014", as: "base" }], hand: [{ card: "EX1-018", as: "evo" }] },
        1: {
          battleArea: [
            {
              card: "BT1-032",
              as: "target",
              under: [
                { card: "BT1-029", as: "bottom" },
                { card: "BT1-030", as: "topSource" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const bottomId = s.inst("bottom").instanceId;
    const topSourceId = s.inst("topSource").instanceId;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === bottomId));
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").stack[0]!.instanceId).toBe(topSourceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === topSourceId)).toBe(false);
  });

  it("can attack an unsuspended Digimon only when it has no digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-018", as: "zudomon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "eligible" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zudomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("eligible").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("rejects an unsuspended opposing Digimon with a digivolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-018", as: "zudomon" }] },
      1: { battleArea: [{ card: "BT1-032", as: "stacked", under: ["BT1-029"] }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zudomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("stacked").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("leaves a stackless opposing target unchanged when no source can be trashed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-014", as: "base" }], hand: [{ card: "EX1-018", as: "evo" }] },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-018");
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("trashes only an opposing battle-area source, not its controller's or breeding Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-014", as: "base" },
            { card: "BT1-032", as: "ownTarget", under: [{ card: "BT1-029", as: "ownBottom" }] },
          ],
          hand: [{ card: "EX1-018", as: "evo" }],
        },
        1: {
          battleArea: [
            {
              card: "BT1-032",
              as: "battleTarget",
              under: [
                { card: "BT1-029", as: "battleBottom" },
                { card: "BT1-030", as: "battleTop" },
              ],
            },
          ],
          breeding: {
            card: "BT1-032",
            as: "breedingTarget",
            under: [{ card: "BT1-029", as: "breedingBottom" }],
          },
        },
      },
      { autoSelectCards: true },
    );
    const battleBottomId = s.inst("battleBottom").instanceId;
    const ownSourceId = s.inst("ownBottom").instanceId;
    const breedingSourceId = s.inst("breedingBottom").instanceId;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === battleBottomId));

    expect(s.perm("battleTarget").stack.map(({ cardId }) => cardId)).toEqual(["BT1-030"]);
    expect(s.perm("ownTarget").stack.map(({ cardId }) => cardId)).toEqual(["BT1-029"]);
    expect(s.perm("breedingTarget").stack.map(({ cardId }) => cardId)).toEqual(["BT1-029"]);
    expect(s.state.players[1]!.trash.filter((card) => card.instanceId === battleBottomId)).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === ownSourceId)).toBe(false);
    expect(s.state.players[1]!.trash.filter((card) => card.instanceId === breedingSourceId)).toHaveLength(0);
  });

  it("digivolves from a blue level-4 source for 3 memory and keeps the source below Zudomon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-014", as: "source" }],
        hand: [{ card: "EX1-018", as: "evo" }],
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
    await settle(() => s.perm("source").topCard.cardId === "EX1-018");

    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX1-014"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("rejects evolution from a non-blue level-4 source without changing the stack or memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "invalidSource" }],
        hand: [{ card: "EX1-018", as: "evo" }],
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

    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-014");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-018"]);
  });

  it("does not use the permission against its controller's Digimon or an opponent's breeding Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-018", as: "zudomon" },
          { card: "BT1-009", as: "ownTarget" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "battleTarget" }],
        breeding: { card: "BT1-009", as: "breedingTarget" },
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zudomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ownTarget").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zudomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("breedingTarget").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zudomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("removes the unsuspended-target permission outside your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-018", as: "zudomon" }], hand: ["BT1-009"], deck: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "eligible" }], hand: ["BT1-009"], deck: ["BT1-009"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("zudomon"))).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("zudomon"))).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
