import { compiledEffects, dnaDigivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../index.js";
import { compiled } from "./BT25-038.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";

const seats = [0, 1] as const;
const pairs = [
  ["Yellow + Blue", "BT1-051", "BT25-023"],
  ["Yellow + Black", "BT1-051", "BT25-066"],
  ["Paulo Angemon + Seadramon", "BT23-027", "BT23-020"],
  ["Paulo Ankylomon + Seadramon", "BT23-050", "BT23-020"],
] as const;

describe("#5358 BT25-038 public DNA routes", () => {
  it("keeps source IR and client snapshot DNA requirements identical", () => {
    expect(compiledEffects["BT25-038"]?.dnaDigivolveRequirement).toEqual(compiled.dnaDigivolveRequirement);
    expect(dnaDigivolutionRequirementsFor("BT25-038")).toEqual(compiled.dnaDigivolveRequirement);
  });
  for (const seat of seats) {
    for (const reverse of [false, true]) {
      it.each(pairs)(`accepts %s at cost 0, seat ${seat}, reversed ${reverse}`, async (_label, a, b) => {
        const s = setupEngine(
          {
            [seat]: {
              battleArea: [
                { card: a, as: "a", suspended: true, under: ["BT1-045"] },
                { card: b, as: "b", suspended: true, under: ["BT1-010"] },
              ],
              hand: [{ card: "BT25-038", as: "shakkou" }],
              security: ["BT1-009"],
              deck: ["BT1-010", "BT1-010"],
            },
            [1 - seat]: { security: ["BT1-009"] },
          },
          { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
        );
        s.state.turnSeat = seat;
        s.state.memory = 0;
        await s.ready();
        expect(getCardDefinition(a)?.colors).toContain("Yellow");
        expect(getCardDefinition(b)?.level).toBe(4);
        const ids = [s.perm("a").permanentId, s.perm("b").permanentId];
        const routes = [...s.inst("shakkou").dnaDigivolveRoutes];
        expect(routes).toHaveLength(1);
        expect(JSON.parse(routes[0]!.materialPermanentIdsJson).sort()).toEqual([...ids].sort());
        expect(routes[0]!.projectedCost).toBe(0);
        const sources = ["a", "b"].flatMap((alias) => [
          ...s.perm(alias).stack.map((card) => card.instanceId),
          s.inst(alias).instanceId,
        ]);
        expect(
          s.engine.applyIntent(seat, {
            type: "dnaDigivolve",
            instanceId: s.inst("shakkou").instanceId,
            materialPermanentIds: reverse ? [...ids].reverse() : ids,
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[seat]!.battleArea.some((p) => p.topCard.cardId === "BT25-038") &&
            s.state.pendingDecision === undefined &&
            s.state.players[0]!.security.length === 0 &&
            s.state.players[1]!.security.length === 0,
        );
        expect(s.state.players[seat]!.battleArea).toHaveLength(1);
        expect(
          s
            .perm("shakkou")
            .stack.map((card) => card.instanceId)
            .sort(),
        ).toEqual(sources.sort());
        expect(s.perm("shakkou").isSuspended).toBe(false);
        expect(s.state.memory).toBe(0);
        expect(s.state.players[seat]!.deck).toHaveLength(1);
        assertNoLoudGap(s);
      });
    }

    it(`projects both combinations together and consumes the selected Black pair, seat ${seat}`, async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [
              { card: "BT1-051", as: "yellow" },
              { card: "BT25-023", as: "blue" },
              { card: "BT25-066", as: "black" },
            ],
            hand: [{ card: "BT25-038", as: "shakkou" }],
            deck: ["BT1-010", "BT1-010"],
          },
        },
        { autoDeclineOptional: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 0;
      await s.ready();
      const routes = [...s.inst("shakkou").dnaDigivolveRoutes];
      const expected = ["blue", "black"].map((alias) =>
        [s.perm("yellow").permanentId, s.perm(alias).permanentId].sort(),
      );
      expect(routes.map((route) => JSON.parse(route.materialPermanentIdsJson).sort())).toEqual(
        expect.arrayContaining(expected),
      );
      expect(routes).toHaveLength(2);
      expect(routes.map((route) => route.projectedCost)).toEqual([0, 0]);
      const chosen = routes.find((route) =>
        JSON.parse(route.materialPermanentIdsJson).includes(s.perm("black").permanentId),
      )!;
      expect(
        s.engine.applyIntent(seat, {
          type: "dnaDigivolve",
          instanceId: s.inst("shakkou").instanceId,
          materialPermanentIds: JSON.parse(chosen.materialPermanentIdsJson),
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[seat]!.battleArea.some((p) => p.topCard.cardId === "BT25-038") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.players[seat]!.battleArea.map((p) => p.topCard.cardId).sort()).toEqual(["BT25-023", "BT25-038"]);
      expect(s.state.memory).toBe(0);
      assertNoLoudGap(s);
    });

    it.each([
      ["yellow level 3", "BT1-045", "BT25-023", false, false, "invalid-evolution"],
      ["blue level 3", "BT1-051", "BT1-028", false, false, "invalid-evolution"],
      ["yellow level 6", "BT1-062", "BT25-023", false, false, "invalid-evolution"],
      ["red level 4 partner", "BT1-051", "BT1-014", false, false, "invalid-evolution"],
      ["two blue level 4s", "BT25-023", "BT25-023", false, false, "invalid-evolution"],
      ["two yellow level 4s", "BT1-051", "BT1-051", false, false, "invalid-evolution"],
      ["duplicate multicolor material", "BT25-037", "BT25-023", true, false, "invalid-evolution"],
      ["blue material in breeding", "BT1-051", "BT25-023", false, true, "no-such-permanent"],
    ] as const)(`rejects %s without mutation, seat ${seat}`, async (_label, a, b, duplicate, breeding, reason) => {
      const s = setupEngine({
        [seat]: {
          battleArea: [{ card: a, as: "a" }, ...(breeding ? [] : [{ card: b, as: "b" }])],
          ...(breeding ? { breeding: { card: b, as: "b" } } : {}),
          hand: [{ card: "BT25-038", as: "shakkou" }],
        },
      });
      s.state.turnSeat = seat;
      s.state.memory = 0;
      await s.ready();
      expect(s.inst("shakkou").dnaDigivolveRoutes).toHaveLength(duplicate ? 1 : 0);
      const before = JSON.stringify(s.state);
      expect(
        s.engine.applyIntent(seat, {
          type: "dnaDigivolve",
          instanceId: s.inst("shakkou").instanceId,
          materialPermanentIds: [s.perm("a").permanentId, s.perm(duplicate ? "a" : "b").permanentId],
        }),
      ).toEqual({ ok: false, reason });
      expect(JSON.stringify(s.state)).toBe(before);
      assertNoLoudGap(s);
    });
  }
});
