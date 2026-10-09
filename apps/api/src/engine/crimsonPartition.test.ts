import { describe, expect, it } from "vitest";
import type { Seat } from "@aegis/shared";
import "../cards/index.js";
import { assertNoLoudGap, settle, setupEngine } from "./testkit/harness.js";

// CR 15-1-3 and 16-29: prohibitions override Partition's effect play permission.
describe("GitHub #5354/#5355: Crimson Blaze blocks Paildramon Partition", () => {
  for (const actingSeat of [0, 1] as const) {
    const opponent = (1 - actingSeat) as Seat;
    for (const inherited of [false, true]) {
      it.each([false, true])(
        `seat ${actingSeat}, inherited=${inherited}, Crimson Blaze=%s: opponent departure through public intents`,
        async (useBlaze) => {
          const s = setupEngine(
            {
              [actingSeat]: {
                battleArea: [{ card: "BT1-009", as: "red" }],
                hand: [
                  { card: "BT8-097", as: "blaze" },
                  { card: "ST1-16", as: "gaia" },
                ],
                deck: ["BT1-009", "BT1-009", "BT1-009"],
              },
              [opponent]: {
                battleArea: [
                  {
                    card: inherited ? "BT12-031" : "BT16-025",
                    as: "holder",
                    under: [
                      { card: "AD1-010", as: "blue" },
                      { card: "BT1-069", as: "green" },
                      ...(inherited ? [{ card: "BT16-025", as: "inheritedPartition" }] : []),
                    ],
                  },
                ],
                deck: ["BT1-009", "BT1-009", "BT1-009"],
              },
            },
            { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
          );
          s.state.turnSeat = actingSeat;
          s.state.memory = 10;
          await s.ready();
          const holderId = s.perm("holder").permanentId;
          const blueId = s.inst("blue").instanceId;
          const greenId = s.inst("green").instanceId;
          async function useOption(alias: "blaze" | "gaia") {
            const instanceId = s.inst(alias).instanceId;
            expect(s.engine.applyIntent(actingSeat, { type: "playCard", instanceId })).toEqual({ ok: true });
            await settle(
              () =>
                s.state.players[actingSeat]!.trash.some((card) => card.instanceId === instanceId) &&
                s.state.pendingDecision === undefined,
            );
          }
          if (useBlaze) await useOption("blaze");
          // Printed DP is above 6000: Blaze installs the restriction, Gaia causes departure.
          expect(s.state.players[opponent]!.battleArea.some((p) => p.permanentId === holderId)).toBe(true);
          await useOption("gaia");
          await settle(
            () =>
              !s.state.players[opponent]!.battleArea.some((p) => p.permanentId === holderId) &&
              s.state.pendingDecision === undefined,
          );
          expect(s.state.players[opponent]!.battleArea.map((p) => p.topCard.instanceId).sort()).toEqual(
            useBlaze ? [] : [blueId, greenId].sort(),
          );
          expect(
            s.events.filter(
              (event) =>
                event.kind === "cardPlayed" &&
                event.instanceId !== undefined &&
                [blueId, greenId].includes(event.instanceId),
            ),
          ).toHaveLength(useBlaze ? 0 : 2);
          expect(s.state.players[opponent]!.trash.some((card) => card.instanceId === blueId)).toBe(useBlaze);
          expect(s.state.players[opponent]!.trash.some((card) => card.instanceId === greenId)).toBe(useBlaze);
          assertNoLoudGap(s);
        },
      );
    }
  }

  for (const actingSeat of [0, 1] as const) {
    const opponent = (1 - actingSeat) as Seat;
    it.each([false, true])(
      `Oracle match: seat ${actingSeat}, Crimson Blaze=%s, Atho removes Imperialdramon`,
      async (useBlaze) => {
        const s = setupEngine(
          {
            [actingSeat]: {
              battleArea: [{ card: "EX13-014", as: "atho" }],
              hand: [
                { card: "BT8-097", as: "blaze" },
                { card: "BT1-009", as: "monodramon" },
              ],
            },
            [opponent]: {
              battleArea: [
                {
                  card: "ST9-06",
                  as: "imperialdramon",
                  under: ["BT12-002", { card: "BT12-022", as: "blue" }, { card: "BT12-050", as: "green" }, "BT16-025"],
                },
              ],
            },
          },
          { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
        );
        s.state.turnSeat = actingSeat;
        s.state.memory = 10;
        await s.ready();
        const holderId = s.perm("imperialdramon").permanentId;
        const materials = [s.inst("blue").instanceId, s.inst("green").instanceId];
        async function play(alias: "blaze" | "monodramon") {
          expect(s.engine.applyIntent(actingSeat, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({
            ok: true,
          });
          await settle();
        }
        if (useBlaze) await play("blaze");
        await play("monodramon");
        await settle(
          () =>
            !s.state.players[opponent]!.battleArea.some((p) => p.permanentId === holderId) &&
            s.state.pendingDecision === undefined,
        );
        expect(s.state.players[opponent]!.battleArea.map((p) => p.topCard.instanceId).sort()).toEqual(
          useBlaze ? [] : [...materials].sort(),
        );
        // Restore the interrupted source seat: Atho's remaining effect may play its own token.
        expect(
          s.state.players[actingSeat]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-AthoRenePor-Token"),
        ).toBe(true);
        expect(
          s.events.filter(
            (event) =>
              event.kind === "cardPlayed" && event.instanceId !== undefined && materials.includes(event.instanceId),
          ),
        ).toHaveLength(useBlaze ? 0 : 2);
        assertNoLoudGap(s);
      },
    );
  }
});
