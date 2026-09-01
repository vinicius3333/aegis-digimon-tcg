import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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

  it("deletes an opposing level 5 Digimon at the start of the main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-091", as: "rage" }] },
      1: { battleArea: [{ card: "BT1-015", as: "target" }] },
    });
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("rage"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes an opposing level 5 Digimon on a real turn's main-phase entry", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-091", as: "rage" }] },
      1: { battleArea: [{ card: "BT1-015", as: "target" }] },
    });
    await advance(s.engine).runTurn(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("unsuspends after a real attack by deleting another own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-091", as: "rage" },
            { card: "BT1-015", as: "fodder" },
          ],
          security: ["BT1-001"],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rage").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("fodder").instanceId));
    expect(s.perm("rage").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);
  });

  it("trashes its top card when a Sleep Mode host reaches a real opponent turn end", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-088", as: "sleepHost", under: ["BT13-091"] }] },
      1: { deck: ["BT1-001"] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    expect(s.perm("sleepHost").topCard?.cardId).toBe("BT13-091");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-088")).toBe(true);
  });
});
