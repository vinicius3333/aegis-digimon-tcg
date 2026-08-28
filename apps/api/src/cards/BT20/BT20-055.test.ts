import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-055.js";
import "./index.js";

describe("BT20-055 Invisimon", () => {
  it("plays from security at the end of the opponent's turn", () => {
    expect(compiled.effects.find((effect) => effect.isSecurity)).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("de-digivolves, flips the next face-down security card, and deletes a Digimon with at most one digivolution card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions).toMatchObject([
        { kind: "DeDigivolve", amount: 2 },
        { kind: "SecurityManipulation", op: "flipFaceUp", controller: "opponent" },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 1 }, count: 1 },
        },
      ]);
    }
  });

  it("optionally places this Digimon's top card face-up at the bottom after a face-up security check", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          optional: true,
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "mine",
              faceUp: true,
              detachPermanentTop: true,
              source: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("plays itself free from face-up security at the end of the opponent's turn", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT20-055", as: "invisimon", faceUp: true }] } });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("invisimon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-055"));
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("de-digivolves by 2, flips the next face-down card, then deletes at one source on both entries", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(mode === "play" ? {} : { battleArea: [{ card: "BT20-054", as: "base" }] }),
            hand: [{ card: "BT20-055", as: "invisimon" }],
          },
          1: {
            battleArea: [{ card: "BT20-053", under: ["BT20-051", "BT20-048", "BT13-005"], as: "target" }],
            security: [{ card: "BT20-047", faceUp: true }, "BT20-047", "BT20-047"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = mode === "play" ? 11 : 3;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("invisimon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("invisimon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      expect(s.state.players[1]!.security.map((card) => card.faceUp)).toEqual([true, true, false]);
      expect(s.state.memory).toBe(0);
    }
  });

  it("Q4388 may move Invisimon itself and lets the promoted HoverEspimon draw", async () => {
    for (const accept of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-055", under: ["BT20-050"], as: "invisimon" }],
            deck: [{ card: "BT20-047", as: "drawn" }],
          },
          1: { security: [{ card: "BT20-047", faceUp: true }] },
        },
        {
          autoAcceptOptional: accept,
          autoDeclineOptional: !accept,
          autoSelectCards: true,
        },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("invisimon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      if (accept) {
        await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT20-055"));
        await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
        expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: "BT20-055", faceUp: true });
        expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-050");
      } else {
        await settle(() => s.events.some((event) => event.kind === "combatResolved"));
        expect(s.state.players[0]!.security).toHaveLength(0);
        expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-055");
      }
    }
  });
});
