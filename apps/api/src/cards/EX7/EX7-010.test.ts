import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-010.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-010 Deputymon", () => {
  it("trashes an Option from any digivolution stack on digivolving or attacking", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const)
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Trash",
        optional: true,
        target: { filter: { zone: "digivolutionCards", cardType: "Option", controller: "any" } },
      });
  });
  it("grants the Three Musketeers trait and inherits +2000 DP", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0],
    ).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Three Musketeers"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });

  it("trashes an Option from a digivolution stack when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-010", as: "deputy", under: ["EX7-071"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("deputy"));
    await settle(() => !s.state.players[0]!.battleArea[0]!.stack.some((card) => card.cardId === "EX7-071"));
    expect(s.state.players[0]!.battleArea[0]!.stack.some((card) => card.cardId === "EX7-071")).toBe(false);
  });

  it("can trash an opponent's stacked Option when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-010", as: "deputy" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", under: ["EX7-071"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deputy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea[0]!.stack.length === 0);

    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
  });

  it("does nothing when no Option is available to trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX7-010", as: "deputy" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("deputy"));
    await settle(() => false, 20);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
  });

  it("applies inherited +2000 DP to its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-010"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });
});
