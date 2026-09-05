import { describe, expect, it } from "vitest";
import { EffectTiming, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import "../BT8/BT8-097.js";
import "../BT17/BT17-035.js";
import "../BT24/BT24-085.js";
import "../BT24/BT24-092.js";
import "../BT10/BT10-100.js";
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

  it("does not treat Security or Delay activation as using an Option (Q5512)", async () => {
    const security = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["EX8-031"] }],
          security: [{ card: "BT10-100", as: "securityOption" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 15000 }] },
      },
      { autoSelectCards: true },
    );
    await security.ready();
    await advance(security.engine).fireForInstance(EffectTiming.SecuritySkill, security.inst("securityOption"));
    await settle(() =>
      security.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === security.inst("securityOption").instanceId,
      ),
    );
    expect(security.perm("target").currentDP).toBe(15000);

    const delay = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-051", as: "host", under: ["EX8-031"] },
            { card: "BT10-100", as: "delay" },
          ],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    delay.perm("delay").placedByEffect = true;
    delay.state.turnCount += 1;
    delay.state.memory = 0;
    await delay.ready();
    const delayEffects = observe(delay.engine).activatableEffects(delay.perm("delay")) as Array<{ effectKey: string }>;
    expect(delayEffects).toHaveLength(1);
    expect(
      delay.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delay.inst("delay").instanceId,
        effectKey: delayEffects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      delay.state.players[0]!.trash.some((card) => card.instanceId === delay.inst("delay").instanceId),
    );
    expect(delay.perm("target").currentDP).toBe(15000);
  });

  it("uses the card-level cost reduction for the threshold, not the printed cost (Q5513)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-051", as: "host", under: ["EX8-031"] },
            { card: "BT1-009", as: "redSource" },
          ],
          hand: [{ card: "BT8-097", as: "crimsonBlaze" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 7000 },
            { card: "BT1-009", dp: 7000 },
            { card: "BT1-009", dp: 7000 },
            { card: "BT1-009", dp: 7000 },
            { card: "BT1-009", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimsonBlaze").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("crimsonBlaze").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("triggers when an effect reduces only the paid amount (Q5514)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-051", as: "host", under: ["EX8-031"] },
            { card: "BT17-035", as: "taomon" },
          ],
          hand: [{ card: "BT1-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("taomon"));
    await settle(() => s.perm("target").currentDP === 13000);

    expect(s.perm("target").currentDP).toBe(13000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("triggers when an effect uses an Option without paying its cost (Q5515)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-051", as: "host", under: ["EX8-031"] },
            { card: "BT24-085", as: "tamer" },
          ],
          hand: [{ card: "BT24-092", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("tamer"));
    await settle(() => s.state.players[0]!.hand.every((card) => card.instanceId !== s.inst("option").instanceId));

    expect(s.state.memory).toBe(-3);
    expect(s.perm("target").currentDP).toBe(7000);
  });
});
