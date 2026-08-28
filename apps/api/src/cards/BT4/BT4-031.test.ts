import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-031.js";

describe("BT4-031 MarinChimairamon", () => {
  it("returns another own Digimon as cost and an opposing Digimon without sources", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-031", as: "source" }],
          battleArea: [{ card: "BT4-026", as: "cost", under: ["BT4-024"] }],
        },
        1: { battleArea: [{ card: "BT4-025", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mine = s.state.players[0] as PlayerState;
    const opponent = s.state.players[1] as PlayerState;
    const costId = s.perm("cost").permanentId;
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !mine.battleArea.some((p) => p.permanentId === costId) && opponent.battleArea.length === 0);
    expect(mine.hand.some((card) => card.cardId === "BT4-026")).toBe(true);
    expect(mine.trash.some((card) => card.cardId === "BT4-024")).toBe(true);
  });

  it("cannot return an opposing Digimon that has digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-031", as: "source" }],
          battleArea: [{ card: "BT4-026", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT4-025", as: "target", under: ["BT4-024"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    const costId = s.perm("cost").permanentId;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-031"), 5000);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === costId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
  });

  it("may decline returning the cost and opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-031", as: "source" }],
          battleArea: [{ card: "BT4-026", as: "cost", under: ["BT4-024"] }],
        },
        1: { battleArea: [{ card: "BT4-025", as: "target" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 7;
    const costId = s.perm("cost").permanentId;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "confirm");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === costId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
  });
});
