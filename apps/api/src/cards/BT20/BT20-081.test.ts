import {
  dnaDigivolutionRequirementsFor as dnaRequirementsFor,
  getCardDefinition as cardDefinition,
} from "@aegis/shared";
import { dnaDigivolveCostFor } from "../../engine/effects/primitives.js";
import { compiled as compiledDna } from "./BT20-081.js";
import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-081.js";
import "./index.js";

describe("BT20-081 Fenriloogamon: Takemikazuchi", () => {
  it("provides Blast DNA Digivolve from hand", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDNADigivolve" }],
    });
  });

  it("publishes ACE stats, evolution costs, and Overflow", () => {
    expect(getCardDefinition("BT20-081")).toMatchObject({
      level: 7,
      playCost: 9,
      dp: 16000,
      isAce: true,
      overflowMemory: 5,
      evoCosts: [
        { color: "Purple", level: 6, memoryCost: 6 },
        { color: "Yellow", level: 6, memoryCost: 6 },
      ],
    });
  });

  it("gives two distinct opposing Digimon -10000 DP and conditionally deletes one at 10000 DP or lower", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -10000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
      });
      expect(actions[1]).toMatchObject({
        kind: "Delete",
        condition: { kind: "selfDigivolutionStackCountAtLeast", count: 1, filter: { kind: ["Tamer"] } },
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 10000 } }, count: 1 },
      });
    }
  });

  it("trashes the top security card to optionally reactivate one When Digivolving effect when attacking", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      actions: [
        {
          kind: "ReactivateEffect",
          fromTrigger: "WhenDigivolving",
          count: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
        },
      ],
    });
  });

  it("applies the DP reduction to two distinct recipients before the conditional delete is eligible", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", as: "host" }],
          hand: [{ card: "BT20-081", as: "takemikazuchi" }],
        },
        1: {
          battleArea: [
            { card: "BT10-055", as: "first" },
            { card: "BT8-017", as: "second" },
            { card: "BT1-080", as: "third" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId);
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("takemikazuchi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-081");

    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(3000);
    expect(s.perm("third").currentDP).toBe(12000);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
  });

  it("resolves the same two-target reduction on public play and evolution timing", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(mode === "digivolve" ? { battleArea: [{ card: "BT20-080", as: "host" }] } : {}),
            hand: [{ card: "BT20-081", as: "takemikazuchi" }],
          },
          1: {
            battleArea: [
              { card: "BT10-055", as: "first" },
              { card: "BT8-017", as: "second" },
              { card: "BT1-080", as: "third" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = mode === "play" ? 9 : 6;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takemikazuchi").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("host").permanentId,
              instanceId: s.inst("takemikazuchi").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.perm("first").currentDP === 3000 && s.perm("second").currentDP === 3000);
      expect(s.perm("third").currentDP).toBe(12000);
      expect(s.state.players[1]!.battleArea).toHaveLength(3);
    }
  });

  it("naturally gives two distinct opposing Digimon -10000, then deletes one after the Tamer check", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", under: ["BT20-085"], as: "host" }],
          hand: [{ card: "BT20-081", as: "takemikazuchi" }],
        },
        1: {
          battleArea: [
            { card: "BT10-055", as: "first" },
            { card: "BT8-017", as: "second" },
            { card: "BT1-080", as: "third" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId);
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("takemikazuchi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-081");

    const remaining = s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId);
    expect(remaining).toHaveLength(2);
    expect(remaining).toContain("BT1-080");
    expect(remaining).toContain("BT8-017");
    expect(s.perm("third").currentDP).toBe(12000);
    expect(s.perm("second").currentDP).toBe(3000);
  });

  it("pays the top-security cost to reactivate When Digivolving during an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", under: ["BT20-085"], as: "host" }],
          hand: [{ card: "BT20-081", as: "takemikazuchi" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT10-055", as: "first" },
            { card: "BT8-017", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("takemikazuchi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-081");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("public Counter Blast DNA consumes Fenriloogamon field plus Kazuchimon hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", as: "fenriloogamon" }],
          hand: [
            { card: "BT20-035", as: "kazuchimon" },
            { card: "BT20-081", as: "takemikazuchi" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT20-010", as: "attacker" }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.findLast((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const choice = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("takemikazuchi").instanceId);
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice!.instanceId,
        effectKey: choice!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-081"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT20-035");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-081")).toBe(true);
  });

  it("passing the Blast DNA counter preserves both materials and Examon while the attack resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", as: "fenriloogamon" }],
          hand: [
            { card: "BT20-035", as: "kazuchimon" },
            { card: "BT20-081", as: "takemikazuchi" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT20-010", as: "attacker" }], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT20-035", "BT20-081"]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT20-080"]);
  });

  it("requires exact named materials and a battle-area field material", async () => {
    for (const setup of [
      {
        battleArea: [{ card: "BT17-101", as: "nearName" }],
        hand: [
          { card: "BT20-035", as: "handMaterial" },
          { card: "BT20-081", as: "result" },
        ],
      },
      {
        breeding: { card: "BT20-080", as: "breeding" },
        hand: [
          { card: "BT20-035", as: "hand" },
          { card: "BT20-081", as: "result" },
        ],
      },
    ]) {
      const s = setupEngine(
        { 0: setup, 1: { battleArea: [{ card: "BT20-010", as: "attacker" }], security: ["BT1-009"] } },
        { autoDeclineOptional: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !s.events.some((event) => event.kind === "counterWindowOpened") ||
          s.events.some((event) => event.kind === "securityChecked"),
      );
      expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
    }
  });
});

