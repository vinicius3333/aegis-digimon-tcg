import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-014.js";
import "../index.js";

describe("EX7-014 Volcanicdramon", () => {
  it("deletes the lowest-DP opponent on play and attack", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((e) => e.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 },
      });
  });
  it("restricts small opposing Digimon and replaces other-than-effect departure", () => {
    expect(compiled.effects?.find((e) => e.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "RestrictPlay",
      seat: "opponent",
      filter: { kind: ["Digimon"], dpAtMost: 6000 },
      mode: "playOrMove",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((e) => e.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
    });
  });

  it("deletes only the lowest-DP opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-014", as: "volcanic" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "small" },
            { card: "BT1-075", as: "large" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("volcanic"));
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009"));

    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-075")).toBe(true);
  });

  it("blocks an opposing 6000-DP-or-less play until that opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-014", as: "volcanic" }] },
        1: {
          hand: [
            { card: "BT1-009", as: "small" },
            { card: "BT1-075", as: "large" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("volcanic"));
    await settle(() => false, 25);
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("small").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("large").instanceId }).ok).toBe(true);
  });

  it("replaces a non-effect departure by playing a Machine Dragon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-014", as: "volcanic" }],
          hand: [{ card: "EX7-042", as: "machine" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const volcanicId = s.perm("volcanic").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([volcanicId], "byBattle")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX7-042"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX7-042")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === volcanicId)).toBe(false);
  });
});
