import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-177.js";

describe("P-177 Gigimon", () => {
  it("encodes its optional inherited On Deletion return of a named Growlmon or Gallantmon", () => {
    expect(runtimeCompiledCard("P-177")!.effects.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Return",
          optional: true,
          to: "hand",
          target: {
            count: 1,
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Growlmon", "Gallantmon"], match: "name" }],
            },
          },
        },
      ],
    });
  });

  it("returns a named Growlmon from trash when its inherited host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["P-177"] }],
          trash: [{ card: "BT12-010", as: "growlmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
  });
});
