import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-04", () => {
  it("implements the errata's one-source removal boundary", () => {
    expect(getCardDefinition("ST21-04")?.effectText).toContain("1 or fewer digivolution cards");
    const action = runtimeCompiledCard("ST21-04")?.effects.find(x => x.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({ kind: "TrashDigivolution", target: { count: 1 }, amount: 1, scaling: { per: 2, unit: "colors" } });
  });
  it("makes Alliance mandatory while keeping the subsequent attack optional", () => {
    const actions = runtimeCompiledCard("ST21-04")?.effects.find(x => x.trigger === "YourTurn")?.actions ?? [];
    expect(actions.some(a => a.kind === "SubTrigger")).toBe(true);
    expect(actions.at(-1)).toMatchObject({ kind: "Attack", optional: true });
  });

  it("trashes one top source per two Tamer colors, then returns the one-source target", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tai" }, { card: "BT1-086", as: "matt" }],
        hand: [{ card: "ST21-04", as: "zudomon" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", under: ["ST21-02", "ST21-03"] }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zudomon").instanceId })).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).hand.some((card) => card.cardId === "BT1-009"));

    expect((s.state.players[1] as PlayerState).hand.filter((card) => card.cardId === "BT1-009")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect((s.state.players[1] as PlayerState).trash.filter((card) => card.cardId === "ST21-03")).toHaveLength(1);
    expect((s.state.players[1] as PlayerState).trash.filter((card) => card.cardId === "ST21-02")).toHaveLength(1);
  });
});
