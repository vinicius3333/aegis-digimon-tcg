import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-041.js";

describe("EX6-041 Infermon", () => {
  it("offers free Diaboromon evolution from hand by deleting a Diaboromon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: false,
      ignoreReqs: false,
      optional: true,
      cost: { kind: "deleteOwn", target: { filter: { nameOrTrait: [{ match: "name", tokens: ["Diaboromon"] }] } } },
    }));
  it("inherits once-per-turn de-digivolution when another Diaboromon is played", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }] },
      ],
    }));

  it("publicly deletes a Diaboromon to digivolve Infermon into one from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-059", as: "sacrifice" }],
          hand: [
            { card: "EX6-041", as: "infermon" },
            { card: "BT17-059", as: "diaboromon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("infermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("diaboromon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("diaboromon").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("diaboromon").instanceId)).toBe(false);
  });

  it("does not evolve Infermon when no own Diaboromon is available to pay its deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-041", as: "infermon" },
            { card: "BT17-059", as: "candidate" },
          ],
          battleArea: [{ card: "BT1-009", as: "unrelated" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("infermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("infermon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("candidate").instanceId),
    ).toBe(false);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("infermon").instanceId),
    ).toBe(true);
  });
});
