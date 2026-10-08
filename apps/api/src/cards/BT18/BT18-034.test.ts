/* oxlint-disable vitest/no-conditional-expect -- Table inputs select fixed contracts; branches never depend on observed game state. */
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-034.js";

describe("BT18-034 Lucemon", () => {
  it.each(["On Play", "Start of Main"])(
    "GitHub #5312 still offers decline with exactly one hand card at %s",
    async (timing) => {
      const s = setupEngine({
        0: {
          hand: [
            ...(timing === "On Play" ? [{ card: "BT18-034", as: "lucemon" }] : []),
            { card: "BT1-009", as: "cost" },
          ],
          battleArea: timing === "Start of Main" ? [{ card: "BT18-034", as: "lucemon" }] : [],
          eggDeck: ["BT1-001"],
          deck: ["BT1-010"],
          security: ["BT1-011"],
        },
        1: { security: ["BT1-012"] },
      });
      s.state.memory = 10;
      await s.ready();
      s.state.isFirstPlayersFirstTurn = true;
      if (timing === "On Play") {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
          ok: true,
        });
      } else {
        s.engine.startTurnLoop();
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
      }
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("cost").instanceId);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.decisions.some(({ seat }) => seat === 1)).toBe(false);
      assertNoLoudGap(s);
    },
  );

  it("GitHub #5312 cannot resolve the security/recovery clause without a payable hand cost", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT18-034", as: "lucemon" }], deck: ["BT1-010"], security: ["BT1-011"] },
      1: { security: ["BT1-012"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("GitHub #5312 Start of Main cannot resolve rewards with zero cards in hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-034", as: "lucemon" }], deck: ["BT1-010"], security: ["BT1-011"] },
      1: { security: ["BT1-012"] },
    });
    s.state.isFirstPlayersFirstTurn = true;
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.decisions.some(({ seat, req }) => seat === 1 || req.kind === "selectCards")).toBe(false);
    assertNoLoudGap(s);
  });

  it.each(["On Play", "Start of Main"])(
    "GitHub #5312 allows declining the %s hand-trash condition without resolving its rewards",
    async (timing) => {
      const s = setupEngine({
        0: {
          hand: [
            ...(timing === "On Play" ? [{ card: "BT18-034", as: "lucemon" }] : []),
            { card: "BT1-009", as: "cost" },
            { card: "BT1-013", as: "otherCost" },
          ],
          battleArea: timing === "Start of Main" ? [{ card: "BT18-034", as: "lucemon" }] : [],
          eggDeck: ["BT1-001"],
          deck: ["BT1-014", { card: "BT1-010", as: "recovery" }],
          security: ["BT1-011"],
        },
        1: { security: ["BT1-012"] },
      });
      s.state.memory = 10;
      s.state.isFirstPlayersFirstTurn = true;
      await s.ready();
      if (timing === "On Play") {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
          ok: true,
        });
      } else {
        s.engine.startTurnLoop();
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
      }
      await settle(() => s.state.pendingDecision !== undefined);
      expect(s.state.pendingDecision?.kind).toBe("selectCards");
      const request = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }),
      ).toEqual({ ok: true });
      expect(request.options?.min).toBe(0);
      expect(request.options?.max).toBe(1);
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("otherCost").instanceId);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("recovery").instanceId);
      expect(s.decisions.some(({ seat }) => seat === 1)).toBe(false);
      assertNoLoudGap(s);
    },
  );

  it.each(
    ["On Play", "Start of Main"].flatMap((timing) =>
      [1, 2].flatMap((handCount) => [false, true].map((opponentAccepts) => ({ timing, handCount, opponentAccepts }))),
    ),
  )(
    "GitHub #5312 pays exactly one of $handCount hand cards at $timing and opponent accept=$opponentAccepts",
    async ({ timing, handCount, opponentAccepts }) => {
      const s = setupEngine({
        0: {
          hand: [
            ...(timing === "On Play" ? [{ card: "BT18-034", as: "lucemon" }] : []),
            { card: "BT1-009", as: "cost" },
            ...(handCount === 2 ? [{ card: "BT1-013", as: "otherCost" }] : []),
          ],
          battleArea: timing === "Start of Main" ? [{ card: "BT18-034", as: "lucemon" }] : [],
          eggDeck: ["BT1-001"],
          deck: [{ card: "BT1-010", as: "recovery" }],
          security: ["BT1-011"],
        },
        1: { security: [{ card: "BT1-012", as: "opponentTop" }] },
      });
      s.state.memory = 10;
      s.state.isFirstPlayersFirstTurn = true;
      await s.ready();
      if (timing === "On Play") {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
          ok: true,
        });
      } else {
        s.engine.startTurnLoop();
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
      }
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const ownRequest = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!;
      expect(ownRequest.seat).toBe(0);
      expect(ownRequest.req.options?.candidateInstanceIds).toHaveLength(handCount);
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: ownRequest.req.decisionId,
          response: { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] },
        }).ok,
      ).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: ownRequest.req.decisionId,
          response: { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const opponentRequest = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!;
      expect(opponentRequest.seat).toBe(1);
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: opponentRequest.req.decisionId,
          response: { kind: "optional", accept: opponentAccepts },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.security).toHaveLength(opponentAccepts ? 1 : 2);
      expect(s.state.players[1]!.security).toHaveLength(opponentAccepts ? 0 : 1);
      if (opponentAccepts) {
        expect(s.state.players[1]!.trash[0]!.instanceId).toBe(s.inst("opponentTop").instanceId);
        expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("recovery").instanceId);
      } else {
        expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovery").instanceId);
      }
      if (handCount === 2) expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("otherCost").instanceId);
      assertNoLoudGap(s);
    },
  );

  it.each(["On Play", "Start of Main"])(
    "GitHub #5312 %s pays the cost and recovers even with no opponent security",
    async (timing) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            hand: [
              ...(timing === "On Play" ? [{ card: "BT18-034", as: "lucemon" }] : []),
              { card: "BT1-009", as: "cost" },
            ],
            battleArea: timing === "Start of Main" ? [{ card: "BT18-034", as: "lucemon" }] : [],
            deck: [{ card: "BT1-010", as: "recovery" }],
            security: ["BT1-011"],
          },
          1: { security: [] },
        },
        { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("cost").instanceId);
      s.state.memory = 10;
      s.state.isFirstPlayersFirstTurn = true;
      await s.ready();
      if (timing === "On Play") {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.state.players[0]!.security.length === 2 && s.state.pendingDecision === undefined);
      } else {
        await advance(s.engine).runTurn(0);
      }
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
      expect(s.state.players[0]!.security).toHaveLength(2);
      expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovery").instanceId);
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    },
  );

  it("keeps the alternate digivolution requirement and the Q4999 exclusion visible in the compiled IR", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Cupimon"], cost: 5, isAlternate: true }]);
    expect(compiled.effects[2]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: false,
          ignoreRequirements: false,
          optional: true,
          cost: { kind: "placeAsSecurity", destination: "security", position: "top" },
          into: { excludeCardIds: ["BT7-111"] },
        },
      ],
    });
  });

  it("trashes the hand cost, lets the opponent trash security, and recovers when they decline", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-034", as: "lucemon" },
            { card: "BT1-009", as: "cost" },
          ],
          deck: ["BT1-009"],
          security: ["BT1-010"],
        },
        1: { security: ["BT1-010"] },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        declinePrompts: ["Trash 1 of opponent"],
        preferInstanceIds: preferred,
      },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => s.state.players[0]!.security.length === 2 && s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-009");
    assertNoLoudGap(s);
  });

  it("recovers the exact deck card when the opponent has no security to trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-034", as: "lucemon" },
            { card: "BT1-009", as: "cost" },
          ],
          deck: ["BT1-009"],
          security: ["BT1-010"],
        },
        1: { security: [] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId),
    );
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT1-009"));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not recover when the opponent accepts and trashes their top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-034", as: "lucemon" }],
          hand: [{ card: "BT1-009", as: "handCost" }],
          deck: [{ card: "BT1-010", as: "recoveryCard" }],
          security: ["BT1-011"],
        },
        1: { security: [{ card: "BT1-012", as: "opponentTopSecurity" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("handCost").instanceId)).toBe(true);
    expect(
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("opponentTopSecurity").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck.some(({ instanceId }) => instanceId === s.inst("recoveryCard").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("places a level 6 Digimon on top of security to digivolve into a legal Chaos Mode from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-034", as: "lucemon" },
            { card: "BT1-063", as: "levelSixCost" },
          ],
          trash: [{ card: "BT18-082", as: "chaosMode" }],
          security: [{ card: "BT1-009", as: "oldTopSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.perm("lucemon").topCard?.instanceId).toBe(s.inst("chaosMode").instanceId);
    expect(s.perm("lucemon").stack.map(({ cardId }) => cardId)).toEqual(["BT18-034"]);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("levelSixCost").instanceId);
    expect(s.state.players[0]!.security[1]!.instanceId).toBe(s.inst("oldTopSecurity").instanceId);
    expect(s.state.memory).toBe(-3);
    assertNoLoudGap(s);
  });

  it("rejects BT7-111 under Q4999, but may still pay the level 6 security cost (CR 15-7-5)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-034", as: "lucemon" },
            { card: "BT1-063", as: "levelSixCost" },
          ],
          trash: [{ card: "BT7-111", as: "illegalChaosMode" }],
          security: [{ card: "BT1-009", as: "oldTopSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.perm("lucemon").topCard?.cardId).toBe("BT18-034");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT18-034"]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("levelSixCost").instanceId,
      s.inst("oldTopSecurity").instanceId,
    ]);
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("illegalChaosMode").instanceId),
    ).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("BT18-034 Lucemon — KB Q&A rulings", () => {
  it("gains Recovery +1 when the opponent does not trash their top security, even though the hand card was trashed (Q2956)", async () => {
    async function playLucemon(opponentTrashesSecurity: boolean) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT18-034", as: "lucemon" },
              { card: "BT1-009", as: "handCost" },
            ],
            deck: [{ card: "BT1-010", as: "recoveryCard" }],
            security: ["BT1-011"],
          },
          1: { security: [{ card: "BT1-012", as: "opponentTopSecurity" }] },
        },
        opponentTrashesSecurity
          ? { autoSelectCards: true, autoAcceptOptional: true }
          : { autoSelectCards: true, autoAcceptOptional: true, declinePrompts: ["Trash 1 of opponent"] },
      );
      s.state.memory = 10;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.decisions.some(({ seat, req }) => seat === 1 && req.kind === "optional"));
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("handCost").instanceId]);
      return s;
    }

    const declined = await playLucemon(false);
    expect(declined.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
      declined.inst("opponentTopSecurity").instanceId,
    ]);
    expect(declined.state.players[0]!.security).toHaveLength(2);
    expect(declined.state.players[0]!.security[0]!.instanceId).toBe(declined.inst("recoveryCard").instanceId);

    const accepted = await playLucemon(true);
    expect(accepted.state.players[1]!.security).toHaveLength(0);
    expect(accepted.state.players[0]!.security).toHaveLength(1);
    expect(accepted.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      accepted.inst("recoveryCard").instanceId,
    ]);
  });
});
