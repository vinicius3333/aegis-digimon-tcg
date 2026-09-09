import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-033.js";
import "./index.js";

const YELLOW_TAMER = "ST3-12";
const RED_TAMER = "BT12-088";
const INERT_SECURITY_DIGIMON = "BT1-013";

describe("BT17-033 GeoGreymon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition("BT17-033")).toMatchObject({
      cardId: "BT17-033",
      nameEn: "GeoGreymon",
      colors: ["Yellow"],
      level: 4,
      dp: 5000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      effectText: "[When Attacking] By suspending 1 of your yellow Tamers, this Digimon gets +3000 DP for the turn.",
      inheritedEffectText: "[Your Turn] All of your opponent's security Digimon get -3000 DP.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 3000,
            duration: "forTheTurn",
            cost: {
              kind: "suspend",
              target: {
                filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] },
                count: 1,
              },
              raw: "By suspending 1 of your yellow Tamers",
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "permanent" }],
        isInherited: true,
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("suspends a yellow Tamer for +3000 DP and survives an equal-DP security Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-033", as: "geo" },
            { card: YELLOW_TAMER, as: "tamer" },
          ],
        },
        1: { security: [{ card: INERT_SECURITY_DIGIMON, as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const geoId = s.perm("geo").permanentId;
    const securityId = s.inst("security").instanceId;
    expect(s.perm("geo").currentDP).toBe(5000);
    expect(s.perm("tamer").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: geoId, target: { kind: "player" } })).toEqual(
      { ok: true },
    );
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("geo").currentDP).toBe(8000);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === geoId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("cannot pay with a non-yellow Tamer, so it trades with the equal-DP security Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-033", as: "geo" },
            { card: RED_TAMER, as: "tamer" },
          ],
        },
        1: { security: [{ card: INERT_SECURITY_DIGIMON, as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const geoId = s.perm("geo").permanentId;
    const geoInstanceId = s.perm("geo").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: geoId, target: { kind: "player" } })).toEqual(
      { ok: true },
    );
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === geoId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([geoInstanceId]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
  });

  it("leaves the Tamer unsuspended and the DP unchanged when the optional cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-033", as: "geo" },
            { card: YELLOW_TAMER, as: "tamer" },
          ],
        },
        1: { security: [{ card: INERT_SECURITY_DIGIMON, as: "security" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const geoId = s.perm("geo").permanentId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: geoId, target: { kind: "player" } })).toEqual(
      { ok: true },
    );
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.decisions.some((decision) => decision.req.kind === "optional")).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === geoId)).toBe(false);
  });

  it("loses the +3000 DP once the turn ends", async () => {
    // The battle-time DP is read through `onEvent` because the attack hands the turn
    // over as soon as it resolves, and the grant is already gone by then.
    const dpDuringTurn: number[] = [];
    const s: ReturnType<typeof setupEngine> = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-033", as: "geo" },
            { card: YELLOW_TAMER, as: "tamer" },
          ],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          security: [{ card: INERT_SECURITY_DIGIMON, as: "security" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent: () => {
          const geo = s?.state.players[0]?.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-033");
          if (geo !== undefined) dpDuringTurn.push(geo.currentDP);
        },
      },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const geoId = s.perm("geo").permanentId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: geoId, target: { kind: "player" } })).toEqual(
      { ok: true },
    );
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(Math.max(...dpDuringTurn)).toBe(8000);
    expect(s.perm("geo").currentDP).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gives the opponent's security Digimon -3000 DP as an inherited effect on your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", under: ["BT17-033"], as: "host" }] },
      1: { security: [{ card: INERT_SECURITY_DIGIMON, as: "security" }] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const securityId = s.inst("security").instanceId;
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(s.perm("host").currentDP).toBe(4000);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // 5000 DP security Digimon reduced to 2000 loses to the 4000 DP attacker.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([securityId]);
  });

  it("does not reduce security DP on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", under: ["BT17-033"], as: "host" }] },
      1: { security: [{ card: INERT_SECURITY_DIGIMON, as: "security" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).securityDp(1)).toBe(0);
  });
});
