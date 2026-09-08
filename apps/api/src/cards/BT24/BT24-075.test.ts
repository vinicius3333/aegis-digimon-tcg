import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_075 } from "./BT24-075.js";
import "../index.js";

describe("BT24-075 SkullBaluchimon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-075")).toMatchObject({
      cardId: "BT24-075",
      nameEn: "SkullBaluchimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "X Antibody", "Titan", "TS"],
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
    });
  });

  it("requires the hand-trash cost before deleting both level targets", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_075.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "CostGatedBlock",
        cost: { kind: "trash", target: { filter: { zone: "hand" } } },
        optional: true,
        abortOnDecline: true,
      });
      const gated = actions[0];
      if (!gated || gated.kind !== "CostGatedBlock") throw new Error("missing cost-gated entry block");
      expect(gated.actions).toHaveLength(2);
      expect(gated.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { levels: [3] }, count: 1 } });
      expect(gated.actions[1]).toMatchObject({ kind: "Delete", target: { filter: { levels: [4] }, count: 1 } });
    }
    const inherited = BT24_075.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(inherited?.actions?.[0]).toMatchObject({
      while: {
        kind: "anyOf",
        conditions: expect.arrayContaining([{ kind: "selfHasName", names: ["Titamon"] }]),
      },
      effect: { kind: "keyword" },
    });
  });

  it("public play pays 6 and one hand card to delete exactly one level 3 and one level 4", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-075", as: "skullbaluchimon" },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-010", as: "level3Other" },
            { card: "BT1-014", as: "level4" },
            { card: "BT1-014", as: "level4Other" },
            { card: "BT24-072", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const level3Id = s.perm("level3").permanentId;
    const level4Id = s.perm("level4").permanentId;
    const level3OtherId = s.perm("level3Other").permanentId;
    const level4OtherId = s.perm("level4Other").permanentId;
    preferred.push(s.perm("level3").permanentId, s.perm("level4").permanentId);
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullbaluchimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(level3Id);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(level3OtherId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(level4Id);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(level4OtherId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("level5").permanentId,
    );
  });

  it("deletes the level 4 target even when no level 3 is present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-075", as: "skull" },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-014", as: "level4" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it.each([
    ["normal purple level-4 requirement", "BT24-070", undefined],
    ["alternate Demon requirement without matching color", "BT1-069", 0],
    ["alternate TS requirement without matching color", "BT24-010", 0],
  ])("uses the %s for cost 3", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine(
      {
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [
            { card: "BT24-075", as: "skullbaluchimon" },
            { card: "BT1-009", as: "cost" },
          ],
          deck: [{ card: "BT1-015", as: "bonusDraw" }, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const level4Id = s.perm("level4").permanentId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullbaluchimon").instanceId,
        ...(alternateRequirementIndex === undefined ? {} : { alternateRequirementIndex, useAlternateCost: true }),
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("skullbaluchimon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it.each([["only level 3 is present", [{ card: "BT1-009", as: "level3" }]]])(
    "resolves the hand-trash cost when %s",
    async (_label, targets) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT24-075", as: "skull" },
              { card: "BT1-009", as: "cost" },
            ],
          },
          1: { battleArea: targets },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 7;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("skull").instanceId),
      );
      expect(s.state.memory).toBe(1);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    },
  );

  it("does not delete either target when the payable optional cost is refused publicly", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-075", as: "skull" },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const prompt = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("skull").instanceId),
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("publicly plays with no hand-trash card during the owner Main phase without deleting", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-075", as: "skull" }],
          battleArea: [{ card: "BT1-009", as: "attacker" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBeforePlay = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    expect(s.state.memory).toBe(memoryBeforePlay - 6);
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("skull").instanceId),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("rejects a public alternate evolution from a non-Demon, non-TS red level 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "BT24-075", as: "skull" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skull").instanceId,
        alternateRequirementIndex: 0,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("base").topCard.cardId).toBe("BT1-014");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("skull").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "pays one hand card to delete one level 3 and one level 4 on %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-075", as: "skullbaluchimon" }],
            hand: [{ card: "BT1-009", as: "cost" }],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "level3" },
              { card: "BT1-014", as: "level4" },
              { card: "BT24-072", as: "level5" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const level3Id = s.perm("level3").permanentId;
      const level4Id = s.perm("level4").permanentId;
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("skullbaluchimon"));

      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(level3Id);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(level4Id);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
        s.perm("level5").permanentId,
      );
    },
  );

  it("deletes neither target when the hand-trash cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-075", as: "skullbaluchimon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("skullbaluchimon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it.each([
    ["exact Titamon name", "BT6-081"],
    ["Titan trait", "BT25-019"],
  ])("inherited effect grants Security Attack +1 for the %s alternative", async (_label, topCard) => {
    const s = setupEngine({ 0: { battleArea: [{ card: topCard, as: "host", under: ["BT24-075"] }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it.each([
    ["Titamon name", "BT6-081", 2],
    ["Titan trait", "BT25-019", 2],
    ["non-Titan control", "BT3-089", 1],
  ])("uses inherited Security Attack during a public %s attack", async (_label, hostCard, expectedChecks) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: hostCard, as: "host", under: [{ card: "BT24-075", as: "source" }] }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: {
        security: [
          { card: "BT1-012", as: "securityA" },
          { card: "BT1-012", as: "securityB" },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
    });
    const sourceId = s.inst("source").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === expectedChecks);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2 - expectedChecks);
    const trashIds = s.state.players[1]!.trash.map((card) => card.instanceId);
    expect(trashIds).toEqual(
      expectedChecks === 2
        ? [s.inst("securityA").instanceId, s.inst("securityB").instanceId]
        : [s.inst("securityA").instanceId],
    );
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(
      expectedChecks === 2 ? [] : [s.inst("securityB").instanceId],
    );
    const checkedIds = s.events
      .filter((event) => event.kind === "securityChecked")
      .map((event) => (event.kind === "securityChecked" ? event.revealedCardId : undefined));
    expect(checkedIds).toEqual(expect.arrayContaining(expectedChecks === 2 ? ["BT1-012", "BT1-012"] : ["BT1-012"]));
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("host").instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
  });

  it("reapplies inherited Security Attack across real owner and opponent turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-081", as: "host", under: ["BT24-075"] }],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        security: [
          { card: "BT1-012", as: "securityA" },
          { card: "BT1-012", as: "securityB" },
          { card: "BT1-012", as: "securityC" },
          { card: "BT1-012", as: "securityD" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 2 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("securityA").instanceId, s.inst("securityB").instanceId]),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 4 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("securityA").instanceId,
        s.inst("securityB").instanceId,
        s.inst("securityC").instanceId,
        s.inst("securityD").instanceId,
      ]),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});
