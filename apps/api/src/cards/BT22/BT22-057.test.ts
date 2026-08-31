import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-057.js";
import "./index.js";

describe("BT22-057 Kurisarimon", () => {
  it("limits the optional Arata Sanada play to one or fewer Tamers", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Arata Sanada"], match: "name" }] }, count: 1 },
      condition: { kind: "permanentCount", filter: { controller: "mine", kind: ["Tamer"] }, op: "lte", value: 1 },
    });
  });

  it("anchors the inherited Diaboromon leave prevention to this Digimon", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          actions: [{ kind: "Prevent", mode: "leavePlay" }],
        },
      ],
    });
  });

  it("digivolves from a CS level 3 for 2 and optionally plays Arata from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-053", as: "keramon" }],
          hand: [
            { card: "BT22-057", as: "kurisarimon" },
            { card: "BT22-091", as: "arata" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("keramon").permanentId,
        instanceId: s.inst("kurisarimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("keramon").topCard?.cardId).toBe("BT22-057");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091")).toBe(true);
  });

  it("does not play Arata when 2 Tamers are already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-053", as: "keramon" },
            { card: "BT22-090", as: "tamer-1" },
            { card: "BT22-092", as: "tamer-2" },
          ],
          hand: [
            { card: "BT22-057", as: "kurisarimon" },
            { card: "BT22-091", as: "arata" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("keramon").permanentId,
        instanceId: s.inst("kurisarimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-091")).toBe(true);
  });

  it("pays the inherited cost by deleting another Diaboromon and keeps its host in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-064", as: "host", under: ["BT22-057"] },
            { card: "BT5-084", as: "other-diaboromon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> } }
    ).primitives.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-084")).toBe(true);
  });
});
