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
          hand: [{ card: "BT15-097", as: "option" }, { card: "BT15-055", as: "cost" }],
        },
        1: {
          battleArea: [{ card: "BT15-055", as: "digimon" }, { card: "BT15-084", as: "tamer" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("digimon").permanentId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("digimon").permanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("tamer").permanentId)).toBe(true);
  });
});
