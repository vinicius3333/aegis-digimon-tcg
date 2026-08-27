import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-045.js";
import "./index.js";

describe("BT17-045 Argomon", () => {
  it("may play Rhythm from hand when no Rhythm is in play after digivolving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Rhythm"], match: "name" }] }, count: 1 },
      condition: {
        kind: "youHaveNone",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Rhythm"], match: "name" }] },
      },
    });
  });

  it("gains one memory on deletion as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("uses the Argomon evolution route and plays Rhythm for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-042", as: "base" }],
          hand: [
            { card: "BT17-045", as: "argomon" },
            { card: "BT17-089", as: "rhythm" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const rhythmId = s.inst("rhythm").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("argomon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === rhythmId));

    expect(s.state.memory).toBe(0);
  });

  it("gains inherited memory when its host is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-048", under: ["BT17-045"], as: "host" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-045")).toBe(true);
  });
});
