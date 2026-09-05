import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-046.js";

describe("EX5-046 Targetmon", () => {
  it("has Blocker and is also treated as Etemon and Sukamon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Blocker" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Etemon", "Sukamon"],
    });
  });
  it("can return itself from trash by trashing an Etemon/Sukamon card and has a deletion prevention replacement", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "AddToHandSelf",
      cost: {
        kind: "trash",
        target: {
          filter: { controller: "mine", zone: "hand", nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }] },
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBeDeleted",
      actions: [
        {
          kind: "Prevent",
          optional: false,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }],
              },
            },
          },
        },
      ],
    });
  });

  it("returns itself to hand after public deletion while trashing a Sukamon-name hand card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-046", as: "source" }], hand: [{ card: "BT11-040", as: "cost" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === sourceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });

  it("uses the inherited replacement to delete another Sukamon-name Digimon instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-021", under: ["EX5-046"], as: "host" },
            { card: "BT11-040", as: "sukamon" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sukamonId = s.perm("sukamon").permanentId;
    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === sukamonId)).toBe(false);
  });
});
