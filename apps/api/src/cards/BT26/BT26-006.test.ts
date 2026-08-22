import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT26-006.js";

const CARD_ID = "BT26-006";

describe("BT26-006 Monimon", () => {
  it("trashes exactly 2 sources, then plays 1 Bagra Army Digimon for 2 less", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-075",
              as: "host",
              under: [
                { card: CARD_ID, as: "monimon" },
                { card: "BT10-073", as: "costA" },
                { card: "BT14-057", as: "costB" },
              ],
            },
          ],
          hand: [
            { card: "BT14-057", as: "played" },
            { card: "BT1-009", as: "nonBagra" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 1;
    preferred.push(s.inst("costA").instanceId, s.inst("costB").instanceId, s.inst("played").instanceId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("monimon").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("costA").instanceId, s.inst("costB").instanceId]),
    );
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("played").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonBagra").instanceId]);
  });

  it("can pay across 2 Bagra Army hosts and spends the effect only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-075",
              as: "attacker",
              under: [
                { card: CARD_ID, as: "monimon" },
                { card: "BT10-073", as: "firstCost" },
                { card: "BT11-077", as: "spareA" },
              ],
            },
            {
              card: "BT10-076",
              as: "ally",
              under: [
                { card: "BT14-057", as: "secondCost" },
                { card: "BT10-073", as: "spareB" },
              ],
            },
          ],
          hand: [
            { card: "BT14-057", as: "firstPlay" },
            { card: "BT14-057", as: "secondPlay" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 2;
    preferred.push(s.inst("firstCost").instanceId, s.inst("secondCost").instanceId, s.inst("firstPlay").instanceId);
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    const trashAfterFirst = s.state.players[0]!.trash.length;
    const handAfterFirst = s.state.players[0]!.hand.length;

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });

    expect(s.state.players[0]!.trash).toHaveLength(trashAfterFirst);
    expect(s.state.players[0]!.hand).toHaveLength(handAfterFirst);
    expect(s.perm("attacker").stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("firstCost").instanceId);
    expect(s.perm("ally").stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("secondCost").instanceId);
  });

  it("cannot partially pay with only 1 eligible source (Q6959)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-075", as: "host", under: [{ card: CARD_ID, as: "onlySource" }] }],
          hand: [{ card: "BT14-057", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("onlySource").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("candidate").instanceId]);
    expect(s.state.memory).toBe(1);
  });

  it("Q6959 atomically rejects a cross-host cost when one selected source is protected", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-075",
              as: "attacker",
              under: [
                { card: CARD_ID, as: "monimon" },
                { card: "BT9-109", as: "protected" },
              ],
            },
            { card: "BT10-076", as: "ally", under: [{ card: "BT10-073", as: "otherCost" }] },
          ],
          hand: [{ card: "BT14-057", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 1;
    preferred.push(s.inst("protected").instanceId, s.inst("otherCost").instanceId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });

    expect(s.perm("attacker").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("monimon").instanceId,
      s.inst("protected").instanceId,
    ]);
    expect(s.perm("ally").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("otherCost").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("candidate").instanceId]);
    expect(s.state.memory).toBe(1);
  });

  it("does not use sources under a non-Bagra Army Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-075", as: "host", under: [{ card: CARD_ID, as: "monimon" }] },
            { card: "BT1-009", as: "nonBagra", under: ["BT10-073", "BT14-057"] },
          ],
          hand: [{ card: "BT14-057", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("nonBagra").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("encodes the exact two-card Bagra Army cost and both play/use branches", () => {
    expect(compiled.effects).toMatchObject([{
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{
        kind: "Modal",
        choose: 1,
        options: [
          [{ kind: "PlayWithoutCost", reduceCostBy: 2, cost: { kind: "trash", target: { count: 2 } } }],
          [{ kind: "UseOptionWithoutCost", reduceCostBy: 2, cost: { kind: "trash", target: { count: 2 } } }],
        ],
      }],
    }]);
  });
});
