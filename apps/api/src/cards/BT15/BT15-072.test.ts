import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { definitionMatches } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-072.js";
import "../index.js";

describe("BT15-072", () => {
  it("has Blocker and an unlimited all-turns leave-prevention replacement", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { controller: "mine", excludeSelf: true },
          cost: { kind: "deleteOwn" },
        },
      ],
    });
    expect(compiled.effects?.[1]?.frequency).toBeUndefined();
  });

  it("protects Apocalymon by name without matching unrelated cards that only mention it", () => {
    const replacement = compiled.effects?.[1]?.actions[0];
    expect(replacement?.kind).toBe("Replacement");
    if (replacement?.kind !== "Replacement") throw new Error("BT15-072 replacement action is missing");
    const sourceFilter = replacement.sourceFilter;
    expect(sourceFilter).toBeDefined();
    if (sourceFilter === undefined) throw new Error("BT15-072 protection filter is missing");

    expect(sourceFilter.nameOrTrait).toEqual([
      { tokens: ["Apocalymon"], match: "name" },
      { tokens: ["Dark Masters"], match: "trait" },
    ]);
    expect(definitionMatches(sourceFilter, getCardDefinition("BT15-102")!)).toBe(true);
    expect(definitionMatches(sourceFilter, getCardDefinition("BT17-068")!)).toBe(false);
  });

  it("naturally blocks an attack to protect a Dark Masters Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-072", as: "vilemon" },
            { card: "BT15-031", as: "protected", suspended: true },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const vilemonPermanentId = s.perm("vilemon").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("vilemon"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("protected").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: vilemonPermanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("vilemon").instanceId) &&
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === vilemonPermanentId),
    );

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(s.perm("protected").permanentId);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).not.toContain(vilemonPermanentId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("vilemon").instanceId);
  });

  it("naturally prevents an opponent effect from returning a Dark Masters Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-072", as: "vilemon" },
            { card: "BT15-031", as: "protected" },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT15-031", as: "material" }],
          hand: [{ card: "BT15-029", as: "bounce" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").topCard.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const vilemonPermanentId = s.perm("vilemon").permanentId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("vilemon").instanceId) &&
        !s.state.players[0]!.battleArea.some((p) => p.permanentId === vilemonPermanentId),
    );

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(s.perm("protected").permanentId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("vilemon").instanceId);
  });
});

describe("BT15-072 Vilemon — KB Q&A rulings", () => {
  const optionTargets: PermanentSpec[] = [
    { card: "ST1-03", as: "red" },
    { card: "ST2-03", as: "blue" },
    { card: "ST3-05", as: "angemon" },
  ];

  async function resolveOpponentOption({
    optionCardId,
    optionIndex = 0,
    opponentBattleArea = optionTargets,
  }: {
    optionCardId: string;
    optionIndex?: number;
    opponentBattleArea?: PermanentSpec[];
  }) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-072", as: "vilemon" },
            { card: "BT15-031", as: "protected" },
            { card: "BT1-009", as: "host" },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: opponentBattleArea,
          hand: [{ card: optionCardId, as: "option" }],
          security: ["BT1-009"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: optionIndex,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("protected").topCard.instanceId, s.perm("host").topCard.instanceId);
    if (opponentBattleArea.some((permanent) => permanent.as === "angemon")) {
      preferred.push(s.perm("angemon").topCard.instanceId);
    }
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const protectedId = s.perm("protected").permanentId;
    const vilemonId = s.perm("vilemon").permanentId;
    const vilemonInstanceId = s.inst("vilemon").instanceId;
    const optionInstanceId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === optionInstanceId) &&
        s.state.pendingDecision === undefined,
    );

    const seat0 = s.state.players[0]!;
    return {
      preventionOffered: s.decisions.some(
        ({ seat, req }) => seat === 0 && req.promptText === "Prevent leaving the battle area?",
      ),
      protectedOnField: seat0.battleArea.some((permanent) => permanent.permanentId === protectedId),
      vilemonOnField: seat0.battleArea.some((permanent) => permanent.permanentId === vilemonId),
      vilemonTrashed: seat0.trash.some((card) => card.instanceId === vilemonInstanceId),
      securityCount: seat0.security.length,
      handCount: seat0.hand.length,
      hostStackCardIds: s.perm("host").stack.map((card) => card.cardId),
    };
  }

  it("treats deletion, return to hand, placement in security, and placement under another card as leaving the battle area (Q2560)", async () => {
    const deleted = await resolveOpponentOption({ optionCardId: "ST1-16" });
    expect(deleted).toMatchObject({
      preventionOffered: true,
      protectedOnField: true,
      vilemonOnField: false,
      vilemonTrashed: true,
    });

    const returnedToHand = await resolveOpponentOption({ optionCardId: "ST2-16" });
    expect(returnedToHand).toMatchObject({
      preventionOffered: true,
      protectedOnField: true,
      vilemonOnField: false,
      vilemonTrashed: true,
      handCount: 0,
    });

    const placedInSecurity = await resolveOpponentOption({ optionCardId: "BT14-094", optionIndex: 1 });
    expect(placedInSecurity).toMatchObject({
      preventionOffered: true,
      protectedOnField: true,
      vilemonOnField: false,
      vilemonTrashed: true,
      securityCount: 1,
    });

    // Astral Snatcher needs a [Bagra Army] card on its user's side before it can place a Digimon under another.
    const placedUnderAnotherCard = await resolveOpponentOption({
      optionCardId: "BT11-109",
      opponentBattleArea: [{ card: "BT14-057", as: "bagraArmy" }],
    });
    expect(placedUnderAnotherCard).toMatchObject({
      preventionOffered: true,
      protectedOnField: true,
      vilemonOnField: false,
      vilemonTrashed: true,
      hostStackCardIds: [],
    });

    const onlyLosesDp = await resolveOpponentOption({ optionCardId: "BT14-094", optionIndex: 0 });
    expect(onlyLosesDp).toMatchObject({
      preventionOffered: false,
      protectedOnField: true,
      vilemonOnField: true,
      vilemonTrashed: false,
    });
  });
});
