import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-072.js";

describe("EX8-072", () => {
  it("registers the mandatory Main delete effect", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main")?.actions).toHaveLength(2);
  });
  it("registers the [Trash][Your Turn] Barbamon (X Antibody) watcher", () => {
    expect(compiled.effects.find((entry) => entry.isFromTrash)).toMatchObject({ trigger: "YourTurn" });
  });
  it("registers the printed security activation", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true });
  });
  it("deletes an opponent level 7 or lower Digimon even when their hand has fewer than 5 cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-072", as: "option" }], battleArea: [{ card: "BT2-070", as: "purpleSource" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.length === 0);
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(0);
  });

  it("recounts the hand after trashing before applying the level maximum", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-072", as: "option" }], battleArea: [{ card: "BT2-070", as: "purple-source" }] },
        1: {
          hand: [
            { card: "BT1-010", as: "hand-1" },
            { card: "BT1-010", as: "hand-2" },
            { card: "BT1-010", as: "hand-3" },
            { card: "BT1-010", as: "hand-4" },
            { card: "BT1-010", as: "hand-5" },
            { card: "BT1-010", as: "hand-6" },
          ],
          battleArea: [{ card: "AD1-004", as: "level-six" }],
        },
      },
      { autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.length === 0);

    expect((s.state.players[1] as PlayerState).hand).toHaveLength(5);
    expect((s.state.players[1] as PlayerState).trash).toHaveLength(2);
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(0);
  });
  it("activates the Main deletion effect when revealed from security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
        1: { security: [{ card: "EX8-072", as: "option" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: targetId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => (s.state.players[0] as PlayerState).battleArea.length === 0);
    expect((s.state.players[0] as PlayerState).battleArea).toHaveLength(0);
  });
});
