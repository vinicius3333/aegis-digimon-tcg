import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-020.js";

type EngineInternals = {
  primitives: {
    deletePermanent(ids: string[], cause: "byEffect"): Promise<void>;
  };
};

async function deleteVenomMyotismon(s: ReturnType<typeof setupEngine>): Promise<void> {
  await (s.engine as unknown as EngineInternals).primitives.deletePermanent([s.perm("venom").permanentId], "byEffect");
}

describe("P-020 VenomMyotismon", () => {
  it("plays a purple level 4 or lower Digimon from trash without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-020", as: "venom" }],
          trash: [{ card: "BT4-079", as: "revived" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const revivedId = s.inst("revived").instanceId;
    const memoryBefore = s.state.memory;

    await deleteVenomMyotismon(s);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId)).toBe(true);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("does not activate the revived Digimon's On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-020", as: "venom" }],
          trash: [{ card: "P-017", as: "revived" }],
          deck: [
            { card: "BT1-009", as: "deck-a" },
            { card: "BT1-009", as: "deck-b" },
            { card: "BT1-009", as: "deck-c" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const revivedId = s.inst("revived").instanceId;

    await deleteVenomMyotismon(s);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId));
    await settle();

    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(1); // Only the deleted P-020.
  });

  it("cannot revive a level 5 Digimon or a non-purple Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-020", as: "venom" }],
          trash: [
            { card: "BT4-083", as: "purple-level-5" },
            { card: "BT1-009", as: "red-level-3" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const invalidIds = [s.inst("purple-level-5").instanceId, s.inst("red-level-3").instanceId];

    await deleteVenomMyotismon(s);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(invalidIds));
  });
});
