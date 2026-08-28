import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-058.js";

describe("BT8-058 Agumon", () => {
  it("adds a Greymon and a Dragonkin card from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-058", as: "source" }],
          deck: [{ card: "BT8-064", as: "greymon" }, { card: "BT8-012", as: "dragonkin" }, "BT8-059", "BT8-061"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("greymon").instanceId, s.inst("dragonkin").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(2);
  });

  it("cannot add the same Greymon Dragonkin card twice", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-058", as: "source" }],
          deck: [{ card: "BT8-064", as: "both" }, "BT8-059", "BT8-060", "BT8-061"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("both").instanceId));

    expect(s.state.players[0]!.hand.filter((card) => card.instanceId === s.inst("both").instanceId)).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
