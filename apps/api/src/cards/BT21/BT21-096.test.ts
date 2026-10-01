import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-096.js";
import "../index.js";

describe("BT21-096 The Champion Ultimate Fighter!", () => {
  it("turns a Marcus Damon into a 12000 DP Rush Digimon and starts its Digimon attack", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "color" },
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== targetId),
    );

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("marcus"))).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("targets the chosen Marcus permanent and carries the temporary Digimon grants", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      { kind: "SelectBind", target: { bindAs: "chosenMarcus" } },
      { kind: "GrantStatic", grant: "kind", tokens: ["Digimon"], staticEffect: { value: 12000 } },
      { kind: "Restrict", restriction: "digivolve" },
      { kind: "GainKeyword", keyword: { keyword: "Rush" } },
      { kind: "GrantCanAttackUnsuspended" },
      { kind: "Attack", attackPlayer: false, optional: true },
    ]);
  });

  it("retains the temporary Digimon treatment when no opponent Digimon is eligible", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "color" },
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").currentDP === 12000);
    expect(s.perm("marcus").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
  });

  it("publicly declines the optional attack against an unsuspended opponent Digimon", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT4-092", as: "marcus" },
            { card: "BT2-033", as: "yellow" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("opponentTarget").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT21-096"));
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.state.memory).toBe(6);
    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(s.perm("marcus").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("marcus"))).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("expires every temporary Marcus property after the activating turn ends", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "color" },
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
          security: ["BT1-004"],
        },
        1: { deck: ["BT1-005", "BT1-006", "BT1-007"], security: ["BT1-008"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").currentDP === 12000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("marcus"))).toBe(true);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("marcus").currentDP).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(false);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("marcus"))).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("Security plays Marcus from trash for free, then adds itself to hand", async () => {
    const s = setup(
      {
        0: {
          security: [{ card: "BT21-096", as: "option" }],
          trash: [{ card: "BT4-092", as: "marcus" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("marcus").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("Security also plays an eligible Marcus from hand and returns the Option", async () => {
    const s = setup(
      {
        0: {
          security: [{ card: "BT21-096", as: "option" }],
          hand: [{ card: "BT4-092", as: "marcus" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("marcus").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT21-096 The Champion Ultimate Fighter! — KB Q&A rulings", () => {
  it("lets the Marcus Digimon attack like a Digimon and use inherited effects from its stack (Q4615)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus", under: ["BT1-015"] },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: { security: 2 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const attackPlayer = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      });

    expect(s.perm("marcus").currentDP).toBe(0);
    expect(attackPlayer().ok).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.perm("marcus").currentDP).toBe(14000);

    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("keeps the Marcus Digimon a Tamer, so another copy can choose it again (Q4616)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [
            { card: "BT21-096", as: "first" },
            { card: "BT21-096", as: "second" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const attackOffers = (instanceId: string) =>
      s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceInstanceId === instanceId);

    for (const alias of ["first", "second"]) {
      const instanceId = s.inst(alias).instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === instanceId));
    }

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(attackOffers(s.inst("first").instanceId)).toHaveLength(1);
    expect(attackOffers(s.inst("second").instanceId)).toHaveLength(1);
    expect(s.state.memory).toBe(2);
  });

  it("treats the Marcus Digimon's activated effect as both a Tamer effect and a Digimon effect (Q4617)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "greymon" },
            { card: "BT2-033", as: "yellow" },
            { card: "BT13-095", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT19-064", as: "justimon" },
            { card: "BT18-059", as: "zenimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("justimon").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    // Justimon's [On Play] makes it immune to its opponent's Digimon effects until the end of this turn.
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("justimon"));
    expect(observe(s.engine).isRestrictedByEffect(s.perm("justimon"), "beAffected", "Digimon")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
    expect(s.perm("justimon").currentDP).toBe(11000);
  });

  it("deletes the Marcus Digimon at the rule check when its DP becomes 0 (Q4618)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT2-033", as: "yellow" },
            { card: "BT1-009", as: "control" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [
            { card: "BT21-096", as: "option" },
            { card: "BT1-010", as: "trigger" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const marcusId = s.perm("marcus").permanentId;
    const controlId = s.perm("control").permanentId;
    const onBattleArea = (permanentId: string) =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId);

    expect(s.perm("marcus").currentDP).toBe(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").currentDP === 12000);

    // No printed card lowers your own Digimon's DP during your turn, so the DP drop comes from the production verb.
    await advance(s.engine).verb.modifyDP(marcusId, -12000, EffectDuration.UntilEachTurnEnd);
    await advance(s.engine).verb.modifyDP(controlId, -3000, EffectDuration.UntilEachTurnEnd);
    expect(s.perm("marcus").currentDP).toBe(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !onBattleArea(controlId));

    expect(onBattleArea(controlId)).toBe(false);
    expect(onBattleArea(marcusId)).toBe(false);
  });

  it("lets the chosen Marcus Digimon attack an opponent's Digimon with the Then clause (Q4619)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const marcusId = s.perm("marcus").permanentId;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());

    expect(
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          event.attackerPermanentId === marcusId &&
          event.target.kind === "permanent" &&
          event.target.permanentId === targetId,
      ),
    ).toBe(true);
    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });

  it("lets the player decline the Then attack and keeps the Digimon treatment (Q4620)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    const attackOffer = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.sourceInstanceId === s.inst("option").instanceId,
    );
    expect(attackOffer).toBeDefined();
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.perm("marcus").isSuspended).toBe(false);
    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("overwrites the Digimon DP with the newest treated-as-Digimon effect and adds its <Rush> (Q6022)", async () => {
    const becomeDigimonKey = "BT13-008/become-digimon";
    const setupMarcusWithAgumon = async () => {
      const s = setup(
        {
          0: {
            battleArea: [
              { card: "BT2-033", as: "yellow" },
              { card: "BT13-008", as: "agumon" },
              { card: "BT4-092", as: "marcus" },
            ],
            hand: [{ card: "BT21-096", as: "option" }],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      return s;
    };
    type Scenario = Awaited<ReturnType<typeof setupMarcusWithAgumon>>;
    const activateAgumon = async (s: Scenario) => {
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.perm("agumon").topCard.instanceId,
          effectKey: becomeDigimonKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("marcus").currentDP === 3000);
    };
    const playOption = async (s: Scenario) => {
      const instanceId = s.inst("option").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === instanceId));
    };

    const agumonFirst = await setupMarcusWithAgumon();
    await activateAgumon(agumonFirst);
    expect(observe(agumonFirst.engine).hasKeyword(agumonFirst.perm("marcus"), "Rush")).toBe(false);
    await playOption(agumonFirst);
    expect(agumonFirst.perm("marcus").currentDP).toBe(12000);
    expect(observe(agumonFirst.engine).hasKeyword(agumonFirst.perm("marcus"), "Rush")).toBe(true);
    expect(observe(agumonFirst.engine).isRestricted(agumonFirst.perm("marcus"), "digivolve")).toBe(true);

    const optionFirst = await setupMarcusWithAgumon();
    await playOption(optionFirst);
    expect(optionFirst.perm("marcus").currentDP).toBe(12000);
    await activateAgumon(optionFirst);
    expect(optionFirst.perm("marcus").currentDP).toBe(3000);
    expect(observe(optionFirst.engine).hasKeyword(optionFirst.perm("marcus"), "Rush")).toBe(true);
    expect(observe(optionFirst.engine).isRestricted(optionFirst.perm("marcus"), "digivolve")).toBe(true);
  });

  it("gains memory from the Marcus Digimon's effect while the opponent only allows Tamer-effect memory gain (Q6023)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "greymon" },
            { card: "BT2-033", as: "yellow" },
            { card: "BT13-095", as: "marcus" },
            { card: "BT4-057", as: "grapLeomon" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "opponentGreymon" },
            { card: "BT1-009", as: "suspendedTarget", suspended: true },
            { card: "BT18-059", as: "zenimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("opponentGreymon").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    const combatFinished = (count: number) =>
      s.events.filter((event) => event.kind === "combatResolved").length === count && !observe(s.engine).isAttacking();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("grapLeomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("suspendedTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => combatFinished(1));
    expect(s.state.memory).toBe(10);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => combatFinished(2));

    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("does not affect an opponent's Digimon that is immune to Digimon effects with the Marcus Digimon's effect (Q6024)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "greymon" },
            { card: "BT2-033", as: "yellow" },
            { card: "BT13-095", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT19-064", as: "justimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("justimon").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    // Justimon's [On Play] makes it immune to its opponent's Digimon effects until the end of this turn.
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("justimon"));
    expect(observe(s.engine).isRestrictedByEffect(s.perm("justimon"), "beAffected", "Digimon")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
    expect(s.perm("justimon").currentDP).toBe(11000);
  });
});
