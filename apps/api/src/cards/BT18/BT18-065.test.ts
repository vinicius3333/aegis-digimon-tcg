import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-065.js";
import { compiled } from "./BT18-065.js";

describe("BT18-065 Snatchmon", () => {
  it("uses exactly four Vemmon slots and unlocks trash while there are no non-Vemmon Digimon", async () => {
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ names: ["Vemmon"] }], count: 1, maxMaterials: 4 }]);
    expect(compiled.effects[0]?.actions[0]?.condition?.kind).toBe("youHaveNone");

    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-065", as: "snatchmon" }],
          trash: [{ card: "BT18-060", as: "vemmon" }],
        },
      },
      {},
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("snatchmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("vemmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await s.ready();

    expect(s.state.players[0]!.battleArea[0]?.topCard?.cardId).toBe("BT18-065");
    expect(s.state.players[0]!.battleArea[0]?.stack.map((card) => card.cardId)).toContain("BT18-060");
    expect(s.state.memory).toBe(5);
  });

  it("keeps trash locked when the player controls a non-Vemmon Digimon", () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-057" }],
          hand: [{ card: "BT18-065", as: "snatchmon" }],
          trash: [{ card: "BT18-060", as: "vemmon" }],
        },
      },
      {},
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("snatchmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("vemmon").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("places up to two Vemmon from trash under itself when digivolving", async () => {
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: { from: ["trash"] },
      underFilter: { isSelfRef: true },
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-057", as: "base" }],
          hand: [{ card: "BT18-065", as: "snatchmon" }],
          trash: [{ card: "BT18-060", as: "vemmonOne" }],
        },
      },
      {},
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("snatchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.ready();
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    const optional = s.decisions.find((decision) => decision.req.kind === "optional");
    expect(optional).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional!.req.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "selectCards"));
    const selection = s.decisions.find((decision) => decision.req.kind === "selectCards");
    expect(selection).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection!.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("vemmonOne").instanceId] },
      }),
    ).toEqual({ ok: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await s.ready();
    expect(s.perm("base").topCard?.cardId).toBe("BT18-065");
    expect(s.perm("base").stack.filter((card) => card.cardId === "BT18-060")).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT18-060")).toHaveLength(0);
  });
});
