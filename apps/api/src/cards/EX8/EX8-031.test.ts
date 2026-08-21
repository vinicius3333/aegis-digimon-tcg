import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-031.js";

describe("EX8-031", () => {
  it("returns a Plug-In Option from trash on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { count: 1 },
    });
  });
  it("returns a Plug-In Option from trash on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX8-031", as: "renamon" }], trash: [{ card: "ST22-08", as: "plugin" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("plugin").instanceId));
    expect(player.hand.some((card) => card.instanceId === s.inst("plugin").instanceId)).toBe(true);
  });
});
