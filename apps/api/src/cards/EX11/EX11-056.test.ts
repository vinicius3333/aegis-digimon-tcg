import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-056.js";

describe("EX11-056 Ryutaro Williams", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-056")).toMatchObject({
      nameEn: "Ryutaro Williams",
      colors: ["Red", "Green"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("does not hatch or evolve when the suspend payment is declined (Q5910)", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["BT1-001"],
          battleArea: [
            { card: "EX11-009", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          hand: [{ card: "EX11-010", as: "masterTyrannomon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("triggerBase").permanentId,
      instanceId: s.inst("masterTyrannomon").instanceId,
    });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    expect(s.perm("ryutaro").isSuspended).toBe(false);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-056", as: "ryutaro" }], deck: ["BT1-009"] },
      1: { deck: ["BT1-010"] },
    });
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not reset memory above 2 at the start of your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-056", as: "ryutaro" }], deck: ["BT1-009"] },
      1: { deck: ["BT1-010"] },
    });
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("hatches from the legal egg deck after a Tyrannomon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["BT1-001"],
          battleArea: [
            { card: "EX11-009", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          hand: [
            { card: "EX11-010", as: "masterTyrannomon" },
            { card: "EX11-010", as: "breedingTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("triggerBase").permanentId,
        instanceId: s.inst("masterTyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ryutaro").isSuspended);
    expect(s.state.players[0]!.breeding).toBeDefined();
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-001");
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX11-010")).toBe(true);
    expect(s.perm("ryutaro").isSuspended).toBe(true);
    assertNoLoudGap(s);
    const hatchPart =
      "[All Turns] When any of your Digimon digivolve into a level 5 or higher Digimon with [Tyrannomon] in its name " +
      "or the [Dinosaur] trait, by suspending this Tamer, you may hatch in your breeding area.";
    expect(
      s.decisions
        .filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX11-056")
        .map(({ req }) => req.options?.effectTextPart),
    ).toEqual([hatchPart, hatchPart]);
  });

  it("free-digivolves the newly hatched egg into a legal Reptile from hand", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-001", as: "egg" }],
          battleArea: [
            { card: "EX11-009", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          hand: [
            { card: "EX11-010", as: "masterTyrannomon" },
            { card: "BT1-010", as: "breedingAgumon" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        declinePrompts: ["You may suspend 1 Digimon"],
      },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("triggerBase").permanentId,
        instanceId: s.inst("masterTyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("breedingAgumon").instanceId);

    expect(s.state.players[0]!.breeding?.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("breedingAgumon").instanceId)).toBe(
      false,
    );
    expect(s.perm("ryutaro").isSuspended).toBe(true);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });

  it("pays the suspend cost before evolving an occupied breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-010", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          breeding: { card: "EX11-009", as: "breedingBase" },
          hand: [
            { card: "EX11-011", as: "dinomon" },
            { card: "EX11-010", as: "breedingTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("triggerBase").permanentId,
        instanceId: s.inst("dinomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard.cardId === "EX11-010");
    expect(s.perm("ryutaro").isSuspended).toBe(true);
    expect(s.perm("breedingBase").stack.map(({ cardId }) => cardId)).toContain("EX11-009");
    assertNoLoudGap(s);
  });

  it("does not activate again while Ryutaro is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["BT1-001"],
          battleArea: [
            { card: "EX11-009", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro", suspended: true },
          ],
          hand: [{ card: "EX11-010", as: "masterTyrannomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("triggerBase").permanentId,
        instanceId: s.inst("masterTyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("triggerBase").topCard.cardId === "EX11-010");
    await drainMicrotasks(20);
    expect(s.perm("ryutaro").isSuspended).toBe(true);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX11-056")).toEqual([]);
    assertNoLoudGap(s);
  });

  it("offers only the first of two consecutive qualifying digivolutions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-010", as: "firstMaster" },
            { card: "EX11-010", as: "secondMaster" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          breeding: { card: "EX11-009", as: "breedingBase" },
          hand: [
            { card: "EX8-016", as: "firstDinomon" },
            { card: "EX11-010", as: "breedingMaster" },
            { card: "EX11-011", as: "secondDinomon" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        declinePrompts: ["You may suspend 1 Digimon"],
      },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstMaster").permanentId,
        instanceId: s.inst("firstDinomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard.cardId === "EX11-010");
    const firstDecisionCount = s.decisions.filter(({ req }) => req.sourceCardId === "EX11-056").length;
    expect(firstDecisionCount).toBeGreaterThan(0);
    expect(s.perm("ryutaro").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondMaster").permanentId,
        instanceId: s.inst("secondDinomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-011"));
    await drainMicrotasks(20);

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX11-056")).toHaveLength(firstDecisionCount);
    expect(
      s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX11-056"),
    ).toHaveLength(1);
    expect(s.perm("breedingBase").topCard.cardId).toBe("EX11-010");
    assertNoLoudGap(s);
  });

  it("does not hatch for a level-4 destination", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["BT1-001"],
          battleArea: [
            { card: "EX11-008", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          hand: [{ card: "EX11-009", as: "levelFour" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("triggerBase").permanentId,
        instanceId: s.inst("levelFour").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("triggerBase").topCard.cardId === "EX11-009");
    expect(s.perm("ryutaro").isSuspended).toBe(false);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-056", as: "ryutaro", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-056"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("encodes the Q5909 destination filter as Tyrannomon OR Dinosaur and targets breeding exactly", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const subTrigger = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
    expect(subTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      effectTextPart:
        "[All Turns] When any of your Digimon digivolve into a level 5 or higher Digimon with [Tyrannomon] in its name or the [Dinosaur] trait, by suspending this Tamer, you may hatch in your breeding area.",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      digivolveIntoFilter: {
        levelComparison: { op: "gte", value: 5 },
        nameOrTrait: [
          { tokens: ["Tyrannomon"], match: "name" },
          { tokens: ["Dinosaur"], match: "trait", orPrevious: true },
        ],
      },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
      actions: [
        { kind: "Hatch", optional: true },
        {
          kind: "Digivolve",
          effectTextPart:
            "After, 1 of your Digimon in the breeding area may digivolve into a Digimon card with [Tyrannomon] in its name or the [Reptile] or [Dinosaur] trait in the hand without paying the cost.",
          target: { filter: { zone: "breeding" } },
          payCost: false,
        },
      ],
    });
  });
});
