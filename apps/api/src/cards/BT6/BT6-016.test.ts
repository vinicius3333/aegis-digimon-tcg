import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT6-016.js";
import "./BT6-016.js";

describe("BT6-016 Jesmon", () => {
  it("keeps the trigger self-targeted and per-copy once per turn", () => {
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
    const watcher = yourTurn?.actions?.find((action) => action.kind === "SubTrigger") as
      | (Record<string, unknown> & { actions?: Array<Record<string, unknown>> })
      | undefined;

    expect(watcher).toBeDefined();
    expect(watcher).not.toHaveProperty("once");
    expect(watcher).not.toHaveProperty("oncePerTurnKey");
    expect(watcher?.actions).toMatchObject([
      { kind: "ModifyDP", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
      { kind: "GainKeyword", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
    ]);
  });

  it("plays a Sistermon from hand without paying its cost when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-016", as: "jesmon" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT1-009", as: "secondPlay" },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const jesmon = s.perm("jesmon");
    const baseDp = jesmon.currentDP;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jesmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => jesmon.currentDP === baseDp + 3000 && observe(s.engine).hasPierce(jesmon));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT6-082")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((card) => card.topCard?.cardId === "BT6-082")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(jesmon.currentDP).toBe(baseDp + 3000);
  });
});
