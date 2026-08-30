import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-023.js";
import "./BT1-095.js";

describe("BT1-023 SkullGreymon", () => {
  it("deletes an opponent Digimon with Blocker", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-023", as: "skullGreymon" }] },
        1: {
          battleArea: [
            { card: "BT1-072", as: "blocker", dp: 6000 },
            { card: "BT1-070", as: "other", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    const blockerId = s.perm("blocker").permanentId;
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !opponent.battleArea.some((permanent) => permanent.permanentId === blockerId));

    expect(opponent.battleArea.map((permanent) => permanent.permanentId)).toContain(s.perm("other").permanentId);
  });

  it("deletes a Digimon that gained Blocker from an Option card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-023", as: "skullGreymon" }] },
        1: {
          battleArea: [
            { card: "BT1-070", as: "grantedBlocker", suspended: true },
            { card: "BT1-009", as: "redColorSource" },
          ],
          hand: [{ card: "BT1-095", as: "braveShield" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = -5;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("braveShield").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("grantedBlocker"), "Blocker"));

    s.state.turnSeat = 0;
    s.state.memory = 7;
    const blockerId = s.perm("grantedBlocker").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === blockerId));

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-070")).toBe(true);
  });

  it("does nothing when the opponent has no Blocker", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-023", as: "skullGreymon" }] },
        1: { battleArea: [{ card: "BT1-070", as: "nonBlocker", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT1-070");
  });

  it("does not activate its On Play effect when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "base" }],
          hand: [{ card: "BT1-023", as: "skullGreymon" }],
          deck: [{ card: "BT1-024", as: "drawn" }, { card: "BT1-025", as: "remaining" }],
        },
        1: { battleArea: [{ card: "BT1-070", as: "nonBlocker", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("skullGreymon").instanceId);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("remaining").instanceId);
  });
});
