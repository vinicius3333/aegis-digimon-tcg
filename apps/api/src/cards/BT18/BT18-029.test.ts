import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-029.js";

describe("BT18-029 AncientMermaimon", () => {
  it("raises its return level ceiling for each other Digimon", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Return", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } } } },
        {
          kind: "CostModifier",
          mode: "raiseCeiling",
          costType: "level",
          amount: 1,
          scaling: { unit: "cards", filter: { excludeSelf: true, kind: ["Digimon"] } },
        },
      ],
    });
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-029", as: "ancient" }], battleArea: [{ card: "BT1-030", as: "other" }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it.each([
    ["returns", 0, "hand"],
    ["plays", 1, "battleArea"],
  ])("%s a qualifying blue level 4 source when leaving play", async (_verb, optionIndex, destination) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT18-029", as: "ancient", under: ["BT18-022"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: optionIndex },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId]);
    await settle(() =>
      destination === "hand"
        ? s.state.players[0]!.hand.some((card) => card.cardId === "BT18-022")
        : s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT18-022"),
    );

    const cards =
      destination === "hand"
        ? s.state.players[0]!.hand
        : s.state.players[0]!.battleArea.map((permanent) => permanent.topCard);
    expect(cards.some((card) => card.cardId === "BT18-022")).toBe(true);
  });

  it("naturally returns an opposing level 4 when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-027", as: "base" }],
          hand: [{ card: "BT18-029", as: "ancient" }],
        },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const targetId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === targetId));

    expect(s.state.players[1]!.hand.some(({ instanceId }) => instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === targetId)).toBe(false);
  });

  it("DigiXroses with distinct Lanamon and Calmaramon slots for 2 less each", async () => {
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Lanamon"] }, { names: ["Calmaramon"] }], count: 2 },
    ]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-029", as: "ancient" },
          { card: "BT18-023", as: "lanamon" },
          { card: "BT18-024", as: "calmaramon" },
        ],
      },
    });
    s.state.memory = 12;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: { materialInstanceIds: [s.inst("lanamon").instanceId, s.inst("calmaramon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.stack.length === 2);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId).sort()).toEqual([
      "BT18-023",
      "BT18-024",
    ]);
  });
});
