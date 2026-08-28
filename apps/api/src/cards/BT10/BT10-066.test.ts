import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-066.js";

describe("BT10-066 DarkKnightmon", () => {
  it("matches its catalog and exact DigiXros, On Play, and deletion-window IR", () => {
    const d = getCardDefinition("BT10-066")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Black"], 5, 8, 7000]);
    expect(d.evoCosts).toEqual([{ color: "Black", level: 4, memoryCost: 4 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Ultimate"], ["Virus"], ["Dark Knight", "Twilight"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.map(({ trigger }) => trigger)).toEqual(["OnPlay", "AllTurns"]);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["SkullKnightmon"] }, { names: ["DeadlyAxemon"] }], count: 2 },
    ]);
  });

  it("De-Digivolves an opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT10-066", as: "source" }] },
        1: { battleArea: [{ card: "BT10-020", under: ["BT10-018"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT10-018");
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("deletes the post-De-Digivolve target only after DigiXrosing with both materials", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-066", as: "source" },
            { card: "BT7-058", as: "skullKnightmon" },
            { card: "BT7-059", as: "deadlyAxemon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT10-020", under: [{ card: "BT1-009", as: "rookie" }], as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const sourceId = s.inst("source").instanceId;
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("skullKnightmon").instanceId, s.inst("deadlyAxemon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId) &&
        s.state.pendingDecision === undefined,
    );

    const source = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === sourceId);
    expect(source?.stack).toHaveLength(2);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("rookie").instanceId)).toBe(true);
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });

  it("returns a black level 4 source even when no SkullKnightmon or DeadlyAxemon remains to play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-066", as: "source", under: [{ card: "BT10-062", as: "cost" }] }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const sourceId = s.perm("source").permanentId;
    const costId = s.inst("cost").instanceId;
    preferred.push(costId);
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(1);
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === costId) &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("source").instanceId),
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("returns one source, freely plays the other named source, then completes deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-066",
              as: "source",
              under: [
                { card: "BT7-059", as: "cost" },
                { card: "BT7-058", as: "played" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("played").instanceId, s.inst("cost").instanceId);
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[0]!.hand.length === 1);
    const sourceIds = new Set([s.inst("cost").instanceId, s.inst("played").instanceId]);
    expect(sourceIds).toContain(s.state.players[0]!.battleArea[0]!.topCard.instanceId);
    expect(sourceIds).toContain(s.state.players[0]!.hand[0]!.instanceId);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT10-066");
  });
});
