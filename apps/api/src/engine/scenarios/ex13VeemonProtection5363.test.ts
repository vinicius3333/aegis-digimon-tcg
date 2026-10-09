import { type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, drainMicrotasks, setupEngine, settle, type EngineSetup } from "../testkit/harness.js";
import "../../cards/index.js";

const protectionPrompt = "Prevent leaving the battle area?";
const protectionDecisions = (s: EngineSetup) =>
  s.decisions.filter(({ req }) => req.kind === "optional" && req.promptText === protectionPrompt);

for (const defender of [0, 1] as const) {
  const attacker = (1 - defender) as Seat;
  describe(`#5363 EX13-017 inherited protection, defender seat ${defender}`, () => {
    for (const warGreymon of ["AD1-004", "P-182", "ST20-11"]) {
      for (const branch of ["accept", "decline", "already suspended", "wrong name", "missing source"] as const) {
        it(`${warGreymon} When Digivolving: ${branch}`, async () => {
          const hostCard = branch === "wrong name" ? "BT1-025" : "BT12-029";
          const s = setupEngine(
            {
              [attacker]: {
                battleArea: [{ card: "ST1-09", as: "base" }],
                hand: [{ card: warGreymon, as: "warGreymon" }],
                deck: ["BT1-009"],
              },
              [defender]: {
                battleArea: [
                  {
                    card: hostCard,
                    as: "host",
                    under: branch === "missing source" ? [] : ["EX13-017"],
                    suspended: branch === "already suspended",
                  },
                ],
              },
            },
            { autoSelectCards: true },
          );
          s.state.turnSeat = attacker;
          s.state.memory = 5;
          await s.ready();
          const host = s.perm("host");
          expect(
            s.engine.applyIntent(attacker, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("warGreymon").instanceId,
            }),
          ).toEqual({ ok: true });

          const wantsPrompt = branch === "accept" || branch === "decline";
          let answerResult: { ok: boolean } | undefined;
          if (wantsPrompt) {
            await settle(() => s.state.pendingDecision?.kind === "optional");
            const request = s.decisions.at(-1)!;
            answerResult = s.engine.applyIntent(defender, {
              type: "respondDecision",
              decisionId: request.req.decisionId,
              response: { kind: "optional", accept: branch === "accept" },
            });
          }
          expect(answerResult).toEqual(wantsPrompt ? { ok: true } : undefined);
          await settle(() =>
            branch === "accept"
              ? host.isSuspended && s.state.pendingDecision === undefined
              : s.state.players[defender]!.battleArea.length === 0,
          );
          await drainMicrotasks(20);
          expect(s.perm("base").topCard?.cardId).toBe(warGreymon);
          expect(s.state.pendingDecision).toBeUndefined();
          expect(
            s.state.players[defender]!.battleArea.map((p) => ({
              id: p.permanentId,
              stack: p.stack.map((c) => c.cardId),
            })),
          ).toEqual(branch === "accept" ? [{ id: host.permanentId, stack: ["EX13-017"] }] : []);
          expect(s.state.players[defender]!.trash.map((c) => c.cardId).sort()).toEqual(
            branch === "accept" ? [] : branch === "missing source" ? [hostCard] : ["EX13-017", hostCard].sort(),
          );
          const prompts = protectionDecisions(s);
          expect(prompts).toHaveLength(wantsPrompt ? 1 : 0);
          expect(prompts[0]?.seat).toBe(wantsPrompt ? defender : undefined);
          expect(prompts[0]?.req.sourceCardId).toBe(wantsPrompt ? "EX13-017" : undefined);
          expect(prompts[0]?.req.options?.effectText?.includes("by suspending it")).toBe(
            wantsPrompt ? true : undefined,
          );
          assertNoLoudGap(s);
        });
      }
    }

    it("the controller's own deletion effect offers no inherited protection", async () => {
      const s = setupEngine(
        {
          [defender]: {
            battleArea: [{ card: "BT12-029", under: ["EX13-017"], as: "host" }, { card: "BT2-090" }],
            hand: [{ card: "BT7-107", as: "ownDeletion" }],
          },
        },
        { autoSelectCards: true },
      );
      s.state.turnSeat = defender;
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(defender, { type: "playCard", instanceId: s.inst("ownDeletion").instanceId }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[defender]!.trash.some((c) => c.cardId === "BT12-029"));
      expect(protectionDecisions(s)).toHaveLength(0);
      assertNoLoudGap(s);
    });

    it("battle deletion of an unsuspended host through Raid offers no inherited protection", async () => {
      const s = setupEngine(
        {
          [attacker]: { battleArea: [{ card: "BT12-070", as: "raider" }] },
          [defender]: { battleArea: [{ card: "BT12-029", under: ["EX13-017"], as: "host" }], security: ["BT1-009"] },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.turnSeat = attacker;
      s.state.memory = 3;
      await s.ready();
      // A tie at 12000 DP deletes both Digimon by battle; Raid can target the unsuspended host.
      expect(
        s.engine.applyIntent(attacker, {
          type: "attack",
          attackerPermanentId: s.perm("raider").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[defender]!.battleArea.length === 0);
      expect(s.state.players[defender]!.trash.map((c) => c.cardId).sort()).toEqual(
        expect.arrayContaining(["BT12-029", "EX13-017"]),
      );
      expect(protectionDecisions(s)).toHaveLength(0);
      assertNoLoudGap(s);
    });

    it("OPT remains spent after a public unsuspend and a second opponent security deletion in the same turn", async () => {
      const s = setupEngine(
        {
          [defender]: {
            battleArea: [
              { card: "BT12-029", under: ["EX13-017"], as: "host" },
              { card: "BT1-085" },
              { card: "BT1-010", as: "firstAttacker" },
              { card: "BT1-010", as: "secondAttacker" },
            ],
            hand: [{ card: "BT1-095", as: "unsuspend" }],
          },
          [attacker]: { security: ["ST1-16", "ST1-16"] },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.turnSeat = defender;
      s.state.memory = 10;
      await s.ready();
      const host = s.perm("host");
      const attack = (alias: string) =>
        s.engine.applyIntent(defender, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        });
      expect(attack("firstAttacker")).toEqual({ ok: true });
      await settle(() => s.state.players[attacker]!.security.length === 1 && s.state.pendingDecision === undefined);
      expect(s.state.players[defender]!.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(true);
      expect(protectionDecisions(s)).toHaveLength(1);
      expect(s.engine.applyIntent(defender, { type: "playCard", instanceId: s.inst("unsuspend").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => !host.isSuspended && s.state.pendingDecision === undefined);
      expect(host.isSuspended).toBe(false);
      expect(attack("secondAttacker")).toEqual({ ok: true });
      await settle(() => s.state.players[defender]!.trash.some((c) => c.cardId === "BT12-029"));
      expect(protectionDecisions(s)).toHaveLength(1);
      assertNoLoudGap(s);
    });
  });
}
