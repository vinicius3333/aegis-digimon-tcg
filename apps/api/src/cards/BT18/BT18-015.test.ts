import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-015.js";
import "./BT18-019.js";

describe("BT18-015 Kimeramon", () => {
  it("retains its lowest-DP deletion clauses, DNA deletion trigger, and inherited Security Attack", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          cost: { kind: "deleteOwn" },
          target: { filter: { controller: "opponent", superlative: "lowestDP" } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          cost: { kind: "deleteOwn" },
          target: { filter: { controller: "opponent", superlative: "lowestDP" } },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "DnaDigivolve",
          optional: true,
          looseMaterials: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Kimeramon"], match: "name" }] } },
        },
      ],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "kimeramon", under: ["BT18-015"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kimeramon"), "SecurityAttack")).toBe(true);
  });

  it.each([
    ["When Digivolving", EffectTiming.WhenDigivolving],
    ["When Attacking", EffectTiming.OnUseAttack],
  ])("pays one own deletion to delete exactly one lowest-DP opponent at %s", async (_label, timing) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-015", as: "source" },
            { card: "BT1-030", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 3000, as: "low" },
            { card: "BT1-030", dp: 4000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    const costId = s.perm("cost").permanentId;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    await advance(s.engine).fire(timing, s.perm("source"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId).filter((id) =>
        [costId, sourceId].includes(id),
      ),
    ).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(lowId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(highId);
  });

  it("may decline without deleting either player's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-015", as: "source" },
            { card: "BT1-030", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-030", dp: 3000, as: "target" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("cost").permanentId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("target").permanentId,
    );
  });

  it("digivolves from a level 4 Composite for 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-013", as: "deltamon" }],
          hand: [{ card: "BT18-015", as: "kimeramon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("deltamon").permanentId,
        instanceId: s.inst("kimeramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("deltamon").topCard.cardId === "BT18-015");
    expect(s.state.memory).toBe(2);
    expect(s.perm("deltamon").stack.at(-1)?.cardId).toBe("BT18-013");
  });

  it("uses the deleted Kimeramon from trash with Machinedramon for Millenniummon DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-015", as: "kimeramon" },
            { card: "BT11-072", as: "machinedramon" },
          ],
          hand: [{ card: "BT18-019", as: "millenniummon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("kimeramon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT18-019"));
    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT18-019")!;
    expect(result.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT11-072", "BT18-015"]));
  });
});
