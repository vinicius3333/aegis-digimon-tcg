import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-047.js";
import { compiled } from "./BT10-018.js";

describe("BT10-018 Gaossmon", () => {
  it("encodes one optional suspended no-cost play with exact level and trait filters", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          expect.objectContaining({
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            suspended: true,
            optional: true,
            target: expect.objectContaining({
              filter: expect.objectContaining({
                levels: [4],
                nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }],
              }),
            }),
          }),
        ],
      }),
    ]);
  });

  it("plays a Blue Flare level 4 from hand suspended on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-018", as: "gaossmon" }],
          hand: [{ card: "BT10-019", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("gaossmon").permanentId]);
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("greymon").instanceId,
    );
    expect(played?.isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("digivolves from a blue level 2 for the printed cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-002", as: "base" }],
        hand: [{ card: "BT10-018", as: "gaossmon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gaossmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gaossmon").instanceId);

    expect(s.state.memory).toBe(0);
  });

  it("respects effect-play floodgates without blocking a normal play (Q4661/Q4665)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-018", as: "gaossmon" }],
          hand: [{ card: "BT10-019", as: "greymon" }],
        },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("gaossmon").permanentId]);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greymon").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("greymon").instanceId),
    ).toBe(false);

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
  });

  it("may decline the play and never offers cards outside the exact level and trait filter", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-018", as: "gaossmon" }],
          hand: [
            { card: "BT10-019", as: "eligible" },
            { card: "BT10-018", as: "wrongLevel" },
            { card: "BT10-030", as: "wrongTrait" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("gaossmon").permanentId]);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("eligible").instanceId,
      s.inst("wrongLevel").instanceId,
      s.inst("wrongTrait").instanceId,
    ]);
  });
});
