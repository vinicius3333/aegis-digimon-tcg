import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-097.js";

describe("BT15-097", () => {
  it("must trash a Machine/Cyborg/SoC Digimon to delete the lowest-play-cost opposing Digimon or Tamer", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: { filter: { superlative: "lowestPlayCost" } },
          cost: { kind: "trash" },
        },
      ],
    }));
  it("activates main in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));

  it("naturally trashes the qualifying hand Digimon and deletes a lower-cost Digimon over a higher-cost Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-056", as: "source" }],
          hand: [
            { card: "BT15-097", as: "option" },
            { card: "BT15-055", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT15-055", as: "digimon" },
            { card: "BT15-084", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const digimonId = s.perm("digimon").permanentId;
    const tamerId = s.perm("tamer").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === digimonId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === digimonId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === tamerId)).toBe(true);
  });
});

async function castUltimateSlicer(opponentTamer: string) {
  const preferredTargets: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT15-056", as: "source" }],
        hand: [
          { card: "BT15-097", as: "option" },
          { card: "BT15-055", as: "cost" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT15-055", as: "digimon" },
          { card: opponentTamer, as: "tamer" },
        ],
      },
    },
    { autoSelectCards: true, preferInstanceIds: preferredTargets },
  );
  preferredTargets.push(s.perm("tamer").topCard!.instanceId);
  s.state.memory = 10;
  await s.ready();
  const optionId = s.inst("option").instanceId;
  const costId = s.inst("cost").instanceId;
  const digimonId = s.perm("digimon").permanentId;
  const tamerId = s.perm("tamer").permanentId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.trash.some((card) => card.instanceId === optionId) &&
      s.state.players[1]!.battleArea.length < 2,
  );
  expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(true);
  const remaining = s.state.players[1]!.battleArea.map((p) => p.permanentId);
  return { digimonDeleted: !remaining.includes(digimonId), tamerDeleted: !remaining.includes(tamerId) };
}

describe("BT15-097 Ultimate Slicer — KB Q&A rulings", () => {
  it("deletes the play cost 3 Digimon, not the play cost 4 Tamer, as the lowest play cost among all Digimon and Tamers (Q2594)", async () => {
    expect(await castUltimateSlicer("BT15-084")).toEqual({ digimonDeleted: true, tamerDeleted: false });
    expect(await castUltimateSlicer("BT10-093")).toEqual({ digimonDeleted: false, tamerDeleted: true });
  });
});
