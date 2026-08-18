import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-072.js";

describe("BT6-072 Ogremon", () => {
  it("may trash a hand card to delete an opposing level 4 or lower Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { hand: [
      { card: "BT6-072", as: "source" }, { card: "BT6-073", as: "discard" },
    ] }, 1: { battleArea: [{ card: "BT6-011", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    const opponent = s.state.players[1] as PlayerState;
    preferred.push(s.inst("discard").instanceId);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0);
    expect((s.state.players[0] as PlayerState).trash.map((card) => card.instanceId)).toContain(s.inst("discard").instanceId);
  });

  it("cannot activate its deletion effect with an empty hand", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT6-072", as: "source" }] },
      1: { battleArea: [{ card: "BT6-011", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT6-072"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(s.perm("target").topCard?.instanceId);
  });
});
