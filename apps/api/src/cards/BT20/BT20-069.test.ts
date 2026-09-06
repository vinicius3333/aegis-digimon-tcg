import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-069.js";
import "./index.js";

describe("BT20-069 Punkmon", () => {
  it("trashes one hand card, then gives the same own Digimon Blocker and Retaliation", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Trash",
        target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
      });
      expect(actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
        target: { count: 1 },
      });
      expect(actions[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Retaliation" },
        duration: "untilOpponentTurnEnd",
        target: { count: 1, sameTarget: true },
      });
    }
  });

  it("grants inherited +2000 DP during its controller's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("publishes stats and the exact level-3 Evil alternate route", async () => {
    expect(getCardDefinition("BT20-069")).toMatchObject({ level: 4, playCost: 5, dp: 5000 });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Evil"], cost: 2, isAlternate: true }]);
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-061", as: "evil" }],
        hand: [{ card: "BT20-069", as: "punkmon" }],
        deck: ["BT20-047"],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("evil").permanentId,
        instanceId: s.inst("punkmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evil").topCard.cardId === "BT20-069");
    expect(s.state.memory).toBe(0);
  });

  it("on play and evolution trashes one hand card, then grants both keywords to the same ally", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-061", as: "ally" },
              ...(mode === "digivolve" ? [{ card: "BT20-061", as: "base" }] : []),
            ],
            hand: [
              { card: "BT20-069", as: "punkmon" },
              { card: "BT20-047", as: "fodder" },
            ],
            deck: ["BT20-047"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = mode === "play" ? 5 : 2;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("punkmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("punkmon").instanceId,
              useAlternateCost: true,
            });
      expect(result).toEqual({ ok: true });
      await settle(
        () =>
          observe(s.engine).hasKeyword(s.perm("ally"), "Blocker") &&
          observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation"),
      );
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);
    }
  });

  it("the Then keyword grants still resolve when the hand has no card to trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT20-061", as: "ally" }], hand: [{ card: "BT20-069", as: "punkmon" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("punkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
  });

  it("uses the granted Blocker and Retaliation in a public battle", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-061", as: "ally" }],
          hand: [
            { card: "BT20-069", as: "punkmon" },
            { card: "BT20-047", as: "fodder" },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 1000, as: "attacker" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.perm("ally").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("punkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("applies inherited +2000 only underneath a host on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-072", under: ["BT20-069"], as: "host" }] } });
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(9000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
