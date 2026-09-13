import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-091.js";

describe("BT13-091 Belphemon: Rage Mode", () => {
  it("deletes all opposing level 5 or lower Digimon at the start of the main phase", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
        count: "all",
      },
    });
  });

  it("conditionally grants +3000 DP and Security Attack +1 with 6 or fewer hand cards", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    for (const action of effect?.actions?.slice(1) ?? []) {
      expect(action).toMatchObject({
        target: { filter: { isSelfRef: true }, isSelf: true },
        duration: "forTheTurn",
        condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 6 },
      });
    }
    expect(effect?.actions?.[1]).toMatchObject({ kind: "ModifyDP", amount: 3000 });
    expect(effect?.actions?.[2]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
    });
  });

  it("unsuspends once per turn by deleting another Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      cost: {
        kind: "deleteOwn",
        target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "Trash",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true, topCardOnly: true },
          condition: { kind: "selfHasName", names: ["Belphemon: Sleep Mode"] },
        },
      ],
    });
  });

  it("[Supplemental] deletes an opposing level 4 Digimon at the start of the main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-091", as: "rage" }] },
      1: { battleArea: [{ card: "BT1-015", as: "target" }] },
    });
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("rage"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes an opposing level 4 Digimon on a real turn's main-phase entry", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-091", as: "rage" }] },
      1: { battleArea: [{ card: "BT1-015", as: "target" }] },
    });
    await advance(s.engine).runTurn(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("unsuspends once per own turn after a real attack by deleting another own Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-091", as: "rage" },
            { card: "BT1-010", as: "firstFodder" },
            { card: "BT1-010", as: "secondFodder" },
            { card: "BT1-010", as: "thirdFodder" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: Array.from({ length: 8 }, (_, index) => ({ card: "BT1-010", as: `ownDeck${index + 1}` })),
        },
        1: {
          hand: [{ card: "BT1-010", as: "opponentSpare" }],
          security: Array.from({ length: 6 }, (_, index) => ({ card: "BT1-010", as: `security${index + 1}` })),
          deck: Array.from({ length: 8 }, (_, index) => ({ card: "BT1-010", as: `opponentDeck${index + 1}` })),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const rageId = s.perm("rage").permanentId;
    const firstFodderId = s.perm("firstFodder").topCard!.instanceId;
    const secondFodderId = s.perm("secondFodder").topCard!.instanceId;
    const thirdFodderId = s.perm("thirdFodder").topCard!.instanceId;
    preferred.push(firstFodderId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: rageId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4 && !observe(s.engine).isAttacking());
    expect(s.perm("rage").permanentId).toBe(rageId);
    expect(s.perm("rage").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(firstFodderId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual(
      expect.arrayContaining([secondFodderId, thirdFodderId]),
    );

    preferred.splice(0, preferred.length, secondFodderId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: rageId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.perm("rage").permanentId).toBe(rageId);
    expect(s.perm("rage").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(secondFodderId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual(
      expect.arrayContaining([secondFodderId, thirdFodderId]),
    );

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;

    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: rageId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.perm("rage").permanentId).toBe(rageId);
    expect(s.perm("rage").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(secondFodderId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(thirdFodderId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toContain(thirdFodderId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("trashes its top card when a Sleep Mode host reaches a real opponent turn end", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-088", as: "sleepHost", under: ["BT13-091"] }] },
      1: { deck: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    expect(s.perm("sleepHost").topCard?.cardId).toBe("BT13-091");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-088")).toBe(true);
  });
});
