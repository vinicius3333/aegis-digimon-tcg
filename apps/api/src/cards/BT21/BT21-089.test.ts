import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-089.js";
import "../index.js";

describe("BT21-089 Takato Matsuki", () => {
  it("binds one qualifying Digimon so Blocker and conditional DP share the target", () => {
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"]) {
      const watcher = allTurns?.actions.find((action) => (action as { event?: string }).event === event) as
        | { actions?: unknown[] }
        | undefined;
      expect(watcher).toBeDefined();
      expect(watcher).toMatchObject({ sourceFilter: { controller: "mine", kind: ["Digimon"] } });
      const actions = watcher?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        cost: { kind: "suspend" },
        optional: true,
        abortOnDecline: true,
      });
      expect(actions[1]).toMatchObject({
        kind: "ModifyDP",
        target: { sameTarget: true },
        amount: 2000,
        condition: { kind: "combinedTrashCount", op: "gte", value: 10 },
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["without an opposing Digimon", false, 0],
    ["with an opposing Digimon", true, 1],
  ])("start of main %s gains %i memory", async (_label, hasOpponent, expectedGain) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-089", as: "takato" }] },
      1: hasOpponent ? { battleArea: [{ card: "BT1-009", as: "opponent" }] } : {},
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("takato"));
    expect(s.state.memory).toBe(expectedGain);
  });

  it.each(["whenPlayed", "whenOneOfYoursDigivolves"] as const)(
    "%s suspends Takato and gives the selected Hero Blocker and +2000 DP at 10 total trash",
    async (event) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT21-089", as: "takato" },
              { card: "BT21-064", as: "hero", dp: 3000 },
            ],
            trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          },
          1: { trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await advance(s.engine).fireSubTrigger(event, { subjectPermanentId: s.perm("hero").permanentId });
      await settle(() => s.perm("hero").currentDP === 5000);

      expect(s.perm("takato").isSuspended).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("hero"), "Blocker")).toBe(true);
      expect(s.perm("hero").currentDP).toBe(5000);
    },
  );

  it("naturally triggers the when-played watcher from a qualifying Digimon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-089", as: "takato" }],
          hand: [{ card: "BT21-064", as: "hero" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hero").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("takato").isSuspended && observe(s.engine).hasKeyword(s.perm("hero"), "Blocker"));

    expect(s.perm("takato").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("hero"), "Blocker")).toBe(true);
  });

  it("naturally triggers the digivolve watcher from a legal qualifying evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-089", as: "takato" },
            { card: "BT21-032", as: "base" },
          ],
          hand: [{ card: "BT21-036", as: "hero" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hero").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takato").isSuspended && observe(s.engine).hasKeyword(s.perm("base"), "Blocker"));

    expect(s.perm("takato").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    // Veemon reduces the printed alternate cost 3 by 1.
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").currentDP).toBe(9000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT21-032"]);
  });

  it("expires the public Blocker and DP grant after the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-089", as: "takato" }],
          hand: [{ card: "BT21-064", as: "hero" }],
          trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hero").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("takato").isSuspended && observe(s.engine).hasKeyword(s.perm("hero"), "Blocker"));
    expect(s.perm("hero").currentDP).toBe(3000);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("hero"), "Blocker")).toBe(true);
    expect(s.perm("hero").currentDP).toBe(3000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(observe(s.engine).hasKeyword(s.perm("hero"), "Blocker")).toBe(false);
    expect(s.perm("hero").currentDP).toBe(1000);
  });

  it("at 9 total trash grants Blocker but not the conditional +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-089", as: "takato" },
            { card: "BT21-064", as: "hero", dp: 3000 },
          ],
          trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
        1: { trash: Array.from({ length: 4 }, () => "BT1-001") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("hero").permanentId });
    await settle(() => s.perm("takato").isSuspended);
    expect(observe(s.engine).hasKeyword(s.perm("hero"), "Blocker")).toBe(true);
    expect(s.perm("hero").currentDP).toBe(3000);
  });

  it("accepts any own Digimon as the event subject, while declining pays no cost", async () => {
    for (const decline of [false, true]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT21-089", as: "takato" },
              { card: "BT21-064", as: "hero", dp: 3000 },
              { card: "BT1-009", as: "nonmatching" },
            ],
          },
        },
        decline
          ? { autoDeclineOptional: true, autoSelectCards: true }
          : { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await advance(s.engine).fireSubTrigger("whenPlayed", {
        subjectPermanentId: s.perm(decline ? "hero" : "nonmatching").permanentId,
      });
      expect(s.perm("takato").isSuspended).toBe(!decline);
    }
  });

  it("plays itself from Security without paying cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-032", as: "attacker", dp: 2000 }] },
      1: { security: [{ card: "BT21-089", as: "takato" }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("takato").instanceId),
    );
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(0);
    expect(
      s.events.some(
        (event) => event.kind === "attackDeclared" && event.attackerPermanentId === s.perm("takato").permanentId,
      ),
    ).toBe(false);
  });
});
