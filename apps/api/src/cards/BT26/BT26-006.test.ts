import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT26-006.js";

const CARD_ID = "BT26-006";

describe("BT26-006 Monimon", () => {
  it("plays a Bagra Army Tamer through the play branch with the cost reduced by 2", async () => {
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
            { card: "BT10-093", as: "bagraTamer" },
            { card: "BT1-087", as: "nonBagraTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 1;
    preferred.push(s.inst("costA").instanceId, s.inst("costB").instanceId, s.inst("bagraTamer").instanceId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("costA").instanceId, s.inst("costB").instanceId]),
    );
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("bagraTamer").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonBagraTamer").instanceId]);
  });

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
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 1;
    preferred.push(s.inst("costA").instanceId, s.inst("costB").instanceId, s.inst("played").instanceId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
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
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 2;
    preferred.push(s.inst("firstCost").instanceId, s.inst("secondCost").instanceId, s.inst("firstPlay").instanceId);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    const trashAfterFirst = s.state.players[0]!.trash.length;
    const handAfterFirst = s.state.players[0]!.hand.length;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), {
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
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
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
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 1;
    preferred.push(s.inst("protected").instanceId, s.inst("otherCost").instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), {
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
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("nonBagra").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("may decline without trashing either source or paying to play the hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-073",
              as: "host",
              under: [
                { card: CARD_ID, as: "monimon" },
                { card: "BT10-073", as: "costA" },
                { card: "BT14-057", as: "costB" },
              ],
            },
          ],
          hand: [{ card: "BT14-057", as: "candidate" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("monimon").instanceId,
      s.inst("costA").instanceId,
      s.inst("costB").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("candidate").instanceId]);
    expect(s.state.memory).toBe(1);
  });

  it("Q6960 ends the attack when its attacker becomes DigiXros material for the effect-played Digimon", async () => {
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
                { card: "BT10-073", as: "costA" },
                { card: "BT14-057", as: "costB" },
              ],
            },
          ],
          hand: [
            { card: "EX10-058", as: "played" },
            { card: "BT10-077", as: "handMaterial" },
          ],
        },
        1: { security: [{ card: "BT1-001", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("costA").instanceId,
      s.inst("costB").instanceId,
      s.inst("played").instanceId,
      s.perm("attacker").topCard.instanceId,
      s.inst("handMaterial").instanceId,
    );
    s.state.memory = 5;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const attackerCardId = s.perm("attacker").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"), 5000);

    const digiXros = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(false);
    expect(digiXros.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([attackerCardId, s.inst("handMaterial").instanceId]),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
  });

  it("Q6961 drops a pending trashed-source effect when EX10-064 moves that card into the DigiXros stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-034",
              as: "attacker",
              under: [
                { card: CARD_ID, as: "monimon" },
                { card: "EX10-044", as: "pendingDrawSource" },
                { card: "BT1-009", as: "otherCost" },
              ],
            },
            { card: "EX10-064", as: "expander" },
          ],
          hand: [{ card: "EX10-058", as: "played" }],
          deck: [{ card: "BT1-010", as: "wouldBeDrawn" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("pendingDrawSource").instanceId,
      s.inst("otherCost").instanceId,
      s.inst("played").instanceId,
      s.perm("expander").topCard.instanceId,
      s.perm("attacker").topCard.instanceId,
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-058"), 5000);
    await settle(() => s.state.pendingDecision === undefined);

    const digiXros = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-058")!;
    expect(s.perm("expander").isSuspended).toBe(true);
    expect(digiXros.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("pendingDrawSource").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("wouldBeDrawn").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("encodes the exact two-card Bagra Army cost and both play/use branches", () => {
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Modal",
            choose: 1,
            options: [
              [
                {
                  kind: "PlayWithoutCost",
                  reduceCostBy: 2,
                  allowDigiXros: true,
                  cost: { kind: "trash", target: { count: 2 } },
                },
              ],
              [{ kind: "UseOptionWithoutCost", reduceCostBy: 2, cost: { kind: "trash", target: { count: 2 } } }],
            ],
          },
        ],
      },
    ]);
  });
});
