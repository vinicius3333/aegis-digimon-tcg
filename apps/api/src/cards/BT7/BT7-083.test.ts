import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-083.js";

describe("BT7-083 Sistermon Ciel (Awakened)", () => {
  it("keeps the printed Rule name alias", () => {
    expect(runtimeCompiledCard("BT7-083")?.effects.find((effect) => effect.trigger === "Rule")).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          grant: "name",
          tokens: ["Sistermon Noir (Awakened)"],
        },
      ],
    });
  });

  it("limits the deletion cost source to Sistermon Ciel in hand or trash", () => {
    expect(runtimeCompiledCard("BT7-083")?.effects[0]?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: {
        from: ["hand", "trash"],
        filter: { nameOrTrait: [{ tokens: ["Sistermon Ciel"], match: "nameExact" }] },
      },
      underFilter: { isSelfRef: true },
      position: "bottom",
      optional: true,
      abortOnDecline: true,
    });
  });

  it("places Sistermon Ciel under itself to delete a play-cost-5 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-083", as: "source" },
            { card: "BT6-084", as: "material" },
          ],
        },
        1: {
          battleArea: [{ card: "BT7-047", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.battleArea.length === 0);
    const source = (s.state.players[0] as PlayerState).battleArea.find((p) => p.topCard?.cardId === "BT7-083");
    expect(source?.stack.some((c) => c.instanceId === s.inst("material").instanceId)).toBe(true);
  });
});
