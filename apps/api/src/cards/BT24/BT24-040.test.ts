import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_040 } from "./BT24-040.js";
import "../index.js";

describe("BT24-040 Venusmon", () => {
  it("matches the immutable catalog identity and evolution routes", () => {
    expect(getCardDefinition("BT24-040")).toMatchObject({
      cardId: "BT24-040",
      nameEn: "Venusmon",
      colors: ["Yellow", "Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Shaman", "Olympos XII", "Iliad", "TS"],
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Blue", level: 5, memoryCost: 4 },
      ],
    });
    expect(BT24_040.digivolutionRequirement).toEqual([{ level: 5, traits: ["TS"], cost: 3, isAlternate: true }]);
  });

  it("trashes one opponent stack and applies the two shared restrictions", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_040.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: "all",
        target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
      });
      expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
      expect(actions[2]).toMatchObject({
        kind: "Restrict",
        restriction: "cannotActivateWhenDigivolving",
        duration: "untilOpponentTurnEnd",
        target: { sameTarget: true },
      });
    }
  });
  it("uses the other no-stack Digimon as a bottom-security replacement", () => {
    const inherited = BT24_040.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(inherited).toMatchObject({ frequency: "OncePerTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      mode: "prevent",
      leaveCause: "otherThanYourEffect",
      affectsAll: true,
      target: { count: 10000, upTo: true },
      cost: {
        kind: "place",
        targetIsPermanent: true,
        destination: "security",
        position: "bottom",
        target: { filter: { excludeLeavingSubject: true, digivolutionCards: "none" } },
      },
    });
  });

  it("reduces its actual play cost by 5 at 3 security but not at 4", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: "BT24-040", as: "venusmon" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    reduced.state.memory = 10;
    await reduced.ready();
    expect(
      reduced.engine.applyIntent(0, {
        type: "playCard",
        instanceId: reduced.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-040"),
    );
    expect(reduced.state.memory).toBe(3);

    const full = setupEngine({
      0: {
        hand: [{ card: "BT24-040", as: "venusmon" }],
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    full.state.memory = 10;
    await full.ready();
    expect(
      full.engine.applyIntent(0, {
        type: "playCard",
        instanceId: full.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => full.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-040"));
    expect(full.state.memory).toBe(-2);
  });

  it("trashes one full stack and applies both restrictions to the same two permanents", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-040", as: "venusmon" }] },
        1: {
          battleArea: [
            { card: "BT24-030", as: "stacked", under: ["BT24-029", "BT24-027"] },
            { card: "BT24-083", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.perm("stacked").topCard.instanceId,
      s.perm("stacked").topCard.instanceId,
      s.perm("tamer").topCard.instanceId,
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("venusmon"));

    expect(s.perm("stacked").stack).toHaveLength(0);
    for (const permanent of [s.perm("stacked"), s.perm("tamer")]) {
      expect(observe(s.engine).isRestricted(permanent, "suspend")).toBe(true);
      expect(observe(s.engine).isRestricted(permanent, "cannotActivateWhenDigivolving")).toBe(true);
    }
  });

  it("resolves both entry clauses from a public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-040", as: "venusmon" }] },
        1: {
          battleArea: [
            { card: "BT24-030", as: "stacked", under: ["BT24-029", "BT24-027"] },
            { card: "BT24-083", as: "tamer" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("venusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-040"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-040")).toBe(true);
    expect(s.perm("stacked").stack).toHaveLength(0);
    for (const permanent of [s.perm("stacked"), s.perm("tamer")]) {
      expect(observe(s.engine).isRestricted(permanent, "suspend")).toBe(true);
      expect(observe(s.engine).isRestricted(permanent, "cannotActivateWhenDigivolving")).toBe(true);
    }
  });

  it("resolves both entry clauses from a public When Digivolving intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-039", as: "base" }], hand: [{ card: "BT24-040", as: "venusmon" }] },
        1: {
          battleArea: [
            { card: "BT24-030", as: "stacked", under: ["BT24-029", "BT24-027"] },
            { card: "BT24-083", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("venusmon").instanceId);
    expect(s.perm("stacked").stack).toHaveLength(0);
    for (const permanent of [s.perm("stacked"), s.perm("tamer")]) {
      expect(observe(s.engine).isRestricted(permanent, "suspend")).toBe(true);
      expect(observe(s.engine).isRestricted(permanent, "cannotActivateWhenDigivolving")).toBe(true);
    }
  });

  it("blocks a public opponent When Digivolving effect (Q5622)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "ownNeutral" }],
          hand: [{ card: "BT24-040", as: "venusmon" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-031", as: "base" },
            { card: "BT1-009", as: "other" },
          ],
          hand: [
            { card: "BT24-046", as: "garurumon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [{ card: "BT1-013", as: "bonusDraw" }, "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownNeutralId = s.perm("ownNeutral").permanentId;
    const baseId = s.perm("base").permanentId;
    const venusmonId = s.inst("venusmon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: venusmonId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === venusmonId),
    );
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cannotActivateWhenDigivolving")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: baseId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT24-046"));
    await advance(s.engine).waitForMainPhase(1);

    const evolutionMemory = s.state.memory;
    expect(evolutionMemory).toBe(7);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("garurumon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.perm("ownNeutral").permanentId).toBe(ownNeutralId);
    expect(s.perm("ownNeutral").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.isSuspended === false)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("expires entry restrictions at the end of the opponent's turn", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT24-040", as: "venusmon" }] },
      1: {
        battleArea: [
          { card: "BT24-030", as: "stacked", under: ["BT24-029"] },
          { card: "BT24-083", as: "tamer" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("venusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-040"));
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "cannotActivateWhenDigivolving")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("does not suppress the restricted card's When Attacking timing (Q5622-Q5626)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-040", as: "venusmon" }],
        hand: [{ card: "BT1-009", as: "moved" }],
        security: [{ card: "BT1-010", as: "trashed" }],
      },
      1: { battleArea: [{ card: "BT24-016", as: "lamiamon" }] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("venusmon"));
    expect(observe(s.engine).isRestricted(s.perm("lamiamon"), "cannotActivateWhenDigivolving")).toBe(true);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lamiamon"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("lamiamon"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("moved").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashed").instanceId);
  });

  it("pays once to protect all simultaneously leaving TS Digimon (Q5621)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-040", as: "venusmon" },
            { card: "BT24-034", as: "first", dp: 5000 },
            { card: "BT24-034", as: "second", dp: 5000 },
            { card: "BT1-020", as: "cost", dp: 10000 },
          ],
          security: [{ card: "BT1-012", as: "initialSecurity" }],
        },
        1: {
          battleArea: [{ card: "BT6-007", as: "colorSource" }],
          hand: [{ card: "BT6-095", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost").permanentId);
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([
        s.perm("venusmon").permanentId,
        s.perm("first").permanentId,
        s.perm("second").permanentId,
      ]),
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("initialSecurity").instanceId,
      s.inst("cost").instanceId,
    ]);
    expect(s.state.players[0]!.security.every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("may use Venusmon itself as the other no-source cost when another TS Digimon leaves (Q5781)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-040", as: "venusmon" },
            { card: "BT24-034", as: "leaving" },
          ],
        },
        1: {
          battleArea: [{ card: "BT6-007", as: "colorSource" }],
          hand: [{ card: "BT6-095", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const venusmonId = s.perm("venusmon").permanentId;
    const venusmonCardId = s.inst("venusmon").instanceId;
    const leavingId = s.perm("leaving").permanentId;
    const optionId = s.inst("option").instanceId;
    preferred.push(venusmonId);
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === venusmonCardId));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(leavingId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(venusmonId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([venusmonCardId]);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.memory).toBe(0);
  });

  it("allows a different simultaneously leaving Digimon to pay the cost (Q5781)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-040", as: "venusmon", under: ["BT24-033"] },
            { card: "BT24-034", as: "first" },
            { card: "BT24-035", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("second").permanentId);
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("first").permanentId, s.perm("second").permanentId],
        "byEffect",
      ),
    ).toBe(0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("first").permanentId,
    );
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("second").instanceId);
  });

  it("may refuse the All Turns replacement and lets the TS Digimon leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-040", as: "venusmon" },
            { card: "BT24-034", as: "leaving" },
          ],
          security: [{ card: "BT1-012", as: "security" }],
        },
        1: { battleArea: [{ card: "BT6-007", as: "colorSource" }], hand: [{ card: "BT6-095", as: "option" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.topCard.cardId !== "BT24-034"));
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("venusmon").permanentId,
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not spend the replacement twice in one turn and resets on the next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-040", as: "venusmon" },
            { card: "BT24-034", as: "first", suspended: true, dp: 5000 },
            { card: "BT24-034", as: "second", suspended: true, dp: 5000 },
            { card: "BT24-034", as: "third", suspended: true, dp: 5000 },
            { card: "BT1-020", as: "cost", dp: 10000 },
          ],
          security: [{ card: "BT1-012", as: "initialSecurity" }],
          deck: ["BT1-016", "BT1-017", "BT1-018", "BT1-019", "BT1-020"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker", dp: 10000 },
            { card: "BT1-010", as: "secondAttacker", dp: 10000 },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-016", "BT1-017", "BT1-018"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost").permanentId);
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const thirdId = s.perm("third").permanentId;
    const costCardId = s.inst("cost").instanceId;
    const firstAttackerId = s.perm("firstAttacker").permanentId;
    const secondAttackerId = s.perm("secondAttacker").permanentId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: firstAttackerId,
        target: { kind: "permanent", permanentId: firstId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: firstId, accept: false })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(firstId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(costCardId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: secondAttackerId,
        target: { kind: "permanent", permanentId: secondId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "barrierPrompt").length >= 2);
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: secondId, accept: false })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(secondId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("second").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(expect.arrayContaining([costCardId]));
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: thirdId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("third").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: firstAttackerId,
        target: { kind: "permanent", permanentId: thirdId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "barrierPrompt").length >= 3);
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: thirdId, accept: false })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length === 3);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(thirdId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(costCardId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondTurn;
  });

  it("does not replace a TS Digimon removed by its controller's own effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-040", as: "venusmon" },
          { card: "BT24-034", as: "leaving" },
        ],
        security: [{ card: "BT1-012", as: "security" }],
      },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("venusmon").permanentId,
    ]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
  });

  it.each([
    ["normal yellow requirement", false, 4],
    ["alternate TS requirement (Q5604)", true, 3],
  ])("may use the %s", async (_label, useAlternateCost, expectedCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-039", as: "base" }],
        hand: [{ card: "BT24-040", as: "venusmon" }],
        deck: [{ card: "BT1-013", as: "bonusDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("venusmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("venusmon").instanceId);

    expect(s.state.memory).toBe(5 - expectedCost);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("venusmon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("rejects a public evolution from a red level-5 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "base" }], hand: [{ card: "BT24-040", as: "venusmon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("base").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("venusmon").instanceId);
  });
});
