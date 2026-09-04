import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-039.js";

describe("EX6-039 Kurisarimon", () => {
  it("reduces its play cost by 3 by deleting an Unidentified Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 3,
          cost: {
            kind: "deleteOwn",
            target: { filter: { nameOrTrait: [{ match: "trait", tokens: ["Unidentified"] }] } },
          },
        },
      ],
    }));
  it("deletes a low-cost opposing Digimon on play/digivolving and inherits Diaboromon token play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { playCostLte: 3 } },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "PlayToken", tokens: ["Diaboromon"], optional: true }],
    });
  });

  it("publicly deletes an Unidentified Digimon to reduce play cost and deletes an opposing low-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-053", as: "unidentified" }],
          hand: [{ card: "EX6-039", as: "kurisarimon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kurisarimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX6-039"));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("unidentified").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
  });

  it("publicly plays the inherited Diaboromon token after an Unidentified host is deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT17-053", as: "host", under: ["EX6-039"] }] } },
      { autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "TOKEN-Diaboromon"),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "TOKEN-Diaboromon")).toBe(
      true,
    );
  });

  it("does not reduce an unrelated hand play and leaves a play-cost-4 opponent untouched", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-039", as: "kurisarimon" }] },
        1: { battleArea: [{ card: "BT1-053", as: "highCost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kurisarimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("kurisarimon").instanceId),
    );
    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
