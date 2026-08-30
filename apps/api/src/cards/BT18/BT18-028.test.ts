import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { makeInstance, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-028.js";

describe("BT18-028 AncientMegatheriummon", () => {
  it("trashes bottom sources and restricts only opposing Digimon left without sources", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "TrashDigivolution", amount: 2, fromTop: false },
        {
          kind: "Restrict",
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
          whileMatchesTargetFilter: true,
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay" }],
    });
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-028", as: "ancient" }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "empty" },
            { card: "BT1-030", as: "stacked", under: ["BT18-021", "BT18-022", "BT18-023"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    const emptyId = s.perm("empty").permanentId;
    const stackedId = s.perm("stacked").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(emptyId, "beSuspended"));
    expect(s.perm("stacked").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(emptyId, "beSuspended")).toBe(true);
    expect(observe(s.engine).isRestricted(stackedId, "beSuspended")).toBe(false);

    s.perm("empty").stack.push(makeInstance("BT1-010", 1, true));
    expect(observe(s.engine).isRestricted(emptyId, "beSuspended")).toBe(false);
  });

  it("plays a qualifying level 4 source when it would leave the battle area", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT18-028", as: "ancient", under: ["BT18-022"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT18-022"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT18-022")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT18-028")).toBe(true);
  });

  it("naturally trashes bottom sources and restricts empty opposing Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-027", as: "base" }],
          hand: [{ card: "BT18-028", as: "ancient" }],
        },
        1: {
          battleArea: [
            { card: "BT1-030", as: "empty" },
            { card: "BT1-030", as: "stacked", under: ["BT18-021", "BT18-022", "BT18-023"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const emptyId = s.perm("empty").permanentId;
    const stackedId = s.perm("stacked").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(emptyId, "beSuspended"));

    expect(s.perm("stacked").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(emptyId, "beSuspended")).toBe(true);
    expect(observe(s.engine).isRestricted(stackedId, "beSuspended")).toBe(false);
  });

  it("DigiXroses with one Kumamon and one Korikakumon for 2 less each", async () => {
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Kumamon"] }, { names: ["Korikakumon"] }], count: 2 },
    ]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-028", as: "ancient" },
          { card: "BT18-022", as: "kumamon" },
          { card: "BT18-025", as: "korikakumon" },
        ],
      },
    });
    s.state.memory = 11;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("kumamon").instanceId, s.inst("korikakumon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.stack.length === 2);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId).sort()).toEqual([
      "BT18-022",
      "BT18-025",
    ]);
  });

  it("rejects duplicate Kumamon for the distinct DigiXros slots and grants Ice-Snow", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-028", as: "ancient" }],
        hand: [
          { card: "BT18-028", as: "play" },
          { card: "BT18-022", as: "kumamonA" },
          { card: "BT18-022", as: "kumamonB" },
        ],
      },
    });
    s.state.memory = 11;
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("ancient"), "Ice-Snow")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("play").instanceId,
        digiXros: { materialInstanceIds: [s.inst("kumamonA").instanceId, s.inst("kumamonB").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });
});
