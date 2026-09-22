import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { compiled } from "./EX6-070.js";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "../P/P-143.js";

describe("EX6-070 Phantom Pain", () => {
  it("carries its ＜Delay＞ on the printed [End of Opponent's Turn] window", () => {
    const runtime = runtimeCompiledCard("EX6-070");
    const effects = runtime?.effects ?? [];
    expect(runtime).toMatchObject({ coverage: "full", residual: [] });
    expect(JSON.stringify(runtime)).toContain("PlaceInBattleAreaSelf");
    // "[End of Opponent's Turn] If you have a Digimon with [Lilithmon] in its name, ＜Delay＞
    // ・Delete ..." is ONE clause. Registration folds the authored grant/activate pair into it,
    // so the window itself carries ＜Delay＞ and its §16-17 trash cost.
    const delayWindows = effects.filter(
      (entry) => entry.trigger === "EndOfOpponentsTurn" && (entry.keywords ?? []).some((kw) => kw.keyword === "Delay"),
    );
    expect(delayWindows).toHaveLength(1);
    expect(delayWindows[0]).toMatchObject({
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "Delete",
          optional: true,
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true } },
        },
      ],
    });
    expect(delayWindows[0]!.actions[0]).not.toHaveProperty("requiresDelayArmed");
    const ordinaryMainEntries = effects.filter(
      (entry) => entry.trigger === "Main" && !(entry.keywords ?? []).some((keyword) => keyword.keyword === "Delay"),
    );
    expect(ordinaryMainEntries).toHaveLength(1);
    expect(ordinaryMainEntries[0]).toMatchObject({
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          effectText: "GRANTEFFECT51TOKEN",
          duration: "untilOpponentTurnEnd",
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    const securityDeleteEntries = effects.filter(
      (entry) =>
        entry.trigger === "Security" &&
        entry.actions?.length === 1 &&
        entry.actions[0]?.kind === "Delete" &&
        entry.actions[0]?.target?.filter?.unsuspended === true,
    );
    expect(securityDeleteEntries).toHaveLength(1);
    // The authored record keeps the grant/activate pair; only the runtime record is folded.
    expect(compiled.effects).toHaveLength(4);
  });

  it("publicly plays Phantom Pain into the battle area through Main", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-056", as: "purple" }], hand: [{ card: "EX6-070", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-070"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-070")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("opens its ＜Delay＞ window at the opponent's end and deletes an unsuspended opponent Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-057", as: "lilithmon" }],
          hand: [{ card: "EX6-070", as: "option" }],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: {
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          battleArea: [
            { card: "BT1-009", as: "auraTarget", dp: 20_000, suspended: true },
            { card: "BT1-009", as: "delayTarget", dp: 20_000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.inst("delayTarget").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-070"));
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    // The window opens at the end of the opponent's turn itself, paying its §16-17-1 cost there.
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("publicly deletes one unsuspended Digimon from Security and leaves a suspended peer", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX6-070", as: "option", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "highDPAttacker", dp: 20_000 },
            { card: "BT1-009", as: "unsuspendedVictim" },
            { card: "BT1-009", as: "suspendedPeer", suspended: true },
          ],
          hand: [],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("highDPAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(
      s.state.players[1]!.battleArea.some(
        (perm) => perm.topCard?.instanceId === s.inst("unsuspendedVictim").instanceId,
      ),
    ).toBe(false);
    expect(s.perm("suspendedPeer").isSuspended).toBe(true);
  });

  it("does not open its ＜Delay＞ window when the controller has no Lilithmon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-070", as: "option" }], hand: [] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const option = s.perm("option");
    option.enterFieldTurnCount = s.state.turnCount - 1;
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    s.state.turnSeat = 0;
    await advance(s.engine).recompute();

    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === option.permanentId)).toBe(true);
  });

  it("Q3820 lets Main choose an opponent Digimon that is temporarily unaffected, then deletes it after immunity expires", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-056", as: "purple" }],
          hand: [{ card: "EX6-070", as: "option" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "immune" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("immune").permanentId,
      "beAffected",
      EffectDuration.UntilOpponentTurnEnd,
      { fromSourceKind: ["Option"] },
    );
    preferred.push(s.perm("immune").topCard!.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-070"));

    advance(s.engine).ledgers.continuous.sweep(s.state, "opponentTurnEnd", 0);
    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("immune").instanceId)).toBe(true);
  });

  it("does not resolve the granted end-of-turn delete after its target moves to breeding", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-057", as: "lilithmon" }],
          hand: [{ card: "EX6-070", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "P-143", as: "target" },
            { card: "BT1-009", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred, preferTriggerKeys: ["P-143"] },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("target").topCard!.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-070"));

    s.perm("option").enterFieldTurnCount = s.state.turnCount - 1;
    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(() => s.state.players[1]!.breeding?.topCard?.cardId === "P-143");

    expect(s.state.players[1]!.breeding?.topCard?.instanceId).toBe(s.inst("target").instanceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(false);
  });
});
