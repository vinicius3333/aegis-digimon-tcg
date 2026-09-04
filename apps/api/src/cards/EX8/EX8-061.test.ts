import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-061.js";

describe("EX8-061", () => {
  it("has Scapegoat and once-per-turn attacks may play a level 4 or lower DS/Mollusk/Crustacean Digimon from trash with at least 1 memory", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Scapegoat",
      raw: "＜Scapegoat＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtLeast", value: 1 },
        },
      ],
    });
  });
  it("inherits an optional On Deletion play from trash with the same level and trait limits", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: { filter: { levelComparison: { op: "lte", value: 4 } } },
        },
      ],
    }));
  it("exposes the level-4 DS evolution route for cost 3", () =>
    expect(digivolutionRequirementsFor("EX8-061")).toContainEqual({
      level: 4,
      traits: ["DS"],
      cost: 3,
      isAlternate: true,
    }));

  it.each([
    ["DS", "EX8-018"],
    ["Mollusk", "BT11-063"],
    ["Crustacean", "BT14-021"],
  ])("plays the exact eligible %s card from trash during an attack", async (_trait, eligibleCardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-061", as: "source" }],
          trash: [eligibleCardId, "BT14-063", "BT1-010"],
        },
        1: { security: ["BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const player = s.state.players[0] as PlayerState;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === eligibleCardId));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === eligibleCardId)).toBe(true);
    expect(player.trash.some((card) => card.cardId === eligibleCardId)).toBe(false);
    expect(player.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT14-063", "BT1-010"]));
  });

  it("does not play from trash below the 1-memory threshold", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-061", as: "source" }], trash: ["EX8-018"] },
        1: { security: ["BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX8-018");
  });

  it("plays from trash only on the first attack each turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-061", as: "source" }], trash: ["EX8-018", "BT14-021"] },
        1: { security: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 1;
    preferred.push(s.state.players[0]!.trash.find((card) => card.cardId === "EX8-018")!.instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-018")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("source").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT14-021");
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId !== "EX8-061")).toHaveLength(
      1,
    );
  });

  it("uses Scapegoat against an opponent effect but not against its controller's effect", async () => {
    const protectedState = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-061", as: "marine" },
            { card: "BT1-010", as: "scapegoat" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    protectedState.state.turnSeat = 1;
    await protectedState.ready();
    expect(
      await advance(protectedState.engine).verb.deletePermanent(
        [protectedState.perm("marine").permanentId],
        "byEffect",
      ),
    ).toBe(0);
    expect(protectedState.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "EX8-061",
    ]);
    expect(protectedState.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-010");

    const ownEffect = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-061", as: "marine" },
            { card: "BT1-010", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    ownEffect.state.turnSeat = 0;
    await ownEffect.ready();
    expect(
      await advance(ownEffect.engine).verb.deletePermanent([ownEffect.perm("marine").permanentId], "byEffect"),
    ).toBe(1);
    expect(ownEffect.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-010"]);
  });
  it("plays the exact eligible DS card from trash through the inherited On Deletion effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX8-062", as: "host", under: ["EX8-061"] }], trash: ["EX8-058", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-058"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-058")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "EX8-058")).toBe(false);
  });

  it("digivolves for 3 from an off-color level-4 DS stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-021", as: "seadramon" }],
        hand: [{ card: "EX8-061", as: "marineDevimon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("seadramon").permanentId,
        instanceId: s.inst("marineDevimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("seadramon").topCard.cardId === "EX8-061");
    expect(s.state.memory).toBe(0);
    expect(s.perm("seadramon").stack.map((card) => card.cardId)).toEqual(["EX8-021"]);
  });
});
