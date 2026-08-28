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
            { card: "BT1-010", as: "wrongColor" },
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
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("may decline the free play and leaves an ineligible hand card untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-063", as: "darcmon" }],
          hand: [
            { card: "BT17-066", as: "hippoGryphonmon" },
            { card: "BT1-010", as: "wrongColor" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("darcmon").permanentId,
        instanceId: s.inst("hippoGryphonmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard.cardId === "BT17-066");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]?.stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("grants inherited Blocker to its evolved host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-071", under: ["BT17-066"], as: "host" }] } });
    await s.ready();

    expect(s.perm("host").topCard.cardId).toBe("BT17-071");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT17-066"]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
