import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-018.js";
import "../index.js";

describe("EX4-018 MailBirdramon", () => {
  it("gives the lowest-level opposing Digimon a temporary attack trigger", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" } },
      effectText: "[When Attacking] Lose 2 memory",
      duration: "untilOpponentTurnEnd",
    });
  });
  it("has Save on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.keywords).toMatchObject([
      { keyword: "Save" },
    ]);
  });

  it("has inherited Jamming", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.isInherited)?.keywords).toMatchObject([
      { keyword: "Jamming" },
    ]);
  });

  it("makes the lowest-level opposing Digimon lose 2 memory when it attacks", async () => {
    const s = setupEngine(
      {
        0: { security: ["BT1-001"], battleArea: [{ card: "EX4-018", as: "mail" }] },
        1: {
          security: ["BT1-001"],
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "AD1-001", as: "higher" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = -3;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("mail"));
    s.state.turnSeat = 1;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("lowest"), {
      attackerPermanentId: s.perm("lowest").permanentId,
    });
    expect(s.state.memory).toBe(-5);
  });

  it("survives a stronger Security Digimon through inherited Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-018"] }] },
      1: { security: ["BT1-081"] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId),
    ).toBe(true);
  });
});
