import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-080.js";
import "../index.js";

describe("BT21-080 Hiro Amanokawa", () => {
  it("implements the main-phase memory, digivolution-card trigger, and security play", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourMainPhase",
        actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "onAddDigivolutionCards",
            triggerFilter: expect.objectContaining({
              nameOrTrait: [
                { tokens: ["Gammamon"], match: "text" },
                { tokens: ["Hero"], match: "trait", orPrevious: true },
              ],
            }),
            cost: expect.objectContaining({ kind: "suspend", target: expect.objectContaining({ isSelf: true }) }),
            optional: true,
            abortOnDecline: true,
          }),
        ],
      }),
    );
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
      0: { battleArea: [{ card: "BT21-080", as: "hiro" }] },
      1: hasOpponent ? { battleArea: [{ card: "BT1-009", as: "opponent" }] } : {},
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hiro"));
    expect(s.state.memory).toBe(expectedGain);
  });

  it("gains the conditional Start of Your Main Phase memory through the public turn lifecycle", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT21-080", as: "hiro" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponent" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
        security: [{ card: "BT1-009" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiro").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("hiro").instanceId),
    );
    expect(s.state.memory).toBe(6);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 0;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it.each([
    ["Gammamon text", "BT21-069"],
    ["Hero trait", "BT21-066"],
  ])("suspends to draw and gain memory for a %s host", async (_label, host) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-080", as: "hiro" },
            { card: host, as: "host", under: [{ card: "BT1-009", as: "added" }] },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("hiro").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("does not trigger for a nonmatching host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-080", as: "hiro" },
            { card: "BT1-009", as: "host", under: [{ card: "BT1-010", as: "added" }] },
          ],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    expect(s.perm("hiro").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("triggers from a public effect-driven placement under a Hero host", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-080", as: "hiro" },
            { card: "BT21-066", as: "heroHost" },
            { card: "BT21-056", as: "evolutionBase" },
          ],
          hand: [{ card: "BT21-058", as: "snatchmon" }],
          trash: [
            { card: "BT21-056", as: "placedA" },
            { card: "BT21-056", as: "placedB" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", { card: "BT1-001", as: "hiroDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("heroHost").topCard.instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("evolutionBase").permanentId,
        instanceId: s.inst("snatchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolutionBase").topCard.instanceId === s.inst("snatchmon").instanceId);
    await settle(() => s.perm("hiro").isSuspended);

    expect(s.perm("hiro").isSuspended).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hiroDraw").instanceId)).toBe(true);
    expect(s.perm("heroHost").stack.some((card) => card.instanceId === s.inst("placedA").instanceId)).toBe(true);
  });

  it("declining does not suspend, draw, or gain memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-080", as: "hiro" },
            { card: "BT21-069", as: "host", under: [{ card: "BT1-009", as: "added" }] },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    expect(s.perm("hiro").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("plays itself from security without paying cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT21-080", as: "hiro" }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("hiro"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });

  it("plays itself from a public security attack without paying cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-032", as: "attacker", suspended: false }] },
        1: { security: [{ card: "BT21-080", as: "hiro" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
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
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("hiro").instanceId),
    );
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
