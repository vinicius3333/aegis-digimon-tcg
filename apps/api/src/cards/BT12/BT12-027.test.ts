import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT12-027.js";
import "../BT9/BT9-109.js";

describe("BT12-027 Mermaimon", () => {
  it("on play places another blue Digimon as its bottom source, rule-trashes that Digimon's sources, and gains 2 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-025", as: "cost", under: ["BT9-109", "BT12-019"] }],
          hand: [{ card: "BT12-027", as: "mermaimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const movedTop = s.perm("cost").topCard.instanceId;
    const discardedSources = s.perm("cost").stack.map(({ instanceId }) => instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mermaimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    const mermaimon = s.state.players[0]!.battleArea[0]!;
    expect(mermaimon.topCard.cardId).toBe("BT12-027");
    expect(mermaimon.stack[0]!.instanceId).toBe(movedTop);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(discardedSources),
    );
    expect(s.state.memory).toBe(5);
  });

  it("performs the same placement and memory gain when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-027", as: "mermaimon" },
            { card: "BT12-025", as: "cost", under: ["BT12-019"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const movedTop = s.perm("cost").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("mermaimon"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.perm("mermaimon").stack[0]!.instanceId).toBe(movedTop);
    expect(s.state.memory).toBe(2);
  });

  it("can decline and cannot use a non-blue Digimon as the placement cost", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-027", as: "mermaimon" },
            { card: "BT12-025", as: "cost" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.WhenDigivolving, declined.perm("mermaimon"));
    expect(declined.state.players[0]!.battleArea).toHaveLength(2);
    expect(declined.state.memory).toBe(0);

    const wrongColor = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-027", as: "mermaimon" },
          { card: "BT12-048", as: "cost" },
        ],
      },
    });
    await advance(wrongColor.engine).fire(EffectTiming.WhenDigivolving, wrongColor.perm("mermaimon"));
    expect(wrongColor.state.players[0]!.battleArea).toHaveLength(2);
    expect(wrongColor.state.memory).toBe(0);
  });
});

describe("BT12-027 Mermaimon — KB Q&A rulings", () => {
  const playMermaimonPlacing = async (costSources: { card: string; as: string }[]) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-025", as: "cost", under: costSources }],
          hand: [{ card: "BT12-027", as: "mermaimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const movedTop = s.perm("cost").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mermaimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.memory === 5);
    return { s, movedTop };
  };
  const trashIds = (s: EngineSetup) => s.state.players[0]!.trash.map(({ instanceId }) => instanceId);

  it("trashes the placed Digimon's own digivolution cards (Q2166)", async () => {
    const { s, movedTop } = await playMermaimonPlacing([
      { card: "BT12-019", as: "lowerSource" },
      { card: "BT12-020", as: "upperSource" },
    ]);

    const mermaimon = s.state.players[0]!.battleArea[0]!;
    expect(mermaimon.topCard.cardId).toBe("BT12-027");
    expect(mermaimon.stack.map(({ instanceId }) => instanceId)).toEqual([movedTop]);
    expect(trashIds(s)).toEqual(
      expect.arrayContaining([s.inst("lowerSource").instanceId, s.inst("upperSource").instanceId]),
    );
  });

  it("still trashes [X Antibody] from the placed Digimon's sources, because the rules trash it (Q2167)", async () => {
    const effectTrash = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-025", as: "host", under: [{ card: "BT9-109", as: "protectedAntibody" }, "BT12-019"] },
        ],
      },
    });
    const protectedAntibodyId = effectTrash.inst("protectedAntibody").instanceId;
    await advance(effectTrash.engine).verb.trashDigivolutionCards(
      effectTrash.perm("host").permanentId,
      [protectedAntibodyId],
      0,
    );
    expect(effectTrash.perm("host").stack.map(({ instanceId }) => instanceId)).toContain(protectedAntibodyId);

    const { s, movedTop } = await playMermaimonPlacing([
      { card: "BT9-109", as: "xAntibody" },
      { card: "BT12-019", as: "otherSource" },
    ]);

    const mermaimon = s.state.players[0]!.battleArea[0]!;
    expect(mermaimon.stack.map(({ instanceId }) => instanceId)).toEqual([movedTop]);
    expect(trashIds(s)).toEqual(
      expect.arrayContaining([s.inst("xAntibody").instanceId, s.inst("otherSource").instanceId]),
    );
  });
});