describe("BT20-081 DNA requirement", () => {
  it("DNA digivolves only from exact [Fenriloogamon] + yellow Lv.6 with [Pulsemon] in text for 0", () => {
    expect(dnaRequirementsFor("BT20-081")).toEqual(compiledDna.dnaDigivolveRequirement);
    expect(compiledDna.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [{ namesExact: ["Fenriloogamon"] }, { color: "Yellow", level: 6, namesInText: ["Pulsemon"] }],
      },
    ]);
    const evolving = cardDefinition("BT20-081")!;
    const kazuchimon = cardDefinition("BT17-040")!;
    expect(dnaDigivolveCostFor(evolving, [cardDefinition("BT17-069")!, kazuchimon])).toBe(0);
    expect(dnaDigivolveCostFor(evolving, [cardDefinition("BT17-101")!, kazuchimon])).toBeUndefined();
  });
});

describe("BT20-081 Fenriloogamon: Takemikazuchi — KB Q&A rulings", () => {
  it("accepts a yellow Lv.6 whose only [Pulsemon] is in its digivolution requirement text as the DNA material (Q4405)", async () => {
    const dnaDigivolveWith = async (yellowMaterial: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-080", as: "fenriloogamon" },
              { card: yellowMaterial, as: "yellowMaterial" },
            ],
            hand: [{ card: "BT20-081", as: "takemikazuchi" }],
          },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 3;
      await s.ready();
      const result = s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("fenriloogamon").permanentId, s.perm("yellowMaterial").permanentId],
        instanceId: s.inst("takemikazuchi").instanceId,
      });
      if (result.ok) {
        await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT20-081"));
      }
      return { result, onField: s.state.players[0]!.battleArea.map((perm) => perm.topCard.cardId) };
    };

    const pulsemonInRequirement = await dnaDigivolveWith("BT17-040");
    expect(pulsemonInRequirement.result).toEqual({ ok: true });
    expect(pulsemonInRequirement.onField).toEqual(["BT20-081"]);

    const noPulsemonText = await dnaDigivolveWith("BT7-041");
    expect(noPulsemonText.result).toMatchObject({ ok: false });
    expect(noPulsemonText.onField).toEqual(expect.arrayContaining(["BT20-080", "BT7-041"]));
  });

  it("cannot choose the same opposing Digimon twice to give it -20000 DP (Q4406)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", as: "host" }],
          hand: [{ card: "BT20-081", as: "takemikazuchi" }],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "chosenTwice" },
            { card: "BT10-055", as: "otherA" },
            { card: "BT10-055", as: "otherB" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("takemikazuchi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const dpChoice = s.state.pendingDecision!;
    const chosenTwiceId = s.perm("chosenTwice").permanentId;
    expect(s.decisions.at(-1)?.req.options).toMatchObject({ min: 2, max: 2 });
    const duplicatePick = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: dpChoice.decisionId,
      response: { kind: "chooseTargets", instanceIds: [chosenTwiceId, chosenTwiceId] },
    });
    expect(duplicatePick).toMatchObject({ ok: false });
    await drainMicrotasks();
    expect(s.state.pendingDecision?.decisionId).toBe(dpChoice.decisionId);
    expect(s.perm("chosenTwice").currentDP).toBe(12000);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dpChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [chosenTwiceId, s.perm("otherA").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT20-081" && s.state.pendingDecision === undefined);

    expect(s.perm("chosenTwice").currentDP).toBe(2000);
    expect(s.perm("otherA").currentDP).toBe(3000);
    expect(s.perm("otherB").currentDP).toBe(13000);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("keeps a 0 DP Digimon in play until the whole effect resolves, then deletes it (Q4407)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-080", under: ["BT20-085"], as: "host" }],
          hand: [{ card: "BT20-081", as: "takemikazuchi" }],
        },
        1: {
          battleArea: [
            { card: "BT1-080", dp: 10000, as: "zeroed" },
            { card: "BT10-055", as: "deletedByEffect" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const zeroedPermanentId = s.perm("zeroed").permanentId;
    const deletedByEffectPermanentId = s.perm("deletedByEffect").permanentId;
    const zeroedInstanceId = s.inst("zeroed").instanceId;
    const deletedByEffectInstanceId = s.inst("deletedByEffect").instanceId;
    preferred.push(deletedByEffectPermanentId);
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("takemikazuchi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    const deleteChoice = s.decisions.find(({ req }) => req.kind === "chooseTargets" && req.options?.max === 1);
    expect(deleteChoice?.req.options?.candidateInstanceIds).toEqual([zeroedPermanentId, deletedByEffectPermanentId]);
    const deletionOrder = s.events.flatMap((event) =>
      event.kind === "cardsMoved" ? (event.deletedPermanents ?? []).map((deleted) => deleted.permanentId) : [],
    );
    expect(deletionOrder).toEqual([deletedByEffectPermanentId, zeroedPermanentId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([zeroedInstanceId, deletedByEffectInstanceId]),
    );
  });
});
