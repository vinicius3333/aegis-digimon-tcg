import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-157.js";

describe("P-157 Monimon", () => {
  it("encodes inherited On Deletion Draw 1 conditional on a black Tamer", () => {
    const inherited = runtimeCompiledCard("P-157")!.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Black"] } },
        },
      ],
    });
  });

  it("draws when the inherited host is deleted while a black Tamer is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["P-157"] },
          { card: "BT10-092", as: "tamer" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
