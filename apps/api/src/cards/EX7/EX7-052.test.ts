import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-052.js";
import "../index.js";

describe("EX7-052", () => {
  it("reveals 3, adds a Lilithmon card to hand and a purple card to trash", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "trash" },
      ],
      rest: "deckBottom",
    }));
  it("inherits a once-per-turn attack-ending effect by deleting another Digimon", () =>
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
    }));

  it("publicly reveals a Lilithmon-text card to hand and a purple card to trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-052", as: "tsukai" }], deck: ["EX7-061", "EX7-053", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tsukai"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX7-061"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX7-061")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX7-053")).toBe(true);
  });

  it("publicly ends an opponent attack after deleting another own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-042", as: "host", under: ["EX7-052"] },
            { card: "EX7-038", as: "cost" },
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
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.topCard.cardId !== "EX7-038"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-038")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("does not end an attack when Armor Purge prevents the deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-042", as: "host", under: ["EX7-052"] },
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
