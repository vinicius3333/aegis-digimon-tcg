import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
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
  it("inherits a once-per-turn -2000 DP trigger for using an Option with use cost 2 or more", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
        },
      ],
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

  it("applies the inherited DP loss only after a qualifying Option use", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-051", as: "host", under: ["EX8-031"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: ["BT1-045"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 1, subjectPermanentId: "cheap" });
    expect(s.perm("target").currentDP).toBe(3000);
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 2, subjectPermanentId: "qualifying" });
    expect(s.perm("target").currentDP).toBe(1000);

    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(3000);
  });
});
