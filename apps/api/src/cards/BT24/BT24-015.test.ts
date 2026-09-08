import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-015.js";
import "../index.js";

describe("BT24-015 MetalGreymon", () => {
  it("plays itself from security without battling when the opponent has a level 6+ Digimon", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security")?.actions?.[0];
    expect(security).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["security"],
      payCost: false,
      withoutBattle: true,
    });
    expect(security).toMatchObject({
      condition: { kind: "opponentHas", filter: { levelComparison: { op: "gte", value: 6 } } },
    });
  });

  it("keeps lowest-DP attack-target-change deletion and inherited Blocker deletion", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(allTurns).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [{ target: { filter: { superlative: "lowestDP" } } }],
        },
      ],
    });
    expect(inherited).toMatchObject({ actions: [{ target: { filter: { keywords: ["Blocker"] } } }] });
  });

  it("plays itself from security without battling against a level 6 Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT24-015", as: "metalGreymon", faceUp: true }] },
      1: { battleArea: [{ card: "BT24-017", as: "level6" }] },
    });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("metalGreymon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-015"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("metalGreymon").instanceId,
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("plays from security through a public opposing attack against a level 6 Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT24-015", as: "metalGreymon", faceUp: true }] },
      1: { battleArea: [{ card: "BT24-017", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-015"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("metalGreymon").instanceId,
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not play itself from security against only level 5 or lower Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT24-015", as: "metalGreymon", faceUp: true }] },
      1: { battleArea: [{ card: "BT24-014", as: "level5" }] },
    });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("metalGreymon"));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("metalGreymon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("deletes one lowest-DP opponent Digimon when an attack target changes, once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-015", as: "metalGreymon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest1", dp: 3000 },
            { card: "BT1-009", as: "lowest2", dp: 3000 },
            { card: "BT1-009", as: "higher", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("metalGreymon").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("metalGreymon").permanentId,
    });

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("higher").permanentId,
    );
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 3000)).toHaveLength(1);
  });

  it("deletes only an opposing Digimon with Blocker when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST1-10", as: "host", under: ["BT24-015"] }] },
        1: {
          battleArea: [
            { card: "BT24-012", as: "blocker" },
            { card: "BT24-011", as: "nonBlocker", suspended: true, dp: 20000 },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("nonBlocker").permanentId,
    ]);
  });

  it("deletes an opposing Blocker from a legal level-6 stack through a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST1-10", as: "host", under: ["BT24-015"] }] },
        1: {
          battleArea: [
            { card: "BT24-012", as: "blocker" },
            { card: "BT24-011", as: "nonBlocker", suspended: true, dp: 20000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const blockerPermanentId = s.perm("blocker").permanentId;
    const blockerInstanceId = s.perm("blocker").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("nonBlocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === blockerPermanentId),
    );

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("nonBlocker").permanentId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(blockerInstanceId);
  });

  it("deletes the lowest-DP opposing Digimon when a public Blocker declaration switches the attack target", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-015", as: "blocker" },
          { card: "BT1-009", as: "defender", dp: 5000 },
        ],
      },
      1: {
        battleArea: [
          { card: "ST1-10", as: "attacker" },
          { card: "BT1-009", as: "lowest", dp: 1000 },
          { card: "BT1-009", as: "higher", dp: 3000 },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const lowestPermanentId = s.perm("lowest").permanentId;
    const lowestInstanceId = s.perm("lowest").topCard.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestPermanentId),
    );

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(lowestInstanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("attacker").permanentId,
      s.perm("higher").permanentId,
    ]);
  });

  it("proceeds to security when the defender publicly declines a Blocker declaration", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-015", as: "blocker" }],
        security: [{ card: "BT1-013", as: "checkedSecurity" }],
      },
      1: { battleArea: [{ card: "ST1-10", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const securityId = s.inst("checkedSecurity").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === securityId));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(securityId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("blocker").permanentId,
    ]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("attacker").permanentId,
    ]);
  });

  it("exposes Blocker and digivolves from a level 4 TS Digimon for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-015", as: "metalGreymon" },
          { card: "BT24-011", as: "tsBase" },
        ],
        hand: [{ card: "BT24-015", as: "evolution" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("metalGreymon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("evolution").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.state.memory).toBe(2);
  });

  it("digivolves through the alternate Greymon-name level-4 route for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "greymonBase" }],
        hand: [{ card: "BT24-015", as: "evolution" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymonBase").permanentId,
        instanceId: s.inst("evolution").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greymonBase").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.perm("greymonBase").stack.map((card) => card.cardId)).toEqual(["BT1-015"]);
    expect(s.state.memory).toBe(1);
  });

  it("refuses the alternate evolution route for a non-Greymon, non-TS level-4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "wrongBase" }],
        hand: [{ card: "BT24-015", as: "evolution" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongBase").permanentId,
        instanceId: s.inst("evolution").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("wrongBase").topCard.cardId).toBe("BT1-032");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolution").instanceId);
  });
});
