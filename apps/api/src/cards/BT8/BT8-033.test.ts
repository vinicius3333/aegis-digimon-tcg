import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { effectiveColorsOf } from "../../engine/gameEngine/matchLifecycle.js";
import { type CardSpec, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT3/BT3-014.js";
import "./BT8-033.js";

describe("BT8-033 Armadillomon", () => {
  it("adds a revealed two-color yellow card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT8-033", as: "source" }],
          deck: [{ card: "BT8-037", as: "multicolor" }, "BT8-034", "BT8-035", "BT8-036"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("multicolor").instanceId));
    expect(player.deck).toHaveLength(3);
  });

  it("digivolves for 0 from a blue level-2 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-002", as: "blueEgg" }],
        hand: [{ card: "BT8-033", as: "armadillomon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueEgg").permanentId,
        instanceId: s.inst("armadillomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("blueEgg").topCard.instanceId).toBe(s.inst("armadillomon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});

async function playArmadillomonRevealing(deck: CardSpec[], battleArea: CardSpec[] = []) {
  const s = setupEngine(
    { 0: { hand: [{ card: "BT8-033", as: "source" }], deck, battleArea } },
    { autoSelectCards: true },
  );
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
    ok: true,
  });
  await settle();
  return s;
}

describe("BT8-033 Armadillomon — KB Q&A rulings", () => {
  it("adds a revealed yellow-and-red Option card to hand (Q1723)", async () => {
    const s = await playArmadillomonRevealing([
      { card: "BT12-104", as: "yellowRedOption" },
      "BT8-034",
      "BT8-035",
      "BT8-036",
    ]);
    const player = s.state.players[0] as PlayerState;

    expect(player.hand.map((card) => card.instanceId)).toEqual([s.inst("yellowRedOption").instanceId]);
    expect(player.deck).toHaveLength(3);
  });

  it("does not add a card that is only treated as yellow by its own effect (Q1724)", async () => {
    const s = await playArmadillomonRevealing(
      [{ card: "BT3-014", as: "treatedAsYellow" }, "BT8-034", "BT8-035", "BT8-036"],
      [{ card: "BT3-014", as: "silphymonInPlay" }],
    );
    const player = s.state.players[0] as PlayerState;

    expect(effectiveColorsOf(s.engine, s.perm("silphymonInPlay"))).toEqual(expect.arrayContaining(["Red", "Yellow"]));
    expect(player.hand).toHaveLength(0);
    expect(player.deck.some((card) => card.instanceId === s.inst("treatedAsYellow").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(4);
  });
});
