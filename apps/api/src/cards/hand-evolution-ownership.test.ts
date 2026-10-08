import { describe, expect, it } from "vitest";
import { Phase, type Seat } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap, type SeatSpec, type EngineSetup } from "../engine/testkit/harness.js";
import "./index.js";

type Path = "BT10-041" | "BT12-089" | "BT20-083" | "BT26-001" | "BT26-034" | "BT26-044 suspend" | "BT26-044 trash";
const paths: Path[] = [
  "BT10-041",
  "BT12-089",
  "BT20-083",
  "BT26-001",
  "BT26-034",
  "BT26-044 suspend",
  "BT26-044 trash",
];

// These layouts extend the existing per-card public-intent examples with opposing physical
// copies. Both the no-own-card case and the ambiguous selection case were missing there.
function layout(path: Path): { mine: SeatSpec; other: SeatSpec; destination: string } {
  switch (path) {
    case "BT10-041":
      return { mine: { battleArea: [{ card: path, as: "host" }] }, other: {}, destination: "BT5-044" };
    case "BT12-089":
      return {
        mine: {
          battleArea: [
            { card: path, as: "origin" },
            { card: "BT12-007", as: "host" },
          ],
          trash: ["BT12-010", "BT12-016"],
        },
        other: {},
        destination: "BT12-018",
      };
    case "BT20-083":
      return {
        mine: { hand: [{ card: path, as: "host" }], security: ["BT1-010"] },
        other: {},
        destination: "BT10-086",
      };
    case "BT26-001":
      return {
        mine: {
          battleArea: [{ card: "BT24-015", as: "host", under: [path, "BT26-008", "BT26-013"] }],
          hand: [{ card: "BT26-073", as: "origin" }],
          trash: [{ card: "BT26-074", as: "returned" }],
        },
        other: { battleArea: [{ card: "BT1-009", as: "target" }] },
        destination: "BT26-016",
      };
    case "BT26-034":
      return {
        mine: { battleArea: [{ card: path, as: "host" }], eggDeck: ["BT1-001"] },
        other: {},
        destination: "BT26-039",
      };
    case "BT26-044 suspend":
      return {
        mine: { battleArea: [{ card: "BT26-044", as: "host" }], hand: [{ card: "BT26-042", as: "origin" }] },
        other: { battleArea: [{ card: "BT5-022", as: "target" }] },
        destination: "BT26-049",
      };
    case "BT26-044 trash":
      return {
        mine: {
          battleArea: [
            { card: "BT26-044", as: "host" },
            { card: "BT26-065", as: "attacker", under: ["BT26-005"], dp: 10000 },
            { card: "BT1-085", as: "tamer", under: [{ card: "BT1-010", as: "payment", faceUp: false }] },
          ],
          hand: [{ card: "BT1-009", as: "discard" }],
          trash: [{ card: "BT26-072", as: "playable" }],
        },
        other: { battleArea: [{ card: "BT26-060", as: "target", suspended: true, dp: 16000 }] },
        destination: "BT26-049",
      };
  }
}

async function trigger(s: EngineSetup, seat: Seat, path: Path): Promise<(() => Promise<void>) | undefined> {
  switch (path) {
    case "BT26-034": {
      const turn = s.engine.runOneTurn();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.state.phase).toBe(Phase.Breeding);
      expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      return async () => {
        s.engine.applyIntent(seat, { type: "surrender" });
        await turn;
      };
    }
    case "BT10-041":
      expect(
        s.engine.applyIntent(seat, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      return;
    case "BT12-089": {
      const effects = JSON.parse(s.perm("origin").activatableEffectsJson) as { effectKey: string }[];
      expect(effects).toHaveLength(1);
      expect(
        s.engine.applyIntent(seat, {
          type: "activateEffect",
          sourceInstanceId: s.inst("origin").instanceId,
          effectKey: effects[0]!.effectKey,
        }),
      ).toEqual({ ok: true });
      return;
    }
    case "BT26-044 trash":
      expect(
        s.engine.applyIntent(seat, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("target").permanentId },
        }),
      ).toEqual({ ok: true });
      return;
    default:
      expect(
        s.engine.applyIntent(seat, {
          type: "playCard",
          instanceId: s.inst(path === "BT20-083" ? "host" : "origin").instanceId,
        }),
      ).toEqual({ ok: true });
  }
}

