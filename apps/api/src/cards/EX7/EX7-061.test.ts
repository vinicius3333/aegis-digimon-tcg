import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-061.js";
import "../index.js";

describe("EX7-061 Lilithmon (X Antibody)", () => {
  it("registers its own complete IR record", () => {
    expect(hasRegisteredCompiledCard("EX7-061")).toBe(true);
    expect(compiled.residual).toEqual([]);
  });

  it("requires Lilithmon or X Antibody in its own evolution stack before offering non-battle prevention", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["Lilithmon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "trait" },
            ],
          },
          actions: [
            {
              kind: "Prevent",
              cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true }, count: 1 } },
            },
          ],
        },
      ],
    }));

  it("keeps the turn-dependent once-per-turn deletion response", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [{ kind: "PlayWithoutCost", condition: { kind: "isYourTurn" } }],
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          condition: { kind: "isOpponentsTurn" },
        },
      ],
    }));

  it("does not prevent a battle deletion, even with a qualifying stack and an available cost Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-061", as: "lilith", under: ["BT3-091"] },
            { card: "BT1-009", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("lilith").permanentId], "byBattle")).toBe(1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("cost"));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX7-061");
  });

  it("prevents a non-battle departure by deleting another Digimon with a qualifying stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-061", as: "lilith", under: ["BT3-091"] },
            { card: "BT1-009", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costInstanceId = s.inst("cost").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("lilith").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("lilith"));
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.topCard?.instanceId !== costInstanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(costInstanceId);
  });

  it("can pay the prevention cost by deleting an opponent's other Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-061", as: "lilith", under: ["BT3-091"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponentCost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponentCostInstanceId = s.inst("opponentCost").instanceId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("lilith").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("lilith"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(opponentCostInstanceId);
  });

  it.each([
    { decline: false, label: "when no other Digimon exists" },
    { decline: true, label: "when the optional prevention cost is declined" },
  ])("leaves play without prevention $label", async ({ decline }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-061", as: "lilith", under: ["BT3-091"] },
            ...(decline ? [{ card: "BT1-009", as: "cost" }] : []),
          ],
        },
      },
      decline
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("lilith").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(decline ? 1 : 0);
    expect(decline ? s.perm("cost").topCard?.cardId : undefined).toBe(decline ? "BT1-009" : undefined);
  });

  it("does not prevent departure when Armor Purge prevents the accepted cost deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-061", as: "lilith", under: ["BT3-091"] },
            { card: "BT8-039", as: "protectedCost", under: ["BT8-046"] },
          ],
        },
        1: { battleArea: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("lilith").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("protectedCost").topCard?.cardId).toBe("BT8-046");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT8-039");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX7-061");
  });

  it("uses non-battle prevention only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-061", as: "lilith", under: ["BT3-091"] },
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-010", as: "secondCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("lilith").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");

    expect(await advance(s.engine).verb.deletePermanent([s.perm("lilith").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX7-061");
    expect(s.perm("secondCost").topCard?.cardId).toBe("BT1-010");
  });

  it("does not offer prevention or delete its cost Digimon without Lilithmon or X Antibody below it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-061", as: "lilith" },
            { card: "BT1-009", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("lilith").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("cost"));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX7-061");
  });

  it("responds to an opponent Digimon deletion by playing a purple level 4 on its controller's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-061", as: "lilith" }], trash: [{ card: "BT11-078", as: "target" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("target").instanceId)).toBe(
      true,
    );
  });

  it("responds to an opponent Digimon deletion by trashing the opponent's security on their turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-061", as: "lilith" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: [{ card: "BT1-001", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
  });
});
