import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-058.js";

describe("EX6-058 Creepymon", () => {
  it("has Blocker and deletes the opponent's lowest-DP Digimon, then trashes cards based on its level", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Delete", target: { filter: { superlative: "lowestDP" } } },
      { kind: "TrashTopDeck", controller: "mine", amount: 1, scaling: { per: 1, unit: "lastDeletedLevel" } },
    ]);
  });
  it("places a Seven Great Demon Lords card under a Gate of Deadly Sins when leaving play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      leaveCause: "otherThanBattle",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { zone: "trash" } },
          underFilter: { zone: "breeding", nameOrTrait: [{ match: "name", tokens: ["Gate of Deadly Sins"] }] },
          position: "bottom",
        },
      ],
    }));
  it("publicly deletes the opponent's lowest-DP Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-058", as: "creepy" }], deck: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 1000, as: "low" },
            { card: "BT1-010", dp: 2000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("creepy"));
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === lowId));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === highId)).toBe(true);
  });
});
