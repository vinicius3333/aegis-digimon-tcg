import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { compiled } from "./EX6-070.js";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "../P/P-143.js";

describe("EX6-070 Phantom Pain", () => {
  it("requires an armed Delay and does not double-pay its delayed deletion", () => {
    const runtime = runtimeCompiledCard("EX6-070");
    const effects = runtime?.effects ?? [];
    const text = JSON.stringify(runtime);
    expect(runtime).toMatchObject({ coverage: "full", residual: [] });
    expect(runtime?.effects).toHaveLength(4);
    expect(text).toContain("PlaceInBattleAreaSelf");
    expect(runtime?.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Delay" },
    });
    const delayedDeleteEntries = effects.filter(
      (entry) =>
        entry.trigger === "Main" &&
        entry.keywords?.length === 1 &&
        entry.keywords[0]?.keyword === "Delay" &&
        entry.actions?.length === 1 &&
        entry.actions[0]?.kind === "Delete" &&
        entry.actions[0]?.requiresDelayArmed === true &&
        entry.actions[0]?.optional === true &&
        entry.actions[0]?.target?.count === 1 &&
        entry.actions[0]?.target?.filter?.controller === "opponent" &&
        entry.actions[0]?.target?.filter?.kind?.length === 1 &&
        entry.actions[0]?.target?.filter?.kind[0] === "Digimon" &&
        entry.actions[0]?.target?.filter?.unsuspended === true,
    );
    expect(delayedDeleteEntries).toHaveLength(1);
    expect(delayedDeleteEntries[0]).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "Delete",
          optional: true,
          requiresDelayArmed: true,
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true } },
        },
      ],
    });
    const ordinaryMainEntries = effects.filter(
      (entry) => entry.trigger === "Main" && !entry.keywords?.some((keyword) => keyword.keyword === "Delay"),
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
        entry.actions[0]?.target?.count === 1 &&
        entry.actions[0]?.target?.filter?.controller === "opponent" &&
        entry.actions[0]?.target?.filter?.kind?.length === 1 &&
        entry.actions[0]?.target?.filter?.kind[0] === "Digimon" &&
        entry.actions[0]?.target?.filter?.unsuspended === true,
    );
    expect(securityDeleteEntries).toHaveLength(1);
    expect(runtime).toEqual(compiled);
  });

  it("does not execute the armed Delete when Delay source trash is prevented", async () => {
    const sourcePermanent = {
      permanentId: "phantom-pain",
      enterFieldTurnCount: 0,
      controllerSeat: 0,
      isSuspended: false,
      inBreeding: false,
      stack: [],
      topCard: { instanceId: "phantom-pain-card", cardId: "EX6-070", ownerSeat: 0 },
    };
    const visibleOpponent = {
      permanentId: "visible-unsuspended-opponent",
      controllerSeat: 1,
      isSuspended: false,
      inBreeding: false,
      stack: [],
      topCard: { instanceId: "visible-opponent-card", cardId: "BT1-024", ownerSeat: 1 },
    };
    const players = [
      { hand: [], trash: [], deck: [], security: [], battleArea: [sourcePermanent], breeding: undefined },
      { hand: [], trash: [], deck: [], security: [], battleArea: [visibleOpponent], breeding: undefined },
    ];
    const source = {
      cardId: "EX6-070",
      instanceId: "phantom-pain-card",
      ownerSeat: 0,
      permanent: () => sourcePermanent,
    } as never;
    const effect = getEffectModule("EX6-070")?.effectsForTiming(EffectTiming.OnDeclaration, source)[0];
    const deleted: string[][] = [];
    const ctx = {
      source,
      activeEffectKey: undefined,
      game: {
        state: { turnCount: 1 },
        player: (seat: number) => players[seat]!,
        opponentOf: () => 1,
        permanentById: (id: string) =>
          [sourcePermanent, visibleOpponent].find((permanent) => permanent.permanentId === id),
        definitionOf: ({ cardId }: { cardId: string }) => ({
          cardId,
          nameEn: cardId,
          kinds: ["Digimon"],
          colors: [],
          playCost: 0,
        }),
      },
      fx: {
        grantedKeywords: () => [{ keyword: "Delay" }],
        revokeKeyword: () => undefined,
        deletePermanent: async (ids: string[]) => {
          deleted.push(ids);
          return 0;
        },
      },
    } as never;

    expect(effect).toBeDefined();
    await effect!.resolve(ctx);
    expect(deleted).toEqual([["phantom-pain"]]);
    expect(players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(["visible-unsuspended-opponent"]);
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

  it("arms Delay at the opponent's end and deletes an unsuspended opponent Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-057", as: "lilithmon" }],
          hand: [{ card: "EX6-070", as: "option" }],
        },
        1: {
          deck: ["BT1-009"],
          battleArea: [
            { card: "BT1-009", as: "auraTarget" },
            { card: "BT1-009", as: "delayTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-070"));
    preferred.push(s.inst("delayTarget").instanceId);
    const option = s.perm("option");
    option.enterFieldTurnCount = s.state.turnCount - 1;
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, option);
    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    const delay = JSON.parse(option.activatableEffectsJson || "[]").find((entry: { effectKey: string }) =>
      entry.effectKey.includes("EX6-070"),
    ) as { effectKey: string } | undefined;
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: option.topCard!.instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("auraTarget").instanceId),
    ).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("delayTarget").instanceId),
    ).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("publicly deletes one unsuspended Digimon from Security and leaves a suspended peer", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX6-070", as: "option", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "unsuspended" },
            { card: "BT1-009", as: "suspended", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("unsuspended").instanceId),
    ).toBe(false);
    expect(s.perm("suspended").isSuspended).toBe(true);
  });

  it("does not arm a Delay activation when the controller has no Lilithmon", async () => {
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

    expect(
      JSON.parse(option.activatableEffectsJson || "[]").some((entry: { effectKey: string }) =>
        entry.effectKey.includes("EX6-070"),
      ),
    ).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009")).toBe(true);
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

    // The immunity expires at the end of seat 0's turn. The granted text belongs
    // to the recipient, so its "End of Your Turn" window is seat 1's turn end.
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
