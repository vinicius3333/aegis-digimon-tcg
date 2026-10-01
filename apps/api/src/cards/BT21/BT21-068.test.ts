import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-068.js";
import "../index.js";

describe("BT21-068 Growlmon", () => {
  it("preserves the Guilmon alternate Digivolution requirement and inherited deletion memory", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, names: ["Guilmon"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        isInherited: true,
        actions: [{ kind: "GainMemory", amount: 1 }],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("deletes an opposing Digimon and conditionally mills two", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "Delete",
            target: expect.objectContaining({
              filter: expect.objectContaining({
                controller: "opponent",
                kind: ["Digimon"],
                dp: { op: "lte", value: 4000 },
              }),
            }),
          }),
          expect.objectContaining({
            kind: "TrashTopDeck",
            amount: 2,
            condition: expect.objectContaining({ kind: "ifThisEffectDidNotDelete" }),
          }),
        ]),
      );
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "OnDeletion", isInherited: true }));
  });

  it("must delete an eligible 4000 DP Digimon and does not mill", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-068", as: "growlmon" }], deck: ["BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("growlmon"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("deletes an eligible printed opponent through the public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-068", as: "growlmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("mills two when an eligible target prevents deletion with printed Armor Purge", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-068", as: "growlmon" }],
          deck: [
            { card: "BT1-009", as: "millA" },
            { card: "BT1-010", as: "millB" },
            { card: "BT1-011", as: "sentinel" },
          ],
        },
        1: { battleArea: [{ card: "BT10-074", as: "protected", under: ["BT12-073"] }] },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("selectCards");
    expect(s.decisions.at(-1)!.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("protected").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("millA").instanceId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("millB").instanceId),
    );

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("protected").permanentId)).toBe(true);
    expect(s.perm("protected").topCard.cardId).toBe("BT12-073");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT10-074")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("millA").instanceId, s.inst("millB").instanceId]),
    );
  });

  it("mills two after the public When Digivolving trigger has no eligible target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-064", as: "guilmon" }],
          hand: [{ card: "BT21-068", as: "growlmon" }],
          deck: [
            { card: "BT1-011", as: "bonusDraw" },
            { card: "BT1-009", as: "millA" },
            { card: "BT1-010", as: "millB" },
            { card: "BT1-012", as: "sentinel" },
          ],
        },
        1: { battleArea: [{ card: "BT21-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("sentinel").instanceId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("millA").instanceId, s.inst("millB").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it.each([4001, 9000])("mills two when the opponent has only a %i DP Digimon", async (dp) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-068", as: "growlmon" }],
          deck: [
            { card: "BT1-009", as: "millA" },
            { card: "BT1-010", as: "millB" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("growlmon"));
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("gains 1 memory when a realistic host carrying Growlmon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-076", as: "host", under: [{ card: "BT21-068", as: "source" }] }] },
    });
    await s.ready();
    s.state.memory = 0;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("uses the Guilmon alternate evolution route for exactly 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-064", as: "guilmon" }],
        hand: [{ card: "BT21-068", as: "growlmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.instanceId === s.inst("growlmon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("gains inherited memory when a public battle deletes a legal Growlmon stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-068", as: "host", suspended: true }],
          hand: [{ card: "ST6-11", as: "evolution" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT10-055", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "ST6-11");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-068"]);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(before - 1);
  });
});

describe("BT21-068 Growlmon — KB Q&A rulings", () => {
  it("must choose and delete an eligible 4000 DP or less Digimon instead of choosing nothing to mill (Q4575)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-068", as: "growlmon" }],
          deck: [
            { card: "BT1-009", as: "millA" },
            { card: "BT1-010", as: "millB" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "chosen" },
            { card: "BT1-009", as: "spared" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const pending = s.state.pendingDecision!;
    expect(pending.seat).toBe(0);
    expect(JSON.parse(pending.payloadJson)).toMatchObject({ min: 1, max: 1, targetFate: "delete" });

    const declined = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: pending.decisionId,
      response: { kind: "chooseTargets", instanceIds: [] },
    });
    expect(declined.ok).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(pending.decisionId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("chosen").instanceId));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("spared").permanentId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("millA").instanceId,
      s.inst("millB").instanceId,
    ]);
  });

  it("meets the didn't-delete condition by choosing an eligible Digimon that prevents its deletion (Q4576)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-068", as: "growlmon" }],
          deck: [
            { card: "BT1-009", as: "millA" },
            { card: "BT1-010", as: "millB" },
            { card: "BT1-011", as: "sentinel" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT10-074", as: "protected", under: ["BT12-073"] },
            { card: "BT1-009", as: "unprotected" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("protected").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.seat === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("protected").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.perm("protected").topCard.cardId).toBe("BT12-073");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("protected").permanentId,
      s.perm("unprotected").permanentId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("millA").instanceId, s.inst("millB").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sentinel").instanceId]);
  });

  async function deleteHostCarrying(topCard: string, under: string[], firstTrigger: string) {
    const preferred: string[] = [];
    const memoryGainsWithGrowlmonInHand: boolean[] = [];
    let growlmonInHand = (): boolean => false;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: topCard,
              as: "host",
              under: under.map((card) => ({ card, as: card })),
            },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferTriggerKeys: [firstTrigger],
        preferInstanceIds: preferred,
        onEvent: (event) => {
          if (event.kind === "memoryChanged" && event.to > event.from) {
            memoryGainsWithGrowlmonInHand.push(growlmonInHand());
          }
        },
      },
    );
    await s.ready();
    s.state.memory = 0;
    const growlmon = topCard === "BT21-068" ? s.perm("host").topCard : s.inst("BT21-068");
    preferred.push(growlmon.instanceId);
    growlmonInHand = () => s.state.players[0]!.hand.some((card) => card.instanceId === growlmon.instanceId);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();
    return { s, growlmonInstanceId: growlmon.instanceId, memoryGainsWithGrowlmonInHand };
  }

  it("cannot activate Guilmon's pending inherited effect after Gigimon returns the deleted Growlmon to the hand (Q5758)", async () => {
    const gigimonFirst = await deleteHostCarrying("BT21-068", ["P-177", "BT21-064"], "P-177");
    expect(gigimonFirst.s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      gigimonFirst.growlmonInstanceId,
    ]);
    expect(gigimonFirst.s.state.memory).toBe(0);
    expect(gigimonFirst.memoryGainsWithGrowlmonInHand).toEqual([]);

    const guilmonFirst = await deleteHostCarrying("BT21-068", ["P-177", "BT21-064"], "BT21-064");
    expect(guilmonFirst.s.state.memory).toBe(1);
    expect(guilmonFirst.memoryGainsWithGrowlmonInHand).toEqual([false]);
    expect(guilmonFirst.s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      guilmonFirst.growlmonInstanceId,
    ]);
  });

  it("still activates Growlmon's inherited memory gain after Gigimon returns it from under the deleted WarGrowlmon (Q5759)", async () => {
    const { s, growlmonInstanceId, memoryGainsWithGrowlmonInHand } = await deleteHostCarrying(
      "BT21-076",
      ["P-177", "BT21-068"],
      "P-177",
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([growlmonInstanceId]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-076")).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(memoryGainsWithGrowlmonInHand).toEqual([true]);
  });
});
