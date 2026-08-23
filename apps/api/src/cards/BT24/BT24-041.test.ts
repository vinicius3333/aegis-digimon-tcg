import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_041 } from "./BT24-041.js";
import "../index.js";

describe("BT24-041 Minervamon", () => {
  it("shares the three entry triggers and scales De-Digivolve by your Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "OnDeletion"]) {
      const effect = BT24_041.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        scaling: { unit: "cards", per: 1 },
      });
      expect((effect?.actions?.[1] as any).optional).toBeUndefined();
    }
  });
  it("grants Iliad Digimon Reboot and Blocker during the opponent turn", () => {
    const effect = BT24_041.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect?.actions).toHaveLength(2);
    expect(effect?.actions?.map((action: any) => action.keyword?.keyword)).toEqual(["Reboot", "Blocker"]);
  });

  it.each([
    ["Digimon", "BT24-034"],
    ["Tamer", "BT24-102"],
  ])("reduces its play cost by 5 while an Iliad %s is controlled", async (_kind, enabler) => {
    const reduced = setupEngine({
      0: {
        battleArea: [{ card: enabler, as: "iliad" }],
        hand: [{ card: "BT24-041", as: "minervamon" }],
      },
    });
    reduced.state.memory = 12;
    await reduced.ready();
    expect(
      reduced.engine.applyIntent(0, {
        type: "playCard",
        instanceId: reduced.inst("minervamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-041"),
    );
    expect(reduced.state.memory).toBe(5);

    const full = setupEngine({ 0: { hand: [{ card: "BT24-041", as: "minervamon" }] } });
    full.state.memory = 12;
    await full.ready();
    expect(
      full.engine.applyIntent(0, {
        type: "playCard",
        instanceId: full.inst("minervamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => full.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-041"));
    expect(full.state.memory).toBe(0);
  });

  it("De-Digivolves even when the optional hand play is declined (Q5627)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-041", as: "minervamon" }],
          hand: [{ card: "BT24-083", as: "playable" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", under: ["BT1-074", "BT1-077"] }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("minervamon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("playable").instanceId);
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("performs De-Digivolve 1 once per own Digimon rather than one larger peel (Q5628)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-041", as: "minervamon" },
          { card: "BT24-034", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT1-080", as: "target", under: ["BT1-074", "BT1-077", "BT24-029"] }] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("minervamon"));

    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("keeps the optional play and following De-Digivolve in one ordered effect (Q5629)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-041", as: "minervamon" }],
          hand: [{ card: "BT24-011", as: "played" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", under: ["BT1-074", "BT1-077"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("minervamon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("played").instanceId,
    );
  });

  it("grants Reboot and Blocker only to Iliad Digimon during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-041", as: "minervamon" },
          { card: "BT1-009", as: "nonIliad" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    for (const keyword of ["Reboot", "Blocker"]) {
      expect(observe(s.engine).hasKeyword(s.perm("minervamon"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("nonIliad"), keyword)).toBe(false);
    }
  });

  it.each([
    ["normal yellow requirement", false, 4],
    ["alternate TS requirement", true, 3],
  ])("may use the %s", async (_label, useAlternateCost, expectedCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-039", as: "base" }],
        hand: [{ card: "BT24-041", as: "minervamon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("minervamon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("minervamon").instanceId);
    expect(s.state.memory).toBe(5 - expectedCost);
  });
});
