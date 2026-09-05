import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/index.js";

describe("AD1-017 Dynasmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-017");
    const compiled = registeredCompiledCards.get("AD1-017") ?? getCompiledCard("AD1-017");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-017");
    expect(definition?.nameEn).toBe("Dynasmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("trashes one security card and gives every opposing Digimon -6000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-017", as: "dynasmon" }], security: ["BT1-028", "BT1-029"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "decoy", dp: 7000 },
            { card: "BT1-010", as: "target", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "chooseOption"));
    const choice = s.decisions.find((decision) => decision.req.kind === "chooseOption");
    expect(choice).toBeDefined();
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: choice!.req.decisionId,
      response: { kind: "chooseOption", optionIndex: 0 },
    });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("reduces its play cost by 5 with four Lucemon-text cards in trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "red-source" }],
        trash: ["AD1-017", "AD1-017", "AD1-017", "AD1-017"],
        hand: [{ card: "AD1-017", as: "dynasmon" }],
      },
    });
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-017"));
    expect(s.state.memory).toBe(1);
  });

  it("finishes the -6000 DP effect before the security-removal deletion resolves (Q6084)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "base" }],
          hand: [{ card: "AD1-017", as: "dynasmon" }],
          security: ["BT1-028"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lower-after-reduction", dp: 8000 },
            { card: "BT1-010", as: "higher-after-reduction", dp: 9000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dynasmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("higher-after-reduction").permanentId);
    expect(s.perm("higher-after-reduction").currentDP).toBe(3000);
  });

  it("reacts only when its own security is removed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-017", as: "dynasmon" }], security: ["BT1-001"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker", dp: 6000 },
            { card: "AD1-001", as: "other", dp: 7000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1, 5000);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("other").permanentId);
  });

  it("deletes only once per turn for own security removal and ignores the opponent's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-017", as: "dynasmon" }],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 5000 },
            { card: "BT1-010", as: "second", dp: 6000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("applies Security Attack -1 and -3000 DP to selected opposing Digimon", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "AD1-017", as: "security-dynasmon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 8000 },
            { card: "BT1-010", as: "other-target", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("target").topCard.instanceId);
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security-dynasmon"));

    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("other-target"), "SecurityAttack")).toBe(0);
    expect(s.perm("other-target").currentDP).toBe(8000);
  });

  it("resolves its Security effect before battling the attacking Digimon (Q6086)", async () => {
    const s = setupEngine(
      {
        0: { security: ["AD1-017"] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 12000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
