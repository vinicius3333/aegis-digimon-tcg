import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT8/BT8-097.js";
import "./BT7-063.js";

describe("BT7-063 DarkKnightmon", () => {
  it("records up-to named material selection for both hand/trash placement and own-stack replay", () => {
    const card = runtimeCompiledCard("BT7-063");
    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [{ kind: "PlaceUnder", target: { requiredNamesExactUpTo: ["SkullKnightmon", "DeadlyAxemon"] } }],
        },
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "Replacement",
              actions: [
                {
                  kind: "PlayWithoutCost",
                  target: { requiredNamesExactUpTo: ["SkullKnightmon", "DeadlyAxemon"] },
                  fromOwnDigivolutionStack: true,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("requires one of each named material when extra SkullKnightmon cards are available", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-063", as: "darkKnightmon" },
            { card: "BT7-058", as: "skullKnightmonOne" },
            { card: "BT7-058", as: "skullKnightmonTwo" },
          ],
          trash: [{ card: "BT7-059", as: "deadlyAxemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkKnightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("darkKnightmon").instanceId)
          ?.stack.length === 2,
    );

    const stackIds = player.battleArea
      .find((permanent) => permanent.topCard.instanceId === s.inst("darkKnightmon").instanceId)!
      .stack.map((card) => card.instanceId);
    expect(stackIds).toEqual(expect.arrayContaining([s.inst("deadlyAxemon").instanceId]));
    expect(
      stackIds.filter(
        (id) => id === s.inst("skullKnightmonOne").instanceId || id === s.inst("skullKnightmonTwo").instanceId,
      ),
    ).toHaveLength(1);
    expect(player.hand.map((card) => card.instanceId)).toContain(s.inst("skullKnightmonTwo").instanceId);
  });

  it("may place a SkullKnightmon and a DeadlyAxemon from hand and trash in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-063", as: "darkKnightmon" },
            { card: "BT7-058", as: "skullKnightmon" },
          ],
          trash: [{ card: "BT7-059", as: "deadlyAxemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const darkKnightmonId = s.inst("darkKnightmon").instanceId;
    const darkKnightmon = () =>
      player.battleArea.find((permanent) => permanent.topCard?.instanceId === darkKnightmonId);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: darkKnightmonId })).toEqual({ ok: true });
    await settle(() => darkKnightmon()?.stack.length === 2);

    expect(darkKnightmon()?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT7-058", "BT7-059"]));
    expect(player.trash).toHaveLength(0);
  });

  it("orders mixed-zone materials, then plays both suspended when DarkKnightmon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-063", as: "darkKnightmon" },
            { card: "BT7-058", as: "skullKnightmon" },
          ],
          trash: [{ card: "BT7-059", as: "deadlyAxemon" }],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: false },
    );
    s.state.memory = 10;
    const darkKnightmonId = s.inst("darkKnightmon").instanceId;
    const darkKnightmon = () =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === darkKnightmonId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkKnightmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const stackOrder = [s.inst("deadlyAxemon").instanceId, s.inst("skullKnightmon").instanceId];
    expect(ordering.options?.orderDestination).toBe("stackBottom");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: stackOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => darkKnightmon()?.stack.length === 2);
    expect(darkKnightmon()?.stack.map((card) => card.instanceId)).toEqual(stackOrder);

    await advance(s.engine).verb.deletePermanent([darkKnightmon()!.permanentId], "byEffect");

    const replayed = s.state.players[0]!.battleArea.filter(
      (permanent) => permanent.topCard.cardId === "BT7-058" || permanent.topCard.cardId === "BT7-059",
    );
    expect(replayed).toHaveLength(2);
    expect(replayed.every((permanent) => permanent.isSuspended)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT7-063")).toBe(false);
  });

  it("Q1623 plays both named sources after accepting the effect, never only one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-063",
              under: [
                { card: "BT7-058", as: "skull" },
                { card: "BT7-059", as: "deadly" },
              ],
              as: "darkKnightmon",
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("darkKnightmon").permanentId], "byEffect");

    const playedIds = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
    expect(playedIds).toEqual(expect.arrayContaining([s.inst("skull").instanceId, s.inst("deadly").instanceId]));
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.isSuspended)).toBe(true);
  });

  it("plays the sole available named source when the other name is absent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-063",
              under: [{ card: "BT7-058", as: "skull" }],
              as: "darkKnightmon",
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("darkKnightmon").permanentId], "byEffect");

    const replayed = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("skull").instanceId,
    );
    expect(replayed?.isSuspended).toBe(true);
  });

  it("may decline the deletion replacement and play neither named source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-063",
              under: [
                { card: "BT7-058", as: "skull" },
                { card: "BT7-059", as: "deadly" },
              ],
              as: "darkKnightmon",
            },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("darkKnightmon").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("skull").instanceId, s.inst("deadly").instanceId]),
    );
  });
});

describe("BT7-063 DarkKnightmon — KB Q&A rulings", () => {
  const playDarkKnightmonWith = async (materials: { hand?: string[]; trash?: string[] }) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-063", as: "darkKnightmon" }, ...(materials.hand ?? [])],
          trash: materials.trash ?? [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    const darkKnightmonId = s.inst("darkKnightmon").instanceId;
    const darkKnightmon = () =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === darkKnightmonId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: darkKnightmonId })).toEqual({ ok: true });
    await settle(() => darkKnightmon() !== undefined && s.state.pendingDecision === undefined);
    return { s, darkKnightmon };
  };

  it("may place only one of the named cards when the other is in neither hand nor trash (Q1621)", async () => {
    const onlySkullKnightmon = await playDarkKnightmonWith({ hand: ["BT7-058", "BT1-009"] });
    expect(onlySkullKnightmon.darkKnightmon()?.stack.map((card) => card.cardId)).toEqual(["BT7-058"]);
    expect(onlySkullKnightmon.s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);

    const onlyDeadlyAxemon = await playDarkKnightmonWith({ trash: ["BT7-059", "BT1-010"] });
    expect(onlyDeadlyAxemon.darkKnightmon()?.stack.map((card) => card.cardId)).toEqual(["BT7-059"]);
    expect(onlyDeadlyAxemon.s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("may place a SkullKnightmon from hand and a DeadlyAxemon from trash together (Q1622)", async () => {
    const { s, darkKnightmon } = await playDarkKnightmonWith({ hand: ["BT7-058", "BT1-009"], trash: ["BT7-059"] });

    expect(darkKnightmon()?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT7-058", "BT7-059"]));
    expect(darkKnightmon()?.stack).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("cannot play SkullKnightmon or DeadlyAxemon from its stack after Crimson Blaze deletes it (Q1775)", async () => {
    const opponentDarkKnightmon = {
      card: "BT7-063",
      as: "darkKnightmon",
      dp: 6_000,
      under: [
        { card: "BT7-058", as: "skull" },
        { card: "BT7-059", as: "deadly" },
      ],
    };
    const s = setupEngine(
      {
        0: { battleArea: ["BT8-007"], hand: [{ card: "BT8-097", as: "crimsonBlaze" }] },
        1: { battleArea: [opponentDarkKnightmon] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimsonBlaze").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097") && s.state.pendingDecision === undefined,
    );
    await drainMicrotasks();

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("skull").instanceId, s.inst("deadly").instanceId]),
    );

    const control = setupEngine(
      { 1: { battleArea: [opponentDarkKnightmon] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(control.engine).verb.deletePermanent([control.perm("darkKnightmon").permanentId], "byEffect");
    expect(control.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      "BT7-058",
      "BT7-059",
    ]);
  });
});
