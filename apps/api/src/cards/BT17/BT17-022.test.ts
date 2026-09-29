import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-022.js";
import "./index.js";
import "../BT1/BT1-087.js";
import "../BT3/BT3-109.js";
import "../BT5/BT5-104.js";
import "../BT18/BT18-088.js";

describe("BT17-022", () => {
  it("carries the printed catalog fields and routes", () => {
    expect(getCardDefinition("BT17-022")).toMatchObject({
      cardId: "BT17-022",
      nameEn: "Lobomon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      types: ["Warrior"],
    });
    const printed = getCardDefinition("BT17-022")!.effectText!;
    expect(printed).toContain("[Digivolve][Koji Minamoto]: Cost 2");
    expect(printed).toContain("[Digivolve][KendoGarurumon]: Cost 1");
    expect(printed).toContain("digivolve this card from your hand onto one of your yellow Tamers");
    expect(printed).toContain("digivolve into [AncientGarurumon] in the hand for a digivolution cost of 3");
    expect(getCardDefinition("BT17-022")!.inheritedEffectText).toBe(
      "[When Attacking] If you have 7 or fewer cards in your hand, ＜Draw 1＞.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles the static yellow-Tamer digivolve at level 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          asLevel: 3,
          payCost: true,
          target: { count: 1, filter: { kind: ["Tamer"], colors: ["Yellow"] } },
          onto: { filter: { kind: ["Tamer"], colors: ["Yellow"] } },
        },
      ],
    });
  });

  it("compiles the conditional AncientGarurumon slide and its delayed self-delete", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      costOverride: 3,
      ignoreRequirements: true,
      optional: true,
      condition: { kind: "anyOf" },
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "DelayedDelete",
      condition: { kind: "ifThisEffectDigivolved" },
    });
  });

  it("compiles the inherited conditional draw while attacking", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }],
    });
  });

  it("exposes the named routes as exact and the generic yellow-Tamer path as derived", () => {
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT17-023")).toMatchObject({ cost: 1 });
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT17-083")).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT1-087")).toMatchObject({
      cost: 3,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT1-086")).toBeUndefined();
    expect(matchingAlternateDigivolutionRequirement("BT17-022", "BT10-093")).toBeUndefined();
  });

  it("digivolves from a yellow Tamer as a level 3 base and performs the bonus draw (Q2754, Q2756)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "tamer" }],
          hand: [{ card: "BT17-022", as: "lobomon" }],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT17-022");

    expect(s.perm("tamer").topCard?.instanceId).toBe(s.inst("lobomon").instanceId);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("tamer").instanceId]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("digivolves from Koji Minamoto through the exact [Koji Minamoto] route for 2 (Q2755)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-083", as: "koji" }],
          hand: [{ card: "BT17-022", as: "lobomon" }],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koji").permanentId,
        instanceId: s.inst("lobomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT17-022");

    expect(s.state.memory).toBe(4);
    expect(s.perm("koji").stack.map((card) => card.instanceId)).toEqual([s.inst("koji").instanceId]);
  });

  it("slides into AncientGarurumon from KendoGarurumon in its own stack, then self-deletes end of turn (Q2758, Q2759)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo" }],
          hand: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-028", as: "ancient" },
          ],
          deck: [
            { card: "BT1-009", as: "b1" },
            { card: "BT1-010", as: "b2" },
            { card: "BT1-011", as: "b3" },
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
        permanentId: s.perm("kendo").permanentId,
        instanceId: s.inst("lobomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kendo").topCard?.cardId === "BT17-028");

    expect(s.perm("kendo").topCard?.cardId).toBe("BT17-028");
    expect(s.perm("kendo").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT17-023", "BT17-022"]));
    expect(s.state.memory).toBe(2);

    const ancientId = s.perm("kendo").topCard!.instanceId;
    await advance(s.engine).runTurn(0);
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-028"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-028")).toBe(false);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === ancientId)).toBe(true);
  });

  it("slides via the black/purple branch and trashes the whole stack including the Tamer on delete (Q2758)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-087", as: "tamer" },
            { card: "BT10-093", as: "purpleTamer" },
          ],
          hand: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-028", as: "ancient" },
          ],
          deck: [
            { card: "BT1-009", as: "b1" },
            { card: "BT1-010", as: "b2" },
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
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT17-028");

    expect(s.state.memory).toBe(0);

    const ancientId = s.perm("tamer").topCard!.instanceId;
    await advance(s.engine).runTurn(0);
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-028"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-028")).toBe(false);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === ancientId)).toBe(true);
  });

  it("does not offer the slide with neither KendoGarurumon in stack nor a black/purple card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "tamer" }],
          hand: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-028", as: "ancient" },
          ],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT17-022");

    expect(s.perm("tamer").topCard?.cardId).toBe("BT17-022");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ancient").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);

    const lobomonId = s.inst("lobomon").instanceId;
    await advance(s.engine).runTurn(0);
    expect(s.perm("tamer").topCard?.instanceId).toBe(lobomonId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === lobomonId)).toBe(false);
  });

  it("draws 1 as an inherited attacker with 7 or fewer cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "attacker", under: ["BT17-022"] }],
          hand: [{ card: "BT1-009", as: "held" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { security: [{ card: "BT1-011" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("held").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not draw as an inherited attacker with 8 cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "attacker", under: ["BT17-022"] }],
          hand: [
            { card: "BT1-009" },
            { card: "BT1-009" },
            { card: "BT1-009" },
            { card: "BT1-009" },
            { card: "BT1-010" },
            { card: "BT1-010" },
            { card: "BT1-010" },
            { card: "BT1-010" },
          ],
          deck: [{ card: "BT1-011", as: "unseen" }],
        },
        1: { security: [{ card: "BT1-012" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended === true);

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("unseen").instanceId]);
  });
});

