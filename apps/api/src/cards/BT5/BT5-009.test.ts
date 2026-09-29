import { describe, expect, it } from "vitest";
import { EffectDuration, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-009.js";

describe("BT5-009 Shoutmon", () => {
  it("adds a Shoutmon and a Digimon with Blitz from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-009", as: "source" }],
          deck: [
            { card: "BT5-014", as: "shoutmon" },
            { card: "BT5-017", as: "blitz" },
            "BT5-008",
            "BT5-011",
            "BT5-012",
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("shoutmon").instanceId, s.inst("blitz").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(3);
  });

  it("its inherited effect gives a Blitz host +2000 DP on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-014", as: "host", under: ["BT5-009"] }] } });
    advance(s.engine).ledgers.continuous.addKeywordGrant(s.perm("host").permanentId, "Blitz", EffectDuration.Permanent);
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("adds the single eligible card when only one printed category is present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-009", as: "source" }],
          deck: ["BT5-014", "BT5-008", "BT5-011", "BT5-012", "BT5-013"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.cardId === "BT5-014"));
    expect(player.hand.filter((card) => card.cardId === "BT5-014")).toHaveLength(1);
    expect(player.deck).toHaveLength(4);
  });

  it("applies the inherited bonus only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-014", as: "host", under: ["BT5-009"] }] } });
    advance(s.engine).ledgers.continuous.addKeywordGrant(s.perm("host").permanentId, "Blitz", EffectDuration.Permanent);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});

async function playShoutmonRevealing(deck: string[]): Promise<{ hand: string[]; deck: string[] }> {
  const s = setupEngine({ 0: { hand: [{ card: "BT5-009", as: "source" }], deck } }, { autoSelectCards: true });
  const player = s.state.players[0] as PlayerState;
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => player.deck.length + player.hand.length === deck.length && player.deck.length < deck.length);
  await settle(() => s.state.pendingDecision === undefined);
  return {
    hand: player.hand.map((card) => card.cardId),
    deck: player.deck.map((card) => card.cardId),
  };
}

describe("BT5-009 Shoutmon — KB Q&A rulings", () => {
  it("adds a revealed Blitz Digimon even when no Shoutmon-named Digimon is revealed (Q1288)", async () => {
    const result = await playShoutmonRevealing(["BT8-013", "BT5-008", "BT5-011", "BT5-012", "BT5-013"]);

    expect(result.hand).toEqual(["BT8-013"]);
    expect(result.deck).toHaveLength(4);
    expect(result.deck).not.toContain("BT8-013");
  });

  it("adds two ShoutmonDX copies because each has both Shoutmon in its name and Blitz (Q1289)", async () => {
    const result = await playShoutmonRevealing(["BT5-019", "BT5-019", "BT5-008", "BT5-011", "BT5-012"]);

    expect(result.hand).toEqual(["BT5-019", "BT5-019"]);
    expect(result.deck).toEqual(expect.arrayContaining(["BT5-008", "BT5-011", "BT5-012"]));
    expect(result.deck).toHaveLength(3);
  });

  it("adds exactly one Shoutmon-named Digimon and one Blitz Digimon (Q1290)", async () => {
    const shoutmonNamed = ["BT5-014", "BT5-009"];
    const blitz = ["BT5-017", "BT8-013"];
    const result = await playShoutmonRevealing([...shoutmonNamed, ...blitz, "BT5-013"]);

    expect(result.hand).toHaveLength(2);
    expect(result.hand.filter((id) => shoutmonNamed.includes(id))).toHaveLength(1);
    expect(result.hand.filter((id) => blitz.includes(id))).toHaveLength(1);
    expect(result.deck).toHaveLength(3);
    expect(result.deck).toContain("BT5-013");
  });
});
