import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-063.js";

describe("BT7-063 DarkKnightmon", () => {
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

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkKnightmon").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("darkKnightmon").instanceId)?.stack.length === 2);

    const stackIds = player.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("darkKnightmon").instanceId)!.stack.map((card) => card.instanceId);
    expect(stackIds).toEqual(expect.arrayContaining([s.inst("deadlyAxemon").instanceId]));
    expect(stackIds.filter((id) => id === s.inst("skullKnightmonOne").instanceId || id === s.inst("skullKnightmonTwo").instanceId)).toHaveLength(1);
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
    const darkKnightmon = () => player.battleArea.find((permanent) => permanent.topCard?.instanceId === darkKnightmonId);
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
    const darkKnightmon = () => s.state.players[0]!.battleArea.find((permanent) =>
      permanent.topCard.instanceId === darkKnightmonId
    );

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("darkKnightmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const materials = s.decisions.at(-1)!.req;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: materials.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("skullKnightmon").instanceId, s.inst("deadlyAxemon").instanceId] },
    })).toMatchObject({ ok: false, reason: "decision-pending" });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const stackOrder = [s.inst("deadlyAxemon").instanceId, s.inst("skullKnightmon").instanceId];
    expect(ordering.options?.orderDestination).toBe("stackBottom");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: ordering.decisionId,
      response: { kind: "orderCards", order: stackOrder },
    })).toEqual({ ok: true });
    await settle(() => darkKnightmon()?.stack.length === 2);
    expect(darkKnightmon()?.stack.map((card) => card.instanceId)).toEqual(stackOrder);

    await advance(s.engine).verb.deletePermanent([
      darkKnightmon()!.permanentId,
    ], "byEffect");

    const replayed = s.state.players[0]!.battleArea.filter((permanent) =>
      permanent.topCard.cardId === "BT7-058" || permanent.topCard.cardId === "BT7-059"
    );
    expect(replayed).toHaveLength(2);
    expect(replayed.every((permanent) => permanent.isSuspended)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) =>
      permanent.topCard.cardId === "BT7-063"
    )).toBe(false);
  });

  it("Q1623 plays both named sources after accepting the effect, never only one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "BT7-063",
            under: [{ card: "BT7-058", as: "skull" }, { card: "BT7-059", as: "deadly" }],
            as: "darkKnightmon",
          }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("darkKnightmon").permanentId], "byEffect");

    const playedIds = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
    expect(playedIds).toEqual(expect.arrayContaining([s.inst("skull").instanceId, s.inst("deadly").instanceId]));
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.isSuspended)).toBe(true);
  });
});
