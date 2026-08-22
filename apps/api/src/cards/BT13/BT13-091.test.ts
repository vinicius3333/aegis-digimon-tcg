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
});
