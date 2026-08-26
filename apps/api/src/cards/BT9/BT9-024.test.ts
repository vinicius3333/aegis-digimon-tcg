import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-024.js";

describe("BT9-024 Garurumon (X Antibody)", () => {
  it("matches the full catalog and IR contract, including the zero-cost Garurumon route", () => {
    expect(getCardDefinition("BT9-024")).toMatchObject({
      cardId: "BT9-024",
      nameEn: "Garurumon (X Antibody)",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beast", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Garurumon"], cost: 0, isAlternate: true }],
      effects: [
        {
          trigger: "AllTurns",
          isInherited: true,
          actions: [
            {
              kind: "Replacement",
              event: "wouldBeDeleted",
              mode: "prevent",
              leaveCause: "byBattle",
              optional: true,
              cost: { kind: "trash", target: { filter: { sameLevelPair: true }, count: 2 } },
            },
          ],
        },
      ],
    });
  });

  it("may trash 2 same-level sources to prevent battle deletion of its Garurumon host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-031", as: "host", under: ["BT9-024", "BT9-025"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("does not prevent deletion by an effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-031", as: "host", under: ["BT9-024", "BT9-025"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.decisions).toHaveLength(0);
  });
});
