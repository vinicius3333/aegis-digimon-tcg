/**
 * DigiXros is offered on every play by an effect, and it stays optional.
 *
 * Rules: §7-2-2-12 (a DigiXros isn't mandatory), §7-2-2-13 (effects that play cards also apply
 * to a DigiXros play) and §7-2-3 (DigiXros is declared inside the play procedure). The Q&A
 * confirms it for effect plays: Q5397 (a <Delay> play may declare DigiXros), Q2104 and Q2352
 * (DigiXros performed while a Digimon is played by an effect).
 */
import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

type Setup = ReturnType<typeof setupEngine>;

function fieldPermanent(s: Setup, cardId: string) {
  return s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === cardId);
}

function idle(s: Setup): boolean {
  return s.state.pendingDecision === undefined && !observe(s.engine).isAttacking();
}

function digiXrosPrompts(s: Setup): number {
  return s.decisions.filter(({ req }) => req.options?.digiXrosCardId !== undefined).length;
}

describe("DigiXros on an effect play", () => {
  it("plays the card normally when no legal material exists", async () => {
    cite("comprehensive-0117", "§7-2-2-12: a DigiXros isn't mandatory");
    const s = setupEngine(
      {
        0: {
          deck: ["BT10-061", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: [{ card: "BT10-105", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => fieldPermanent(s, "BT10-061") !== undefined && idle(s));

    expect(fieldPermanent(s, "BT10-061")?.stack.map(({ cardId }) => cardId)).toEqual([]);
    expect(digiXrosPrompts(s)).toBe(0);
  });

  it("plays the card without materials when the player declines DigiXros", async () => {
    cite("comprehensive-0117", "§7-2-2-12: a DigiXros isn't mandatory");
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-084", as: "tactimon" },
            { card: "BT10-076", as: "material" },
          ],
          trash: [{ card: "BT10-077", as: "madleomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tactimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => fieldPermanent(s, "BT10-077") !== undefined && idle(s));

    expect(digiXrosPrompts(s)).toBe(1);
    expect(fieldPermanent(s, "BT10-077")?.stack.map(({ cardId }) => cardId)).toEqual([]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("material").instanceId);
    expect(fieldPermanent(s, "BT10-084")).toBeDefined();
  });
});
