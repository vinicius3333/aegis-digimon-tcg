import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-007.js";
import "../index.js";

const CARD_ID = "BT26-007";

describe("BT26-007 Swipemon", () => {
  it("exposes the inherited optional Once Per Turn When Attacking link effect", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      effects: [{ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" }],
    });
    expect(compiled.effects[0]!.actions[0]).toMatchObject({ kind: "Link", costDelta: -2, optional: true });
  });

  it("publicly links a Seven Code card from hand, reduces its link cost 3 to 1, and preserves face/order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", under: [{ card: CARD_ID, as: "swipemon" }] }],
          hand: [{ card: "BT26-010", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(-1);
    expect(s.perm("host").linked).toHaveLength(1);
    expect(s.perm("host").linked[0]).toMatchObject({ instanceId: s.inst("candidate").instanceId, faceUp: true });
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("may link an eligible card out of this Digimon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              under: [
                { card: CARD_ID, as: "swipemon" },
                { card: "BT26-010", as: "candidate" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("candidate").instanceId]);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("swipemon").instanceId]);
  });

  it("does not take a Seven Code link card from another Digimon's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "host", under: [{ card: CARD_ID, as: "swipemon" }] },
            { card: "BT21-009", as: "other", under: [{ card: "BT26-010", as: "otherSource" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.perm("other").stack.map((card) => card.instanceId)).toEqual([s.inst("otherSource").instanceId]);
  });

  it("enforces Once Per Turn across repeated attack windows", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", under: [{ card: CARD_ID }] }],
          hand: [
            { card: "BT26-010", as: "first" },
            { card: "BT26-019", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").linked).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(1);
  });

  it("does not link a Seven Code card without Link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", under: [CARD_ID] }],
          hand: [{ card: "BT26-102", as: "noLink" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("noLink").instanceId);
  });

  it("does not link a Link-capable Appmon without the Seven Code trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", under: [CARD_ID] }],
          hand: [{ card: "EX10-024", as: "nonSevenCode" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.memory).toBe(5);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonSevenCode").instanceId);
  });

  it("may decline without paying memory or moving the Seven Code card from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", under: [CARD_ID] }],
          hand: [{ card: "BT26-010", as: "candidate" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("candidate").instanceId]);
  });
});
