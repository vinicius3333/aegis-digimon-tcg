import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { digivolutionRequirementsFor } from "@aegis/shared";
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
          hand: ["BT1-012"],
          deck: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], hand: ["BT1-012"], deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.isFirstPlayersFirstTurn = true;
    const recipient = s.perm("recipient");
    const targetId = s.perm("target").permanentId;
    recipient.enterFieldTurnCount = s.state.turnCount;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("granKuwagamon").permanentId]);
    s.perm("recipient").enterFieldTurnCount = s.state.turnCount;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared"));
    expect(observe(s.engine).hasKeyword(recipient, "Vortex")).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toEqual([
      expect.objectContaining({
        attackerPermanentId: recipient.permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("allows declining the live granted recipient's optional Vortex attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-045", as: "granKuwagamon", suspended: true },
            { card: "ST9-12", as: "recipient" },
          ],
          hand: ["BT1-012"],
          deck: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], hand: ["BT1-012"], deck: ["BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("granKuwagamon").permanentId]);
    s.perm("recipient").enterFieldTurnCount = s.state.turnCount;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST9-12")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("loses the live granted Vortex keyword after its Your Turn duration expires", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-045", as: "granKuwagamon", suspended: true },
            { card: "ST9-12", as: "recipient" },
          ],
          hand: ["BT1-012"],
          deck: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], hand: ["BT1-012"], deck: ["BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const recipient = s.perm("recipient");
    expect(observe(s.engine).hasKeyword(recipient, "Vortex")).toBe(true);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("granKuwagamon").permanentId]);
    s.perm("recipient").enterFieldTurnCount = s.state.turnCount;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(recipient, "Vortex")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("reduces its play cost only when its hand is strictly smaller at announcement (Q7036/Q7037)", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: "BT26-045", as: "granKuwagamon" }] },
      1: { hand: ["BT1-009", "BT1-010"] },
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
      1: { hand: ["BT1-009"] },
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
            { card: "BT26-045", as: "second" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId);
    s.state.memory = 13;
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

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("second").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("second").instanceId);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT1-066")).toHaveLength(
      1,
    );
  });
});
