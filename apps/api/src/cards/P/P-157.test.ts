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

  it("draws only when the inherited host is deleted while a black Tamer is present", async () => {
    for (const hasTamer of [true, false]) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "BT10-058", as: "host", under: ["P-157"] },
            ...(hasTamer ? [{ card: "BT10-092", as: "tamer" }] : []),
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      });
      const drawnId = s.inst("drawn").instanceId;
      await s.ready();
      await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
      await settle();
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(hasTamer);
      expect(s.state.players[0]!.deck.some((card) => card.instanceId === drawnId)).toBe(!hasTamer);
    }
  });
});
