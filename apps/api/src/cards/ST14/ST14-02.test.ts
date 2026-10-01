import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../EX2/EX2-044.js";
import "../EX2/EX2-065.js";
import "../EX2/EX2-074.js";
import "./ST14-02.js";
import "./ST14-03.js";
import "./ST14-08.js";
import "./ST14-10.js";

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

describe("ST14-02 Impmon — KB Q&A rulings", () => {
  const inertDeck = Array.from({ length: 8 }, () => "BT1-009");
  const inertSecurity = ["BT1-009", "BT1-013"];

  async function attackWithImpmon(s: ReturnType<typeof setupEngine>, done: () => boolean): Promise<void> {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("impmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && done());
  }

  it("can only digivolve into a card named exactly [Beelzemon], not [Beelzemon: Blast Mode] (Q796)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST14-02", as: "impmon" }],
          deck: inertDeck,
          trash: [
            ...Array.from({ length: 20 }, () => "BT1-009"),
            { card: "ST14-10", as: "blastMode" },
            { card: "ST14-08", as: "beelzemon" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    await s.ready();
    preferInstanceIds.push(s.inst("blastMode").instanceId);

    await attackWithImpmon(s, () => s.perm("impmon").topCard.cardId !== "ST14-02");

    expect(s.perm("impmon").topCard.instanceId).toBe(s.inst("beelzemon").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blastMode").instanceId)).toBe(true);
  });

  it("lets Ai & Mako digivolve the Beelzemon it just became into [Beelzemon: Blast Mode] from trash (Q797)", async () => {
    const boardWithTrashFillers = (fillers: number) =>
      setupEngine(
        {
          0: {
            battleArea: [
              { card: "ST14-02", as: "impmon" },
              { card: "EX2-065", as: "aiMako" },
            ],
            deck: inertDeck,
            trash: [
              ...Array.from({ length: fillers }, () => "BT1-009"),
              { card: "ST14-08", as: "beelzemon" },
              { card: "ST14-10", as: "blastMode" },
            ],
            security: inertSecurity,
          },
          1: { deck: inertDeck, security: inertSecurity },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["ST14-02"] },
      );

    const s = boardWithTrashFillers(20);
    s.state.memory = 10;
    await s.ready();
    await attackWithImpmon(s, () => s.perm("impmon").topCard.instanceId === s.inst("blastMode").instanceId);
    expect(s.perm("impmon").stack.map((card) => card.cardId)).toEqual(["ST14-02", "ST14-08"]);
    expect(s.perm("impmon").topCard.cardId).toBe("ST14-10");

    const withoutBeelzemon = boardWithTrashFillers(16);
    withoutBeelzemon.state.memory = 10;
    await withoutBeelzemon.ready();
    await attackWithImpmon(withoutBeelzemon, () => withoutBeelzemon.perm("aiMako").isSuspended);
    const trashIds = withoutBeelzemon.state.players[0]!.trash.map((card) => card.instanceId);
    expect(trashIds).toEqual(
      expect.arrayContaining([
        withoutBeelzemon.inst("beelzemon").instanceId,
        withoutBeelzemon.inst("blastMode").instanceId,
      ]),
    );
    expect(withoutBeelzemon.state.memory).toBe(10);
  });

  it("lets Ai & Mako's attack effect digivolve the new Beelzemon again into Blast Mode for 3 (Q3352)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST14-02", as: "impmon" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: inertDeck,
          trash: [
            ...Array.from({ length: 20 }, () => "BT1-009"),
            { card: "EX2-044", as: "beelzemon" },
            { card: "EX2-074", as: "blastMode" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["ST14-02"] },
    );
    s.state.memory = 10;
    await s.ready();

    await attackWithImpmon(s, () => s.perm("impmon").topCard.instanceId === s.inst("blastMode").instanceId);

    expect(s.perm("impmon").stack.map((card) => card.cardId)).toEqual(["ST14-02", "EX2-044"]);
    expect(s.perm("aiMako").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });
});
