import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("GitHub #5340 Lanamon printed evolution costs", () => {
  for (const seat of [0, 1] as const) {
    for (const explicit of [false, true]) {
      it.each([
        ["BT11-112", 2],
        ["BT12-021", 2],
        ["BT12-025", 0],
      ] as const)(`seat ${seat}, explicit alternate ${explicit}: %s costs %i`, async (base, cost) => {
        const s = setupEngine(
          {
            [seat]: {
              battleArea: [{ card: base, as: "base" }],
              hand: [{ card: "BT12-024", as: "lanamon" }],
              deck: ["BT1-009", "BT1-010"],
            },
          },
          { autoDeclineOptional: true },
        );
        s.state.turnSeat = seat;
        s.state.memory = 5;
        await s.ready();
        const routes = [...s.inst("lanamon").digivolveRoutes].filter(
          (route) => route.permanentId === s.perm("base").permanentId,
        );
        expect(
          s.engine.applyIntent(seat, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("lanamon").instanceId,
            ...(explicit ? { useAlternateCost: true } : {}),
          }),
        ).toEqual({ ok: true });
        await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
        expect(s.perm("base").topCard.cardId).toBe("BT12-024");
        expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
        expect(s.state.players[seat]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
        expect(s.state.memory).toBe(5 - cost);
        expect([...new Set(routes.map((route) => route.projectedCost))]).toEqual([cost]);
      });
    }
    it.each(["BT12-088", "BT1-009"])(`seat ${seat}: rejects ineligible %s`, async (base) => {
      const s = setupEngine({
        [seat]: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT12-024", as: "lanamon" }] },
      });
      s.state.turnSeat = seat;
      s.state.memory = 5;
      await s.ready();
      for (const useAlternateCost of [false, true])
        expect(
          s.engine.applyIntent(seat, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("lanamon").instanceId,
            useAlternateCost,
          }),
        ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(s.perm("base").topCard.cardId).toBe(base);
      expect(s.state.memory).toBe(5);
    });
    it(`seat ${seat}: rejects the explicit Calmaramon zero-cost route onto Rina`, async () => {
      const s = setupEngine({
        [seat]: { battleArea: [{ card: "BT11-112", as: "rina" }], hand: [{ card: "BT12-024", as: "lanamon" }] },
      });
      s.state.turnSeat = seat;
      await s.ready();
      expect(
        s.engine.applyIntent(seat, {
          type: "digivolve",
          permanentId: s.perm("rina").permanentId,
          instanceId: s.inst("lanamon").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(s.perm("rina").topCard.cardId).toBe("BT11-112");
    });
  }
});

describe("GitHub #5340 hybrid mechanism sweep", () => {
  it.each([
    ["BT12-024", "BT11-112", 2, 1],
    ["BT12-025", "BT11-112", 3, 1],
    ["BT17-012", "BT12-088", 2, 0],
    ["BT17-012", "BT1-085", 3, undefined],
    ["BT4-025", "BT11-112", 2, 0],
    ["BT12-025", "BT12-021", 3, undefined],
    ["BT12-025", "BT12-024", 1, 0],
    ["BT12-012", "BT12-088", 2, 1],
    ["BT12-012", "BT12-009", 2, undefined],
    ["BT12-012", "BT12-013", 1, 0],
  ] as const)("%s onto %s pays %i via index %s", async (card, base, cost, index) => {
    for (const seat of [0, 1] as const) {
      const s = setupEngine(
        { [seat]: { battleArea: [{ card: base, as: "base" }], hand: [{ card, as: "evolving" }], deck: ["BT1-009"] } },
        { autoDeclineOptional: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(seat, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evolving").instanceId,
          ...(index === undefined ? {} : { useAlternateCost: true, alternateRequirementIndex: index }),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
      expect(s.perm("base").topCard.cardId).toBe(card);
      expect(s.state.memory).toBe(5 - cost);
    }
  });
  it("rejects an explicit nonmatching named BT17 hybrid route instead of silently deriving a Tamer route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-088", as: "takuya" }], hand: [{ card: "BT17-012", as: "agunimon" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("takuya").topCard.cardId).toBe("BT12-088");
  });
});

it.each([0, 1] as const)("GitHub #5340: seat %i cannot evolve onto the opposing blue Tamer", async (seat) => {
  const opponent = seat === 0 ? 1 : 0;
  const s = setupEngine({
    [seat]: { hand: [{ card: "BT12-024", as: "lanamon" }] },
    [opponent]: { battleArea: [{ card: "BT11-112", as: "rina" }] },
  });
  s.state.turnSeat = seat;
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(seat, {
      type: "digivolve",
      permanentId: s.perm("rina").permanentId,
      instanceId: s.inst("lanamon").instanceId,
      useAlternateCost: true,
    }),
  ).toMatchObject({ ok: false });
  expect(s.perm("rina").topCard.cardId).toBe("BT11-112");
  expect(s.state.memory).toBe(5);
});
