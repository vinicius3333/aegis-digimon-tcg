import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { wouldBePlayedSelfReducersFor } from "../../engine/effects/interpreter/registration/reducers.js";
import { compiled } from "./BT26-045.js";
import "../index.js";

describe("BT26-045 GranKuwagamon", () => {
  it("encodes hand-size reduction, shared free play, and all three Your Turn keywords", () => {
    expect(digivolutionRequirementsFor("BT26-045")).toContainEqual({
      level: 5,
      traits: ["Insectoid", "TS"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 4 }],
    });
    expect(wouldBePlayedSelfReducersFor("BT26-045")).toHaveLength(1);
    expect(compiled.effects?.slice(1, 4)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "OnPlay", frequency: "OncePerTurn" }),
        expect.objectContaining({ trigger: "WhenDigivolving", sharedUseKey: "bt26-045-free-play" }),
        expect.objectContaining({ trigger: "WhenAttacking", sharedUseKey: "bt26-045-free-play" }),
      ]),
    );
    expect(compiled.effects?.[4]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Alliance" } }),
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Piercing" } }),
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Vortex" } }),
      ]),
    );
  });

  it("publicly grants Alliance, Piercing, and Vortex to an eligible Insectoid", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-045", as: "granKuwagamon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("granKuwagamon"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("granKuwagamon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("granKuwagamon"), "Vortex")).toBe(true);
  });

  it("schedules a live granted recipient at the real end-of-turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-045", as: "granKuwagamon", suspended: true },
            { card: "ST9-12", as: "recipient" },
          ],
          hand: ["AD1-001"],
          deck: ["AD1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], hand: ["AD1-001"], deck: ["AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.isFirstPlayersFirstTurn = true;
    const recipient = s.perm("recipient");
    const targetId = s.perm("target").permanentId;
    recipient.enterFieldTurnCount = s.state.turnCount;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 500);
    await advance(s.engine).verb.suspend([s.perm("granKuwagamon").permanentId]);
    s.perm("recipient").enterFieldTurnCount = s.state.turnCount;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(observe(s.engine).hasKeyword(recipient, "Vortex")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toEqual([
      expect.objectContaining({
        attackerPermanentId: recipient.permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ]);
  });

  it("allows declining the live granted recipient's optional Vortex attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-045", as: "granKuwagamon", suspended: true },
            { card: "ST9-12", as: "recipient" },
          ],
          hand: ["AD1-001"],
          deck: ["AD1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], hand: ["AD1-001"], deck: ["AD1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.isFirstPlayersFirstTurn = true;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 500);
    await advance(s.engine).verb.suspend([s.perm("granKuwagamon").permanentId]);
    s.perm("recipient").enterFieldTurnCount = s.state.turnCount;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST9-12")).toBe(true);
  });

  it("loses the live granted Vortex keyword after its Your Turn duration expires", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-045", as: "granKuwagamon", suspended: true },
            { card: "ST9-12", as: "recipient" },
          ],
          hand: ["AD1-001"],
          deck: ["AD1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], hand: ["AD1-001"], deck: ["AD1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const recipient = s.perm("recipient");
    expect(observe(s.engine).hasKeyword(recipient, "Vortex")).toBe(true);
    s.state.isFirstPlayersFirstTurn = true;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 500);
    await advance(s.engine).verb.suspend([s.perm("granKuwagamon").permanentId]);
    s.perm("recipient").enterFieldTurnCount = s.state.turnCount;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(recipient, "Vortex")).toBe(false);
  });

  it("reduces its play cost only when its hand is strictly smaller at announcement (Q7036/Q7037)", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: "BT26-045", as: "granKuwagamon" }] },
      1: { hand: ["BT1-001", "BT1-002"] },
    });
    reduced.state.memory = 7;
    await reduced.ready();
    expect(
      reduced.engine.applyIntent(0, {
        type: "playCard",
        instanceId: reduced.inst("granKuwagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-045"),
    );
    expect(reduced.state.memory).toBe(0);

    const tied = setupEngine({
      0: { hand: [{ card: "BT26-045", as: "granKuwagamon" }] },
      1: { hand: ["BT1-001"] },
    });
    tied.state.memory = 7;
    await tied.ready();
    expect(
      tied.engine.applyIntent(0, {
        type: "playCard",
        instanceId: tied.inst("granKuwagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => tied.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-045"));
    expect(tied.state.memory).toBe(-4);
  });

  it("shares one free-play activation and grants Alliance to the newly played Digimon (Q7038)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-045", as: "granKuwagamon" }],
          hand: [
            { card: "BT1-066", as: "first" },
            { card: "BT1-066", as: "second" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("granKuwagamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("first").instanceId,
    )!;
    expect(observe(s.engine).hasKeyword(played, "Alliance")).toBe(true);
    const prompt = s.events.find((event) => event.kind === "alliancePrompt") as
      | { kind: "alliancePrompt"; eligibleAllyIds: string[] }
      | undefined;
    expect(prompt?.eligibleAllyIds).toContain(played.permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: played.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => played.isSuspended && !observe(s.engine).isAttacking());

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("granKuwagamon"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("second").instanceId);
  });
});
