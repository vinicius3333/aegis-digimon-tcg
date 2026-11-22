import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

describe("Ravemon Burst Mode mourning dance", () => {
  it.each([4, 5])("uses the hand size after discarding as the level floor (%s)", async (count) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-085", as: "burst" }], hand: [{ card: "BT27-085", as: "option" }] },
        1: { hand: Array(count).fill("BT1-009"), battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("option").instanceId));
    expect(s.state.players[1]!.hand).toHaveLength(count - 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(count === 4 ? 0 : 1);
  });

  it("highlights the discard and then the deletion clause", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-085", as: "burst" }], hand: [{ card: "BT27-085", as: "option" }] },
        1: { hand: ["BT1-009", "BT1-009"], battleArea: [{ card: "BT1-009" }, { card: "BT1-010" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("option").instanceId));
    expect(s.decisions.map(({ seat, req }) => [seat, req.kind, req.options?.effectTextEmphasis])).toEqual([
      [1, "selectCards", "[Main] Your opponent trashes any 1 card from their hand or security stack."],
      [
        0,
        "chooseTargets",
        "Then, delete 1 of their Digimon with a level as high as the number of cards in their hand or higher.",
      ],
    ]);
  });

  it("may unsuspend once per turn only for an opponent hand discard", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT27-085", as: "burst", suspended: true }] }, 1: { hand: ["BT1-009", "BT1-011"] } },
      { autoSelectCards: true, autoAcceptOptional: true, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0, byEffectSeat: 0 });
    expect(s.perm("burst").isSuspended).toBe(true);
    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 1, byEffectSeat: 0 });
    expect(s.perm("burst").isSuspended).toBe(false);
    s.perm("burst").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 1, byEffectSeat: 0 });
    expect(s.perm("burst").isSuspended).toBe(true);
  });
  it("burst digivolves over Ravemon by returning Keenan and preserves the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-083", as: "base", under: ["BT27-078", "BT27-081"] },
            { card: "BT26-094", as: "keenan" },
          ],
          hand: [{ card: "BT27-085", as: "burst" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT27-085");
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("BT26-094");
    expect(s.perm("base").stack.map((c) => c.cardId)).toEqual(["BT27-078", "BT27-081", "BT27-083"]);
    expect(s.state.memory).toBe(0);
  });

  it("allows declining both activation windows", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT27-085", as: "burst" }] }, 1: { hand: ["BT1-009"] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("burst"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("burst"));
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });
  it("activates Mourning Dance when digivolving and unsuspends from the actual discard", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-085", as: "burst", suspended: true }] },
        1: { hand: ["BT1-009", "BT1-011"], battleArea: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("burst"));
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("burst").isSuspended).toBe(false);
  });
  it("digivolves normally over a green level six without DATA SQUAD", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-082", as: "base" }],
          hand: [{ card: "BT27-085", as: "burst" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT27-085");
    expect(s.state.memory).toBe(5);
  });

  it("rejects a blue level six without DATA SQUAD", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "base" }],
          hand: [{ card: "BT27-085", as: "burst" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("base").topCard.cardId).toBe("BT1-038");
  });
});

describe("Ravemon Burst Mode official rulings", () => {
  it("trashes the top card at the end of the turn it burst digivolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-083", as: "base", under: ["BT27-078", "BT27-081"] },
            { card: "BT26-094", as: "keenan" },
          ],
          hand: [{ card: "BT27-085", as: "burst" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT27-085" && s.state.pendingDecision === undefined);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("base").topCard.cardId).toBe("BT27-083");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT27-078", "BT27-081"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("burst").instanceId);
  });

  it("does not count activating the Option side when digivolving as using an Option card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-085", as: "burst" },
            { card: "BT3-091", as: "lilithmon" },
          ],
        },
        1: { hand: ["BT1-009", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("burst"));
    await settle();

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(5);
  });

  it("lets the opponent trash a security card unseen instead of a hand card", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-085", as: "burst" }] },
        1: {
          hand: [{ card: "BT1-009", as: "handCard" }],
          security: [
            { card: "BT1-010", as: "topSecurity" },
            { card: "BT1-011", as: "bottomSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"], preferInstanceIds },
    );
    await s.ready();
    const securityIds = s.state.players[1]!.security.map((card) => card.instanceId);
    preferInstanceIds.push(securityIds[0]!);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("burst"));
    await settle();

    const choice = s.decisions.find(({ seat, req }) => seat === 1 && req.kind === "selectCards")!;
    expect(choice.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("handCard").instanceId, ...securityIds]),
    );
    const visibleIds = (choice.req.options?.visibleCards ?? []).map((card) => card.instanceId);
    expect(visibleIds).not.toContain(securityIds[0]);
    expect(visibleIds).not.toContain(securityIds[1]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("handCard").instanceId]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([securityIds[1]]);
  });

  it("makes an opponent with an empty hand trash their only security card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-085", as: "burst" }] },
        1: { security: [{ card: "BT1-010", as: "onlySecurity" }], battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("burst"));
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-009"]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("lets BanchoLeomon use it from the hand as a [DATA SQUAD] trait Option card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-053", as: "bancho" },
            { card: "BT27-078", as: "peckmon" },
          ],
          hand: [{ card: "BT27-085", as: "option" }],
        },
        1: { hand: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("bancho").permanentId]);
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(3);
  });

  it("counts as an Option card with [Ravemon] in its text for Keenan Crier", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT27-096",
              as: "keenan",
              under: Array.from({ length: 5 }, () => ({ card: "BT1-010", faceUp: false })),
            },
            { card: "BT27-078", as: "peckmon" },
          ],
          trash: [{ card: "BT27-085", as: "option" }],
        },
        1: { hand: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );
    s.state.memory = 0;
    await s.ready();
    const [mainEffect] = observe(s.engine).activatableEffects(s.perm("keenan")) as Array<{ effectKey: string }>;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("keenan").topCard.instanceId,
        effectKey: mainEffect?.effectKey ?? "missing",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 1 && s.state.pendingDecision === undefined);

    expect(
      s.decisions
        .filter(({ req }) => req.kind === "selectCards")
        .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []),
    ).toContain(s.inst("option").instanceId);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
