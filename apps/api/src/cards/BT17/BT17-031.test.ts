import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-031.js";
import "./index.js";

describe("BT17-031", () => {
  it("reveals three and adds a Kyubimon/Taomon/Sakuyamon or Rika Nonaka option", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand" },
            { count: 1, to: "hand", orFilters: [{ kind: ["Option"], playCostGte: 2 }] },
          ],
        },
      ],
    });
  });

  it("gives an opposing Digimon Security Attack -1 after a cost 2+ option as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: -1 },
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    });
  });

  it("adds one named Digimon and Rika while bottom-decking the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-031", as: "renamon" }],
          deck: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "rika" },
            { card: "BT1-029", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const kyubimonId = s.inst("kyubimon").instanceId;
    const rikaId = s.inst("rika").instanceId;
    const remainderId = s.inst("remainder").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === rikaId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([kyubimonId, rikaId]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(remainderId);
  });

  it("reduces Security Attack only for an option use cost of at least 2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-032", under: ["BT17-031"], as: "host" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 1, subjectPermanentId: "cheap-option" });
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);

    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      usedOptionCost: 2,
      subjectPermanentId: "qualifying-option",
    });
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});
