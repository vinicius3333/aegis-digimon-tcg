import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./index.js";
import { compiled } from "./EX8-058.js";

describe("EX8-058", () => {
  it("gains 1 memory on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
    }));
  it("inherits once-per-turn deletion of an opposing level 3 Digimon when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", levels: [3] } } }],
    }));
  it("exposes the level-3 DS evolution route for cost 2", () =>
    expect(digivolutionRequirementsFor("EX8-058")).toContainEqual({
      level: 3,
      traits: ["DS"],
      cost: 2,
      isAlternate: true,
    }));
  it("gains memory when the live permanent is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-058", as: "gesomon" }] } });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("gesomon").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
  it("deletes an exact opposing level 3 target but not a level 4 target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-058"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "level3" },
          { card: "EX8-058", as: "level4" },
        ],
      },
    });
    const level3InstanceId = s.perm("level3").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === level3InstanceId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === level3InstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-058")).toBe(true);
  });

  it("evolves from an off-color DS base and carries its inherited effect into a legal level-5 stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-017", as: "lineage" }],
          hand: [
            { card: "EX8-058", as: "gesomon" },
            { card: "EX8-061", as: "marineDevimon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "level3" },
            { card: "AD1-001", as: "level4" },
          ],
          security: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lineage").permanentId,
        instanceId: s.inst("gesomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lineage").topCard.cardId === "EX8-058");
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lineage").permanentId,
        instanceId: s.inst("marineDevimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lineage").topCard.cardId === "EX8-061");
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lineage").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard.cardId !== "BT1-010"));

    expect(s.perm("lineage").stack.map((card) => card.cardId)).toEqual(["EX8-017", "EX8-058"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["AD1-001"]);
  });

  it("rejects the trait route from an off-color non-DS level 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "nonDs" }],
        hand: [{ card: "EX8-058", as: "gesomon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonDs").permanentId,
        instanceId: s.inst("gesomon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(2);
    expect(s.perm("nonDs").topCard.cardId).toBe("BT1-029");
  });
});