describe.each(paths)("hand ownership sweep: %s", (path) => {
  describe.each([0, 1] as const)("seat %s", (seat) => {
    it.each([0, 1, 2])("uses only own hand with %s legal physical copies", async (ownCount) => {
      const otherSeat = seat === 0 ? 1 : 0;
      const { mine, other, destination } = layout(path);
      mine.hand = [
        ...(mine.hand ?? []),
        ...Array.from({ length: ownCount }, (_, n) => ({ card: destination, as: `own${n}` })),
        { card: "BT1-085", as: "wrongKind" },
      ];
      mine.deck = ["BT1-010", "BT1-010", "BT1-010"];
      other.hand = [{ card: destination, as: "opposing" }];
      other.security = ["BT1-010", "BT1-010", "BT1-010"];
      other.deck = ["BT1-010", "BT1-010"];
      const s = setupEngine(
        { [seat]: mine, [otherSeat]: other },
        {
          autoAcceptOptional: true,
          autoSelectCards: ownCount !== 2,
          autoChooseOption: true,
          preferOptionIndex: 1,
        },
      );
      s.state.turnSeat = seat;
      s.state.memory = path === "BT26-034" ? 4 : 10;
      await s.ready();
      const initialHostId = s.inst("host").instanceId;
      const opposingId = s.inst("opposing").instanceId;
      const wrongKindId = s.inst("wrongKind").instanceId;
      const ownIds = Array.from({ length: ownCount }, (_, n) => s.inst(`own${n}`).instanceId);
      const chosenId = ownIds.at(-1);
      const cleanup = await trigger(s, seat, path);
      try {
        if (ownCount === 2) {
          // Resolve prerequisite target/material selections through the same public responder,
          // stopping at the destination decision to inspect and forge its physical instance IDs.
          let inspected = false;
          for (let step = 0; step < 24; step += 1) {
            await settle();
            const pending = s.state.pendingDecision;
            if (pending === undefined) break;
            const req = s.decisions.find((decision) => decision.req.decisionId === pending.decisionId)!.req;
            const ids = req.options?.candidateInstanceIds ?? [];
            if (ids.some((id) => ownIds.includes(id)) && ids.every((id) => ownIds.includes(id) || id === opposingId)) {
              expect(req.kind).toBe("selectCards");
              expect(pending.seat).toBe(seat);
              expect(ids).toEqual(ownIds);
              expect(
                s.engine.applyIntent(seat, {
                  type: "respondDecision",
                  decisionId: pending.decisionId,
                  response: { kind: "selectCards", instanceIds: [opposingId] },
                }),
              ).toMatchObject({ ok: false });
              expect(s.state.pendingDecision?.decisionId).toBe(pending.decisionId);
              expect(
                s.engine.applyIntent(seat, {
                  type: "respondDecision",
                  decisionId: pending.decisionId,
                  response: { kind: "selectCards", instanceIds: [chosenId!] },
                }),
              ).toEqual({ ok: true });
              inspected = true;
            } else {
              expect(["selectCards", "chooseTargets"]).toContain(req.kind);
              expect(
                s.engine.applyIntent(seat, {
                  type: "respondDecision",
                  decisionId: pending.decisionId,
                  response: {
                    kind: req.kind as "selectCards" | "chooseTargets",
                    instanceIds: ids.slice(0, req.options?.max ?? 1),
                  },
                }),
              ).toEqual({ ok: true });
            }
          }
          expect(inspected).toBe(true);
        }
        await settle();
        // Omnimon can return Omekamon from its stack as its own printed cost.
        const host = path === "BT20-083" ? s.state.players[seat]!.battleArea[0]! : s.perm("host");
        expect(host.topCard.instanceId).toBe(chosenId ?? initialHostId);
        expect(host.topCard.ownerSeat).toBe(seat);
        expect(host.controllerSeat).toBe(seat);
        expect(s.state.players[otherSeat]!.hand.map((card) => card.instanceId)).toEqual([opposingId]);
        expect(s.state.players[seat]!.hand.some((card) => card.instanceId === wrongKindId)).toBe(true);
        expect(s.decisions.some(({ req }) => req.options?.candidateInstanceIds?.includes(opposingId))).toBe(false);
        expect(s.state.pendingDecision).toBeUndefined();
        if (path === "BT26-001")
          expect(s.state.players[seat]!.trash.some((card) => card.instanceId === s.inst("returned").instanceId)).toBe(
            false,
          );
        if (path === "BT26-044 trash")
          expect(s.state.players[seat]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(
            true,
          );
        if (path === "BT26-044 suspend") expect(s.perm("target").isSuspended).toBe(true);
        assertNoLoudGap(s);
      } finally {
        await cleanup?.();
      }
    });
  });
});
