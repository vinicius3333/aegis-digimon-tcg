import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-040.js";
import "./index.js";

describe("BT22-040 Cendrillmon", () => {
  it("keeps Overclock, optional Familiar Token plays, and the once-per-turn deleted-Digimon reactivation", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Overclock", qualifier: "Puppet", raw: "＜Overclock ([Puppet] Trait)＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        optional: true,
        actions: [{ kind: "PlayToken", tokens: ["Familiar Token"], count: 1, payCost: false }],
      });
    }
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
          actions: [{ kind: "ReactivateEffect", fromTrigger: "WhenDigivolving", count: 1 }],
        },
      ],
    });
  });

  it("reactivates its When Digivolving effect after another Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-040", as: "cendrillmon" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const familiarCount = () =>
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "TOKEN-Familiar-Token").length;
    await s.ready();
    expect(familiarCount()).toBe(0);
    const primitives = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> } }
    ).primitives;

    await primitives.deletePermanent([s.perm("first").permanentId], "byEffect");
    await settle(() => familiarCount() === 1);
    await primitives.deletePermanent([s.perm("second").permanentId], "byEffect");
    await settle();

    expect(familiarCount()).toBe(1);
  });
});
