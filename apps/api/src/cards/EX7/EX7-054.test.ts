import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-054.js";
import "../index.js";

describe("EX7-054", () => {
  it("can give one of your Digimon Blocker by trashing a card, then gives that same target Retaliation", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Blocker" }, optional: true, cost: { kind: "trash" } },
      { kind: "GainKeyword", keyword: { keyword: "Retaliation" }, condition: { kind: "ifThisEffectActed" } },
    ]));
  it("has the same effect on deletion and inherits once-per-turn attack ending by deleting another Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toHaveLength(2);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "EndAttack",
              cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true }, count: 1 } },
            },
          ],
        },
      ],
    });
  });

  it("publicly grants Blocker and then Retaliation to the same Digimon after paying the hand cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-054", as: "black" }], hand: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("black"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("black"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("black"), "Retaliation")).toBe(true);
  });

  it("publicly repeats the paid keyword grants from its deletion timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-054", as: "black" },
            { card: "BT1-009", as: "other" },
          ],
          hand: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("black").permanentId], "byBattle")).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Retaliation")).toBe(true);
  });

  it("does not end an attack when Armor Purge prevents the deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-042", as: "host", under: ["EX7-054"] },
            { card: "BT8-039", as: "cost", under: ["BT8-046"] },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT8-046")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-039")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
