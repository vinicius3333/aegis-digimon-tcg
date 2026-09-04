import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import "../ST3/ST3-13.js";
import "../ST3/ST3-15.js";
import { compiled } from "./EX8-031.js";

describe("EX8-031", () => {
  it("recovers a name-only Plug-In through actual Renamon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-036", as: "renamon" }],
          hand: [{ card: "EX8-031", as: "x" }],
          deck: ["BT1-028", "BT1-037"],
          trash: ["EX2-066", "ST3-13"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("renamon").permanentId,
        instanceId: s.inst("x").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX2-066"));
    expect(s.perm("renamon").topCard.cardId).toBe("EX8-031");
    expect(s.perm("renamon").stack.map((card) => card.cardId)).toEqual(["BT5-036"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-028", "EX2-066"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["ST3-13"]);
  });

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
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["EX8-031"] }],
          hand: [
            { card: "ST3-13", as: "cheap" },
            { card: "ST3-15", as: "qualifying" },
            { card: "ST3-15", as: "second" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: ["BT1-045"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const cheapId = s.inst("cheap").instanceId;
    const secondId = s.inst("second").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: cheapId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === cheapId));
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.memory).toBe(9);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("qualifying").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.state.memory).toBe(7);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === secondId));
    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.state.memory).toBe(5);

    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(3000);
  });
});
