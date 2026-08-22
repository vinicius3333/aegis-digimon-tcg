import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { EffectTiming } from "@aegis/shared";
import "./BT19-043.js";

describe("BT19-043 Lucemon (X Antibody)", () => {
  it("compiles atomic two-security leave prevention and conditional recovery", () => {
    const card = runtimeCompiledCard("BT19-043");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects.find((e) => e.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      mode: "prevent",
      cost: { kind: "trashBothSecurityTop" },
      condition: { kind: "selfDigivolutionStackMatchesFilter" },
    });
    const end = card?.effects.find((e) => e.trigger === "EndOfYourTurn")?.actions ?? [];
    expect(end[0]).toMatchObject({
      kind: "SecurityManipulation",
      optionalFor: "opponent",
      bindResultAs: "opponentSecurityTrashed",
    });
    expect(end[1]).toMatchObject({ kind: "Recover", condition: { kind: "bindingEmpty" } });
  });

  it("recovers and deletes an opposing permanent when the opponent cannot trash security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-043", as: "lucemon", under: ["BT7-111"] }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("lucemon"));
    await settle(() => s.state.players[0]!.security.length === 1 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
