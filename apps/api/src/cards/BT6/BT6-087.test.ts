import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT14/BT14-078.js";
import "./BT6-018.js";
import "./BT6-087.js";

describe("BT6-087 Tai Kamiya", () => {
  it("gains 1 memory and draws 1 when Agumon moves from breeding", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-087", as: "tai" }],
        breeding: { card: "BT1-010", as: "agumon" },
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("agumon").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.memory === 1 && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );

    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-087", as: "security", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-087")).toBe(true);
  });

  it("digivolves Agumon into Bond of Bravery and trashes 2 security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT6-087", as: "tai" },
          ],
          hand: [{ card: "BT6-018", as: "bond" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("agumon").topCard!.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard!.instanceId,
        effectKey: "BT6-087/main-digivolve-bond-of-bravery",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("agumon").topCard?.cardId === "BT6-018" &&
        s.state.players[0]!.security.length === 1 &&
        observe(s.engine).subscriptions("endOfTurn").length > 0,
    );

    expect(s.perm("agumon").topCard?.cardId).toBe("BT6-018");
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(2);

    const bondInstanceId = s.perm("agumon").topCard.instanceId;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId)).toBe(true);
  });

  it("keeps the red requirement while ignoring level", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-033", as: "yellowAgumon" },
          { card: "BT6-087", as: "tai" },
        ],
        hand: [{ card: "BT6-018", as: "bond" }],
        security: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "BT6-087/main-digivolve-bond-of-bravery",
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("requires exact Agumon and does not activate for Agumon Expert", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-011", as: "agumonExpert" },
          { card: "BT6-087", as: "tai" },
        ],
        hand: [{ card: "BT6-018", as: "bond" }],
        security: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "BT6-087/main-digivolve-bond-of-bravery",
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("Q1472 trashes the only security and keeps the Bond at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT6-087", as: "tai" },
          ],
          hand: [{ card: "BT6-018", as: "bond" }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "BT6-087/main-digivolve-bond-of-bravery",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT6-018" && s.state.players[0]!.security.length === 0);

    expect(observe(s.engine).subscriptions("endOfTurn")).toHaveLength(0);
    await advance(s.engine).fireSubTrigger("endOfTurn");
    expect(s.perm("agumon").topCard.cardId).toBe("BT6-018");
  });
});

const TAI_MAIN = "BT6-087/main-digivolve-bond-of-bravery";

function activateTai(s: EngineSetup, taiAlias: string) {
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm(taiAlias).topCard.instanceId,
    effectKey: TAI_MAIN,
  });
}

function battleAreaInstanceIds(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard.instanceId);
}

