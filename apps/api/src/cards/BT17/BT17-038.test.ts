import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-038.js";
import "./index.js";

describe("BT17-038 Sakuyamon", () => {
  it("reduces one opposing Digimon by 6000 and may use a qualifying yellow or Plug-In Option", () => {
    const actions = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "UseOptionWithoutCost",
      optional: true,
      filter: {
        orFilters: [
          { kind: ["Option"], controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] },
          { kind: ["Option"], color: "yellow", playCost: { max: 5 }, controller: "mine", zone: "hand" },
        ],
      },
    });
  });

  it("once per turn prevents opponent-effect return to hand or deck after a cost-2 Option", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [
            {
              kind: "Restrict",
              restriction: "beReturned",
              duration: "untilOpponentTurnEnd",
              byOpponentEffectsOnly: true,
            },
          ],
        },
      ],
    });
  });

  it("reduces DP and uses a qualifying yellow Option for free on digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-035", as: "base" }],
          hand: [
            { card: "BT17-038", as: "sakuyamon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-020", dp: 9000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("target").currentDP === 3000 && s.state.players[0]!.hand.some((card) => card.instanceId === drawnId),
    );

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Barrier")).toBe(true);
  });

  it("becomes return-protected after using a cost-2 Option", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-038", as: "sakuyamon" }] } });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 2, subjectPermanentId: "used-option" });

    expect(observe(s.engine).isRestricted(s.perm("sakuyamon"), "beReturned")).toBe(true);
  });
});
