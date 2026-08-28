import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST14-02.js";
import "./ST14-03.js";

describe("ST14-02 Impmon", () => {
  it("digivolves into Beelzemon from trash for cost 3 when attacking with 20 trash", async () => {
    const trash = [...Array.from({ length: 19 }, () => "BT1-009"), { card: "ST14-08", as: "beel" }];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST14-02", as: "imp" }], trash } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("imp"));
    await settle(() => s.perm("imp").topCard.cardId === "ST14-08");
    expect(s.perm("imp").topCard.cardId).toBe("ST14-08");
    expect(s.state.memory).toBe(2);
  });
  it("deletes an opposing level 3 when its host mills", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-010", as: "host", under: ["ST14-02"] }],
          hand: [{ card: "ST14-03", as: "miller" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("miller").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not allow Blast Mode as the Beelzemon name target", async () => {
    const trash = [...Array.from({ length: 20 }, () => "BT1-009"), { card: "ST14-10", as: "blast" }];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST14-02", as: "imp" }], trash } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("imp"));
    expect(s.perm("imp").topCard.cardId).toBe("ST14-02");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST14-10")).toBe(true);
  });

  it("cannot use the trash digivolution below 20 cards", async () => {
    const trash = [...Array.from({ length: 18 }, () => "BT1-009"), { card: "ST14-08", as: "beel" }];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST14-02", as: "imp" }], trash } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
      },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("imp"));
    expect(s.perm("imp").topCard.cardId).toBe("ST14-02");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST14-08")).toBe(true);
  });
});