describe("BT17-022 Lobomon — KB Q&A rulings", () => {
  const digivolveLobomonOnto = async (s: ReturnType<typeof setupEngine>, baseAlias: string) => {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm(baseAlias).permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm(baseAlias).topCard?.cardId === "BT17-022" && s.state.pendingDecision === undefined);
  };

  it("can't attack the turn it digivolves from a Tamer played that same turn (Q2757)", async () => {
    const fresh = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-087", as: "tamer" },
            { card: "BT17-022", as: "lobomon" },
          ],
          deck: ["BT1-009"],
        },
        1: { security: ["BT3-067"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    fresh.state.memory = 10;
    await fresh.ready();
    expect(fresh.engine.applyIntent(0, { type: "playCard", instanceId: fresh.inst("tamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        fresh.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === fresh.inst("tamer").instanceId) &&
        fresh.state.pendingDecision === undefined,
    );
    await digivolveLobomonOnto(fresh, "tamer");
    expect(fresh.perm("tamer").stack.map((card) => card.instanceId)).toEqual([fresh.inst("tamer").instanceId]);

    expect(
      fresh.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fresh.perm("tamer").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(fresh.perm("tamer").isSuspended).toBe(false);
    expect(fresh.events.some((event) => event.kind === "attackDeclared")).toBe(false);

    const established = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "tamer" }],
          hand: [{ card: "BT17-022", as: "lobomon" }],
          deck: ["BT1-009"],
        },
        1: { security: ["BT3-067"] },
      },
      { autoDeclineOptional: true },
    );
    established.state.memory = 6;
    await established.ready();
    await digivolveLobomonOnto(established, "tamer");
    expect(
      established.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: established.perm("tamer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it.fails("does not delete the Tamer left behind when the slid AncientGarurumon is de-digivolved back to it (Q2760)", async () => {
    const slideAttackAndEndTurn = async (securityCardId: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-087", as: "tamer" },
              { card: "BT10-093", as: "purpleTamer" },
            ],
            // Eight cards in hand after the bonus draws keep Lobomon's inherited draw from
            // firing, so AncientGarurumon's hand-add effect never bounces the top security card.
            hand: [
              { card: "BT17-022", as: "lobomon" },
              { card: "BT17-028", as: "ancient" },
              ...Array.from({ length: 6 }, () => "BT3-067"),
            ],
            deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          },
          1: { security: [securityCardId, "BT3-067", "BT3-067"], deck: ["BT1-009", "BT1-009"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
      );
      s.state.memory = 10;
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);

      await digivolveLobomonOnto(s, "tamer");
      await settle(() => s.perm("tamer").topCard?.cardId === "BT17-028" && s.state.pendingDecision === undefined);
      expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-087", "BT17-022"]);

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("tamer").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();

      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      await settle();
      return s;
    };

    const deDigivolved = await slideAttackAndEndTurn("BT5-104");
    const tamerInstanceId = deDigivolved.inst("tamer").instanceId;
    const tamerPermanent = deDigivolved.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === tamerInstanceId,
    );
    expect(tamerPermanent?.stack).toHaveLength(0);
    expect(deDigivolved.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT1-087");

    const stillDigimon = await slideAttackAndEndTurn("BT3-067");
    expect(stillDigimon.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-028")).toBe(false);
    expect(stillDigimon.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT17-028");
  });

  it("Back for Revenge! played on the Digimon plays AncientGarurumon after the slide's end-of-turn deletion (Q2761)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-023", as: "kendo" },
            { card: "BT3-076", as: "established" },
          ],
          hand: [
            { card: "BT3-109", as: "revenge" },
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-028", as: "ancient" },
          ],
          deck: ["BT3-067", "BT3-067", "BT3-067"],
        },
        1: { security: ["BT3-067", "BT3-067"], deck: ["BT3-067"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("kendo").topCard.instanceId);
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revenge").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-109"));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kendo").permanentId,
        instanceId: s.inst("lobomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kendo").topCard.cardId === "BT17-028" && s.state.pendingDecision === undefined);
    const slidPermanentId = s.perm("kendo").permanentId;

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== slidPermanentId));

    const replayed = s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId !== "BT3-076");
    expect(replayed.map((permanent) => permanent.topCard.instanceId)).toEqual([s.inst("ancient").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT17-022");
  });

  it.fails("does not delete AncientGarurumon when the slide happens during the end-of-turn attack (Q2762)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo", under: ["BT18-088"] }],
          hand: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-028", as: "ancient" },
          ],
          deck: ["BT3-067", "BT3-067", "BT3-067", "BT3-067", "BT3-067"],
        },
        1: { security: ["BT3-067", "BT3-067", "BT3-067"], deck: ["BT3-067", "BT3-067"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("lobomon").instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.events.some((event) => event.kind === "turnEnded" && event.endingSeat === 0)).toBe(true);
    expect(s.events.some((event) => event.kind === "digivolved" && event.cardId === "BT17-028")).toBe(true);
    const slid = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("ancient").instanceId);
    expect(slid?.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT18-088", "BT17-023", "BT17-022"]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT17-028");
  });

  it("can't back out of the Tamer digivolution once declared, and can't declare it without a valid Tamer (Q4659)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-087", as: "yellowTamer" },
            { card: "BT1-086", as: "blueTamer" },
          ],
          hand: [{ card: "BT17-022", as: "lobomon" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("lobomon").instanceId);
    expect(s.state.memory).toBe(6);

    await digivolveLobomonOnto(s, "yellowTamer");
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);
    expect(s.perm("yellowTamer").topCard?.instanceId).toBe(s.inst("lobomon").instanceId);
    expect(s.perm("blueTamer").topCard?.cardId).toBe("BT1-086");
    expect(s.state.memory).toBe(3);
  });

  it("does not gain the [Security] effect printed in the lower text of a Tamer in its digivolution cards (Q6564)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-022", as: "lobomon", under: [{ card: "BT1-087", as: "stackedTamer" }] }],
          security: [{ card: "BT1-087", as: "securityTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("lobomon"));
    await settle();
    expect(s.perm("lobomon").stack.map((card) => card.instanceId)).toEqual([s.inst("stackedTamer").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toContain(
      s.inst("securityTamer").instanceId,
    );
  });

  it("gains the inherited effect printed in the lower text of a Tamer in its digivolution cards (Q6565)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-022", as: "withTamer", under: [{ card: "BT17-079", as: "stackedTamer" }] },
          { card: "BT17-022", as: "withoutTamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();

    expect(s.perm("withTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("stackedTamer").instanceId]);
    expect(s.perm("withTamer").currentDP).toBe(7000);
    expect(s.perm("withoutTamer").currentDP).toBe(5000);

    const opponentTurn = setupEngine({
      0: {
        battleArea: [{ card: "BT17-022", as: "withTamer", under: [{ card: "BT17-079", as: "stackedTamer" }] }],
      },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();

    expect(opponentTurn.perm("withTamer").currentDP).toBe(5000);
  });
});
