import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-016 Amphimon", () => {
  it("prevents one blue Digimon deletion by returning three Jellymon-text cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-016", as: "amphimon" }],
          trash: ["RB1-011", "RB1-011", "RB1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("amphimon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("amphimon").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011")).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("does not prevent deletion when fewer than three Jellymon-text cards are available", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "RB1-016", as: "amphimon" }], trash: ["RB1-011", "RB1-011"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("amphimon").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "RB1-011")).toHaveLength(2);
  });
});
