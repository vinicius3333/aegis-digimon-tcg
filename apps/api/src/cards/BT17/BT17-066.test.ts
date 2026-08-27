import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-066.js";
import "./index.js";

describe("BT17-066 HippoGryphonmon", () => {
  it("has Blocker and plays one level-3 purple or yellow Digimon from hand", () => {
    expect(
      compiled.effects.filter((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Blocker")),
    ).toHaveLength(2);
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving" && !entry.isInherited);
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow", "Purple"], levels: [3] },
        count: 1,
      },
    });
  });

  it("uses the Darcmon route and plays a yellow level 3 from hand without cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-063", as: "darcmon" }],
          hand: [
            { card: "BT17-066", as: "hippoGryphonmon" },
            { card: "BT1-045", as: "played" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const playedId = s.inst("played").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("darcmon").permanentId,
        instanceId: s.inst("hippoGryphonmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(true);
  });

  it("grants inherited Blocker to its evolved host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-071", under: ["BT17-066"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
