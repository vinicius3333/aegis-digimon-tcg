import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT13/BT13-007.js";
import "../BT14/BT14-046.js";
import "../EX9/EX9-043.js";
import "../index.js";

describe("ST12-03 Solarmon", () => {
  it("prevents King Drasil's Royal Knight reduction from activating in breeding (Q754)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", under: ["BT1-001", "BT1-002"] },
          hand: [{ card: "BT13-040", as: "knight" }],
        },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("knight").instanceId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT13-007")).toHaveLength(0);
  });

  it("prevents both players from reducing play costs", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST12-03", "BT1-027"], hand: [{ card: "ST9-09", as: "stingmon" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(0);
  });

  it("also prevents the opponent from reducing a play cost", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT1-027"], hand: [{ card: "ST9-09", as: "stingmon" }] },
      1: { battleArea: ["ST12-03"] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(0);
  });

  it("allows an unblocked green Tamer reduction and pays its suspend cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-046", as: "togemon" }], hand: [{ card: "BT1-089", as: "mimi" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(3);
    expect(s.perm("togemon").isSuspended).toBe(true);
  });

  it("prevents an opponent green Tamer reduction and its suspend cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-046", as: "togemon" }], hand: [{ card: "BT1-089", as: "mimi" }] },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = -6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(-10);
    expect(s.perm("togemon").isSuspended).toBe(false);
  });

  it("scopes the lock to play costs and leaves an inherited Togemon evolution reduction active", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-045", as: "host", under: ["BT14-046"] },
          { card: "BT1-089", as: "mimi" },
        ],
        hand: [{ card: "BT14-050", as: "piximon" }],
      },
      1: { battleArea: ["ST12-03"] },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("piximon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT14-050");
    expect(s.state.memory).toBe(8);
  });

  it("does not block an effect that plays a Digimon without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-03", { card: "BT13-090", as: "royal", under: ["ST12-08"] }],
          trash: [{ card: "ST12-12", as: "sister" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("royal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("sister").instanceId),
    );
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("sister").instanceId)).toBe(false);
  });

  it("also prevents a green Tamer's play-cost reduction and its suspend cost (Q755)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-03", { card: "BT14-046", as: "togemon" }, { card: "BT1-064", as: "green" }],
          hand: [{ card: "BT1-089", as: "mimi" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 4);
    expect(s.state.memory).toBe(0);
    expect(s.perm("togemon").isSuspended).toBe(false);
    expect(s.perm("green").isSuspended).toBe(false);
  });

  it("does not perform an unaffordable blocked Tamer play or pay its suspend cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-046", as: "togemon" }], hand: [{ card: "BT1-089", as: "mimi" }] },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = -10;

    const rejected = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId });
    expect(rejected).toEqual({ ok: true });
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    await settle();
    expect(s.state.memory).toBe(-10);
    expect(s.perm("togemon").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("mimi").instanceId)).toBe(true);
    expect(s.decisions).toHaveLength(0);
  });

  it("blocks a direct BeforePayCost reducer without paying its hand-trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-03"],
          hand: [
            { card: "EX9-043", as: "metal" },
            { card: "BT1-021", as: "payment" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("metal").instanceId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-021"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });
});
