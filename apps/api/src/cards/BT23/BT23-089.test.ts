import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-089.js";

describe("BT23-089 Takumi Aiba", () => {
  it("installs an executable leave-prevention replacement with a same-level pair cost", () => {
    const replacement = compiled.effects
      .find((entry) => entry.trigger === "AllTurns")
      ?.actions?.find((action) => action.kind === "Replacement") as any;

    expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", optional: true });
    expect(replacement.cost).toMatchObject({
      kind: "compound",
      costs: [
        { kind: "suspend" },
        {
          kind: "trash",
          target: {
            count: 2,
            filter: {
              zone: "digivolutionCards",
              sameHost: true,
              sameLevelPair: true,
            },
          },
        },
      ],
    });
  });

  it("can pay the replacement and prevent a CS Digimon from leaving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-089", as: "takumi" },
            { card: "BT23-006", as: "host", under: ["BT23-006", "BT23-006"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(s.perm("host").permanentId);
    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
