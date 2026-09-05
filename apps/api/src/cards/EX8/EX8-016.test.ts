import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../AD1/AD1-008.js";
import "../AD1/AD1-004.js";
import "../BT12/BT12-089.js";
import "./index.js";
import { compiled } from "./EX8-016.js";

describe("EX8-016", () => {
  it("has Security Attack +1 and Fortitude, and deletes the lowest-DP suspended opposing Digimon after suspending one", () => {
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
        { keyword: "Fortitude", raw: "＜Fortitude＞" },
      ]),
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Suspend", optional: true },
      { kind: "Delete", target: { filter: { suspended: true, superlative: "lowestDP" } } },
    ]);
  });
  it("restricts opposing attacks to suspended Digimon while this Digimon is suspended", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "Aura",
      effect: { kind: "restriction", restriction: "attackOnlySuspendedDigimon" },
      while: { kind: "selfIsSuspended" },
    }));
  it("exposes Security Attack +1 and Fortitude on live state", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-016", as: "dinomon" }] },
      1: { security: ["BT1-045", "BT1-046"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("dinomon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("dinomon"), "Fortitude")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dinomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-045", "BT1-046"]);
  });

  it("may suspend either player's Digimon and must delete the lowest suspended opponent (Q3877)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-016", as: "dinomon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", suspended: true },
            { card: "EX8-015", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("high").permanentId);
    const lowInstanceId = s.perm("low").topCard.instanceId;

    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dinomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === lowInstanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("high").isSuspended).toBe(true);
  });

  it("performs the mandatory deletion after declining the optional suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-014", as: "dinomon" }],
          hand: [{ card: "EX8-016", as: "evolved" }],
          deck: ["BT1-045"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    const targetId = s.perm("target").topCard.instanceId;

    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dinomon").permanentId,
        instanceId: s.inst("evolved").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === targetId));
    expect(s.perm("dinomon").topCard.cardId).toBe("EX8-016");
    expect(s.state.memory).toBe(0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("restricts Marsmon to suspended targets despite its may-attack grant (Q3878)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-016", as: "dinomon", suspended: true },
          { card: "BT1-009", as: "unsuspended" },
        ],
      },
      1: { battleArea: [{ card: "BT8-018", as: "marsmon" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dinomon").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("does not restrict an opponent Digimon unaffected by its effects (Q3880)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-016", as: "dinomon", suspended: true }] },
      1: { battleArea: [{ card: "AD1-008", as: "immune", under: ["BT12-089"] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasRestriction(s.perm("immune"), "attackOnlySuspendedDigimon")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("immune").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("replays itself through Fortitude and supports both printed cost-4 evolution routes", async () => {
    expect(digivolutionRequirementsFor("EX8-016")).toEqual(
      expect.arrayContaining([
        { level: 5, names: ["Tyrannomon"], cost: 4, isAlternate: true },
        { level: 5, traits: ["Dinosaur"], cost: 4, isAlternate: true },
      ]),
    );
    const fortitude = setupEngine(
      { 0: { battleArea: [{ card: "EX8-016", as: "dinomon", under: ["EX8-014"] }] } },
      { autoDeclineOptional: true },
    );
    await fortitude.ready();
    const dinomonId = fortitude.perm("dinomon").topCard.instanceId;
    const oldPermanentId = fortitude.perm("dinomon").permanentId;
    await advance(fortitude.engine).verb.deletePermanent([fortitude.perm("dinomon").permanentId], "byEffect");
    await settle(() =>
      fortitude.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === dinomonId),
    );
    expect(fortitude.state.players[0]!.battleArea).toHaveLength(1);
    expect(fortitude.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(dinomonId);
    expect(fortitude.state.players[0]!.battleArea[0]!.permanentId).not.toBe(oldPermanentId);
    expect(fortitude.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(fortitude.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX8-014"]);

    const evolution = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-035", as: "triceramon" }],
          hand: [{ card: "EX8-016", as: "dinomon" }],
          deck: ["BT1-045"],
        },
      },
      { autoDeclineOptional: true },
    );
    evolution.state.memory = 4;
    expect(
      evolution.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolution.perm("triceramon").permanentId,
        instanceId: evolution.inst("dinomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolution.perm("triceramon").topCard.instanceId === evolution.inst("dinomon").instanceId);
    expect(evolution.state.memory).toBe(0);
    expect(evolution.perm("triceramon").topCard.cardId).toBe("EX8-016");

    const named = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "masterTyrannomon" }],
          hand: [{ card: "EX8-016", as: "dinomon" }],
          deck: ["BT1-045"],
        },
      },
      { autoDeclineOptional: true },
    );
    named.state.memory = 4;
    expect(
      named.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: named.perm("masterTyrannomon").permanentId,
        instanceId: named.inst("dinomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => named.perm("masterTyrannomon").topCard.instanceId === named.inst("dinomon").instanceId);
    expect(named.state.memory).toBe(0);
    expect(named.perm("masterTyrannomon").topCard.cardId).toBe("EX8-016");
  });

  it("does not replay without digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-016", as: "dinomon" }] } });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("dinomon").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX8-016"]);
  });

  it("allows Raid to switch to an unsuspended target after a legal declaration (Q3879)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-016", as: "dinomon", suspended: true },
            { card: "BT1-009", as: "raidTarget", dp: 18000 },
          ],
        },
        1: { battleArea: [{ card: "AD1-004", as: "raider", dp: 20000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const dinomonId = s.perm("dinomon").permanentId;
    const targetId = s.inst("raidTarget").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "permanent", permanentId: dinomonId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === targetId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dinomonId)).toBe(true);
  });
});
