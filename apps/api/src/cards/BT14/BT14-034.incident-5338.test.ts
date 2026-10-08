import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

// #5338: the report omits sources and board state. These public-intent controls
// distinguish a bare Sukamon from the legal inherited suspended-Chuumon effect.
describe("#5338 BT14-034 deletion source ownership", () => {
  for (const seat of [0, 1] as const) {
    const opponent: Seat = seat === 0 ? 1 : 0;
    it(`seat ${seat}: BT3-063 plays from the revealed deck unsuspended, not the trash`, async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [{ card: "BT3-063", as: "sukamon" }],
            deck: [{ card: "BT3-061", as: "revealed" }, "BT1-010", "BT1-011"],
            trash: [{ card: "BT11-036", as: "trash" }],
          },
          [opponent]: { battleArea: [{ card: "BT1-018", as: "wall", suspended: true }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(seat, {
          type: "attack",
          attackerPermanentId: s.perm("sukamon").permanentId,
          target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      expect(
        s.state.players[seat]!.battleArea.map((p) => ({ id: p.topCard.instanceId, suspended: p.isSuspended })),
      ).toEqual([{ id: s.inst("revealed").instanceId, suspended: false }]);
      expect(s.state.players[seat]!.trash.map((c) => c.instanceId)).toContain(s.inst("trash").instanceId);
      expect(s.events.filter((e) => e.kind === "effectTriggered")).toEqual([
        expect.objectContaining({ sourceCardId: "BT3-063", sourceInstanceId: s.inst("sukamon").instanceId, seat }),
      ]);
      expect(s.state.memory).toBe(5);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    });
    it.each([undefined, "BT11-036", "BT13-062", "EX5-045"])(
      `seat ${seat}: only the deleted stack's inherited %s can play Chuumon`,
      async (source) => {
        const preferred: string[] = [];
        const s = setupEngine(
          {
            [seat]: {
              battleArea: [
                { card: "BT14-034", as: "first", under: source ? [{ card: source, as: "source1" }] : [] },
                { card: "BT14-034", as: "second", under: source ? [{ card: source, as: "source2" }] : [] },
                { card: "BT14-034", as: "bystander", under: ["BT11-036"] },
                { card: "BT11-036", as: "topChuumon" },
              ],
              trash: [
                { card: "BT11-036", as: "return1" },
                { card: "BT11-036", as: "return2" },
              ],
            },
            [opponent]: {
              battleArea: [
                { card: "BT1-018", as: "wall", suspended: true },
                { card: "BT14-034", as: "enemyBystander", under: ["BT11-036"] },
              ],
              trash: [{ card: "BT11-036", as: "enemyTrash" }],
            },
          },
          { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
        );
        s.state.turnSeat = seat;
        s.state.memory = 5;
        await s.ready();
        for (const [index, alias] of ["first", "second"].entries()) {
          const hostId = s.perm(alias).permanentId;
          const sourceId = source ? s.inst(`source${index + 1}`).instanceId : undefined;
          const returnId = s.inst(`return${index + 1}`).instanceId;
          preferred.splice(0, preferred.length, returnId);
          const eventStart = s.events.length;
          expect(
            s.engine.applyIntent(seat, {
              type: "attack",
              attackerPermanentId: hostId,
              target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
            }),
          ).toEqual({ ok: true });
          await advance(s.engine).finishAttack();
          expect(s.state.players[seat]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
          const played = s.state.players[seat]!.battleArea.find((p) => p.topCard.instanceId === returnId);
          expect(played?.isSuspended).toBe(source ? true : undefined);
          const expectedSource = expect.objectContaining({
            kind: "effectTriggered",
            seat,
            sourceCardId: source,
            sourceInstanceId: sourceId,
            isInherited: true,
            printedTiming: "OnDeletion",
          });
          expect(s.events.slice(eventStart).filter((e) => e.kind === "effectTriggered")).toEqual(
            source ? [expectedSource] : [],
          );
          expect(s.state.memory).toBe(5);
          expect(s.state.pendingDecision).toBeUndefined();
        }
        // None of these inherited Chuumon effects has Once Per Turn: both distinct hosts work.
        expect(s.events.filter((e) => e.kind === "cardPlayed")).toHaveLength(source ? 2 : 0);
        expect(s.perm("wall").currentDP).toBe(4000);
        expect(s.perm("bystander").topCard.cardId).toBe("BT14-034");
        expect(s.perm("enemyBystander").topCard.cardId).toBe("BT14-034");
        expect(s.state.players[opponent]!.trash.map((c) => c.instanceId)).toContain(s.inst("enemyTrash").instanceId);
        assertNoLoudGap(s);
      },
    );
  }
});
