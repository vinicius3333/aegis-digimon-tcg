import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-030.js";
import "../index.js";

describe("BT26-030 Pumpkinmon", () => {
  it("models the TS evolution, Security play, and hand-trash keyword cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              from: ["hand", "trash"],
              payCost: false,
              target: expect.objectContaining({ filter: expect.objectContaining({ playCostLte: 4 }) }),
              optional: true,
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({
              kind: "CostGatedBlock",
              cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
              optional: true,
              actions: [
                expect.objectContaining({ kind: "SelectBind" }),
                expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Execute" } }),
                expect.objectContaining({ kind: "GrantStatic", grant: "effects", tokens: ["Execute"] }),
                expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Ascension" } }),
              ],
            }),
          ],
        }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
      ]),
    );
  });

  it("publicly pays the hand-trash cost and grants Execute plus Ascension to an Iliad Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-030", as: "pumpkinmon" },
            { card: "BT24-019", as: "iliad" },
          ],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("iliad").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pumpkinmon"));
    await settle(() => s.state.players[0]!.hand.length === 0);

    expect(Array.from(s.perm("iliad").keywords)).toEqual(expect.arrayContaining(["Execute", "Ascension"]));
    expect(Array.from(s.perm("pumpkinmon").keywords)).not.toEqual(expect.arrayContaining(["Execute", "Ascension"]));
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("makes the granted Execute attack, self-delete, and use the granted Ascension", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-030", as: "pumpkinmon" },
            { card: "BT24-019", as: "iliad" },
          ],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: { security: ["BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("iliad").permanentId);
    const iliadId = s.perm("iliad").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pumpkinmon"));
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("iliad"));
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === iliadId) &&
        s.state.players[1]!.security.length === 1,
    );

    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: iliadId, faceUp: false });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may decline the hand-trash cost and grants neither keyword", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-030", as: "pumpkinmon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pumpkinmon"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(Array.from(s.perm("pumpkinmon").keywords)).not.toEqual(expect.arrayContaining(["Execute", "Ascension"]));
  });

  it("does not grant either keyword when the hand-trash cost cannot be paid", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-030", as: "pumpkinmon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pumpkinmon"));

    expect(Array.from(s.perm("pumpkinmon").keywords)).not.toEqual(expect.arrayContaining(["Execute", "Ascension"]));
  });

  it("evolves from a level-4 TS Digimon for 3 and grants both keywords at When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-035", as: "tsBase" }],
          hand: [
            { card: "BT26-030", as: "pumpkinmon" },
            { card: "BT1-001", as: "cost" },
          ],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("pumpkinmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.perm("tsBase").topCard.cardId).toBe("BT26-030");
    expect(Array.from(s.perm("tsBase").keywords)).toEqual(expect.arrayContaining(["Execute", "Ascension"]));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("plays only a cost-4-or-less Angel/TS card from hand or trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-055", as: "tooExpensive" },
            { card: "BT1-009", as: "unrelated" },
          ],
          trash: [{ card: "BT24-083", as: "eligible" }],
          security: [{ card: "BT26-030", as: "pumpkinmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("pumpkinmon"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("tooExpensive").instanceId, s.inst("unrelated").instanceId]),
    );
  });

  it("resolves its Security effect before still battling the attacker (Q6996)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }] },
        1: {
          trash: [{ card: "BT24-083", as: "eligible" }],
          security: [{ card: "BT26-030", as: "pumpkinmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"), 5000);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("eligible").instanceId,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({ resolution: "battle" });
  });
});
