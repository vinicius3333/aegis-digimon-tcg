import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-090.js";

describe("BT7-090 Kota Domoto", () => {
  it("uses trait-substring matching for X Antibody", () => {
    expect(runtimeCompiledCard("BT7-090")?.effects[1]?.actions[0]).toMatchObject({
      add: [{ filter: { nameOrTrait: [{ tokens: ["X-Antibody"], match: "traitContains" }] } }],
    });
  });

  it("adds an X-Antibody card from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-090", as: "source" }],
          deck: [{ card: "BT7-062", as: "xAntibody" }, "BT7-057", "BT7-058", "BT7-059"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("xAntibody").instanceId));
    expect(player.deck).toHaveLength(3);
  });
});
