import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-016.js";
import "../index.js";

const CARD_ID = "BT26-016";

function primitives(s: ReturnType<typeof setupEngine>): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT26-016 Chronomon: Holy Mode", () => {
  it("evolves from an off-color Lv.5 TS Digimon for exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-061", as: "tsBase" }],
          hand: [{ card: CARD_ID, as: "holy" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("holy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.perm("tsBase").stack.at(-1)?.cardId).toBe("BT24-061");
  });

  it("encodes shared once-per-turn delete/recovery triggers and leave replacement", () => {
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", frequency: "OncePerTurn", sharedUseKey: `${CARD_ID}/delete-recover` },
      { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: `${CARD_ID}/delete-recover` },
      { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: `${CARD_ID}/delete-recover` },
      { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent" }] },
    ]);
  });

  it("publicly deletes first, returns mixed trash cards, and resolves Recovery +1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          trash: ["BT1-009", "BT1-010"],
          deck: [{ card: "BT1-011", as: "recovery" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 1000 }], trash: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT1-011", faceUp: false });
    expect(s.state.players[0]!.deck.length + s.state.players[1]!.deck.length).toBe(3);
  });

  it("removes a deleted card from trash before its pending On Deletion can activate (Q6977)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          trash: ["BT1-009"],
          deck: [{ card: "BT1-011", as: "recovery" }],
        },
        1: {
          battleArea: [
            { card: "BT10-008", as: "shoutmon", dp: 1000 },
            { card: "AD1-019", as: "tamer" },
          ],
          trash: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));
    await settle(() => s.state.players[1]!.deck.some((card) => card.cardId === "BT10-008"));

    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT10-008");
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT1-011", faceUp: false });
  });

  it("publishes printed Piercing and Engage and spends one security to prevent a real deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          security: [{ card: "BT1-009", as: "cost" }],
          deck: [{ card: "BT1-010", as: "oldBottom" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect([...s.perm("holy").keywords]).toEqual(expect.arrayContaining(["Piercing", "Engage"]));

    expect(await primitives(s).deletePermanent([s.perm("holy").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.at(-1)).toMatchObject({ cardId: "BT1-009", faceUp: false });
  });
});