describe("BT6-087 Tai Kamiya — KB Q&A rulings", () => {
  it("cannot digivolve a Digimon that only has [Agumon] in its name, such as Agumon Expert or ToyAgumon (Q1473)", async () => {
    const onlyNameVariants = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-011", as: "agumonExpert" },
            { card: "BT7-007", as: "toyAgumon" },
            { card: "BT6-087", as: "tai" },
          ],
          hand: [{ card: "BT6-018", as: "bond" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true },
    );
    onlyNameVariants.state.memory = 5;
    await onlyNameVariants.ready();

    expect(activateTai(onlyNameVariants, "tai")).toEqual({ ok: false, reason: "illegal-target" });
    expect(onlyNameVariants.perm("agumonExpert").topCard.cardId).toBe("BT1-011");
    expect(onlyNameVariants.perm("toyAgumon").topCard.cardId).toBe("BT7-007");
    expect(onlyNameVariants.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT6-018"]);

    const preferred: string[] = [];
    const withExactAgumon = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-007", as: "toyAgumon" },
            { card: "BT1-010", as: "agumon" },
            { card: "BT6-087", as: "tai" },
          ],
          hand: [{ card: "BT6-018", as: "bond" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(withExactAgumon.perm("toyAgumon").topCard.instanceId);
    withExactAgumon.state.memory = 5;
    await withExactAgumon.ready();

    expect(activateTai(withExactAgumon, "tai")).toEqual({ ok: true });
    await settle(() => withExactAgumon.perm("agumon").topCard.cardId === "BT6-018");

    expect(withExactAgumon.perm("agumon").topCard.cardId).toBe("BT6-018");
    expect(withExactAgumon.perm("toyAgumon").topCard.cardId).toBe("BT7-007");
  });

  it("still deletes the Bond at end of turn when security had cards on activation but is emptied later that turn (Q1474)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT6-087", as: "tai" },
          ],
          hand: [{ card: "BT6-018", as: "bond" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(activateTai(s, "tai")).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("agumon").topCard.cardId === "BT6-018" &&
        s.state.players[0]!.security.length === 1 &&
        observe(s.engine).subscriptions("endOfTurn").length > 0,
    );
    const bondInstanceId = s.perm("agumon").topCard.instanceId;

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.state.players[0]!.security).toHaveLength(0);

    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId));

    expect(battleAreaInstanceIds(s, 0)).not.toContain(bondInstanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId)).toBe(true);
  });

  it("deletes only the Bond digivolved while security had cards and keeps the one digivolved with empty security (Q1475)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "firstAgumon" },
            { card: "BT1-010", as: "secondAgumon" },
            { card: "BT6-087", as: "firstTai" },
            { card: "BT6-087", as: "secondTai" },
          ],
          hand: [
            { card: "BT6-018", as: "firstBond" },
            { card: "BT6-018", as: "secondBond" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 8;
    await s.ready();

    preferred.push(s.perm("firstAgumon").topCard.instanceId, s.inst("firstBond").instanceId);
    expect(activateTai(s, "firstTai")).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("firstAgumon").topCard.cardId === "BT6-018" &&
        s.state.players[0]!.security.length === 1 &&
        observe(s.engine).subscriptions("endOfTurn").length === 1,
    );
    const firstBondInstanceId = s.perm("firstAgumon").topCard.instanceId;

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.state.players[0]!.security).toHaveLength(0);

    preferred.splice(0, preferred.length, s.perm("secondAgumon").topCard.instanceId);
    expect(activateTai(s, "secondTai")).toEqual({ ok: true });
    await settle(() => s.perm("secondAgumon").topCard.cardId === "BT6-018");
    const secondBondInstanceId = s.perm("secondAgumon").topCard.instanceId;
    expect(observe(s.engine).subscriptions("endOfTurn")).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === firstBondInstanceId));

    expect(battleAreaInstanceIds(s, 0)).not.toContain(firstBondInstanceId);
    expect(battleAreaInstanceIds(s, 0)).toContain(secondBondInstanceId);
  });

  it("deletes the digivolved Bond at the end of the same turn it digivolved (Q5524)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT6-087", as: "tai" },
          ],
          hand: [{ card: "BT6-018", as: "bond" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: Array(12).fill("BT1-001"),
        },
        1: { security: ["BT1-001"], deck: Array(12).fill("BT1-001") },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    expect(activateTai(s, "tai")).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT6-018" && s.state.players[0]!.security.length === 1);
    const bondInstanceId = s.perm("agumon").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.turnSeat).toBe(1);
    expect(battleAreaInstanceIds(s, 0)).not.toContain(bondInstanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("lets the turn player order the Bond deletion against another end-of-turn trigger (Q5525)", async () => {
    async function endTurnPreferring(firstCardId: string): Promise<{ offeredCardIds: string[]; firstGone: string }> {
      let firstGone = "";
      let bondInstanceId = "";
      let helloogarmonInstanceId = "";
      let setup: EngineSetup | undefined;
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-010", as: "agumon" },
              { card: "BT14-078", as: "helloogarmon" },
              { card: "BT6-087", as: "tai" },
            ],
            hand: [{ card: "BT6-018", as: "bond" }],
            security: ["BT1-001", "BT1-002", "BT1-003"],
            deck: Array(12).fill("BT1-001"),
          },
          1: { security: ["BT1-001"], deck: Array(12).fill("BT1-001") },
        },
        {
          autoSelectCards: true,
          autoAcceptOptional: true,
          preferTriggerKeys: [firstCardId],
          onEvent() {
            if (setup === undefined || bondInstanceId === "" || firstGone !== "") return;
            const inPlay = battleAreaInstanceIds(setup, 0);
            const bondGone = !inPlay.includes(bondInstanceId);
            const helloogarmonGone = !inPlay.includes(helloogarmonInstanceId);
            if (bondGone !== helloogarmonGone) firstGone = bondGone ? "BT6-018" : "BT14-078";
          },
        },
      );
      setup = s;
      helloogarmonInstanceId = s.perm("helloogarmon").topCard.instanceId;
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 5;

      expect(activateTai(s, "tai")).toEqual({ ok: true });
      await settle(() => s.perm("agumon").topCard.cardId === "BT6-018" && s.state.players[0]!.security.length === 1);
      bondInstanceId = s.perm("agumon").topCard.instanceId;

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);

      expect(battleAreaInstanceIds(s, 0)).not.toContain(bondInstanceId);
      expect(battleAreaInstanceIds(s, 0)).not.toContain(helloogarmonInstanceId);
      const orderDecision = s.decisions.find(
        (decision) => decision.seat === 0 && decision.req.kind === "orderTriggers",
      );
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
      return { offeredCardIds: orderDecision?.req.options?.triggerCardIds ?? [], firstGone };
    }

    const deletionFirst = await endTurnPreferring("BT6-087");
    expect(deletionFirst.offeredCardIds).toEqual(expect.arrayContaining(["BT6-087", "BT14-078"]));
    expect(deletionFirst.firstGone).toBe("BT6-018");

    const helloogarmonFirst = await endTurnPreferring("BT14-078");
    expect(helloogarmonFirst.offeredCardIds).toEqual(expect.arrayContaining(["BT6-087", "BT14-078"]));
    expect(helloogarmonFirst.firstGone).toBe("BT14-078");
  });
});
