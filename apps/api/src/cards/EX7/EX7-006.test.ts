import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-006.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-006 Yaamon", () => {
  it("inherits once-per-turn paid Dark Dragon/Evil Dragon evolution from trash when your hand has four or fewer cards", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          optional: true,
          condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
        },
      ],
    }));

  it("may digivolve a legal purple host from trash by paying the printed cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          trash: ["BT11-079", "BT21-077"],
          battleArea: [{ card: "BT11-075", dp: 5000, as: "host", under: ["EX7-006"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.perm("host").topCard?.cardId === "BT11-079");
    expect(s.perm("host").topCard?.cardId).toBe("BT11-079");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT21-077"]);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX7-006", "BT11-075"]);
    // Regulusmon is now a legal next evolution, but the inherited use was spent.
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").topCard?.cardId).toBe("BT11-079");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT21-077"]);
    expect(s.state.memory).toBe(3);
  });

  it("may decline a legal trash evolution without paying or moving the card", async () => {
    const s = setupEngine(
      { 0: { trash: ["BT11-079"], battleArea: [{ card: "BT11-075", as: "host", under: ["EX7-006"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").topCard?.cardId).toBe("BT11-075");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT11-079"]);
    expect(s.state.memory).toBe(5);
  });

  it.each([
    { host: "BT11-075", candidate: "BT3-083", reason: "wrong trait despite legal purple evolution" },
    { host: "BT1-009", candidate: "BT11-079", reason: "wrong evolution color despite a matching trait" },
  ])("rejects $reason", async ({ host, candidate }) => {
    const s = setupEngine(
      { 0: { trash: [candidate], battleArea: [{ card: host, as: "host", under: ["EX7-006"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").topCard?.cardId).toBe(host);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([candidate]);
    expect(s.state.memory).toBe(5);
  });

  it("does not activate when the hand exceeds four cards", async () => {
    const s = setupEngine({
      0: {
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        trash: ["BT11-079"],
        battleArea: [{ card: "BT11-075", dp: 5000, as: "host", under: ["EX7-006"] }],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => false, 20);

    expect(s.perm("host").topCard?.cardId).toBe("BT11-075");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT11-079")).toBe(true);
  });
});
