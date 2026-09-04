import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-052.js";

describe("EX6-052 Bastemon", () => {
  it("has Scapegoat and plays a purple level 3 Digimon from trash on digivolving", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Scapegoat");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { filter: { colors: ["Purple"], levels: [3] } },
    });
  });
  it("inherits once-per-turn purple level 4 or lower revival when an opponent Digimon is deleted", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: { filter: { colors: ["Purple"], levelComparison: { op: "lte", value: 4 } } },
            },
          ],
        },
      ],
    }));
  it("publicly plays a purple level 3 from trash on digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-052", as: "bastemon" }], trash: [{ card: "EX6-046", as: "revived" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bastemon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revived").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revived").instanceId),
    ).toBe(true);
  });
});
