import { type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-089.js";

describe("BT4-089 Plutomon", () => {
  it("draws two then uses a purple Option costing 6 or less for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [
            { card: "BT4-089", as: "evolving" },
            { card: "BT4-111", as: "option" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const optionId = s.inst("option").instanceId;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => player.trash.some(({ instanceId }) => instanceId === optionId));

    expect(player.trash.some(({ instanceId }) => instanceId === optionId)).toBe(true);
    expect(player.deck).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("does not use a non-purple Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [
            { card: "BT4-089", as: "evolving" },
            { card: "BT4-098", as: "redOption" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => player.deck.length === 0);

    expect(player.hand.some(({ instanceId }) => instanceId === s.inst("redOption").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(0);
  });
});
