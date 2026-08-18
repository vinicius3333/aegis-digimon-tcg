import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-105.js";

describe("BT10-105 Defense Plug-In C", () => {
  it("grants Blocker, Reboot, and opponent-effect deletion protection to the same chosen Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            "BT10-092",
            { card: "BT1-010", as: "chosen" },
            { card: "BT1-011", as: "other" },
          ],
          hand: [{ card: "BT10-105", as: "option" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, autoOrderTriggers: true },
    );
    preferred.push(s.perm("chosen").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() =>
      [s.perm("chosen"), s.perm("other")].some((permanent) =>
        observe(s.engine).hasKeyword(permanent, "Blocker") &&
        observe(s.engine).hasKeyword(permanent, "Reboot"),
      ),
    );

    const permanents = [s.perm("chosen"), s.perm("other")];
    const recipients = permanents.filter((permanent) =>
      observe(s.engine).hasKeyword(permanent, "Blocker"),
    );
    expect(recipients).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(recipients[0]!, "Reboot")).toBe(true);

    const untouched = permanents.find((permanent) => permanent !== recipients[0])!;
    expect(observe(s.engine).hasKeyword(untouched, "Reboot")).toBe(false);

    s.state.turnSeat = 1;
    const removedByOpponent = await advance(s.engine).verb.deletePermanent([recipients[0]!.permanentId]);
    expect(removedByOpponent).toBe(0);
    expect(s.state.players[0]!.battleArea).toContain(recipients[0]);
  });

  it("plays one revealed low-cost Digimon, bottoms the rest, and returns itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT10-105", as: "securityOption", faceUp: true }],
          deck: [
            { card: "BT10-085", as: "eligible" },
            { card: "BT10-068", as: "tooExpensive" },
            { card: "BT1-090", as: "notDigimon" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const deckIdsBefore = new Set(s.state.players[0]!.deck.map((card) => card.instanceId));

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.battleArea.some((permanent) =>
      permanent.topCard.instanceId === s.inst("eligible").instanceId,
    )).toBe(true);
    expect(s.state.players[0]!.hand.some((card) =>
      card.instanceId === s.inst("securityOption").instanceId,
    )).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.deck.every((card) => deckIdsBefore.has(card.instanceId))).toBe(true);
  });
});
