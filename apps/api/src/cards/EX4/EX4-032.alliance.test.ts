import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX4-032.js";
import "./EX4-033.js";
import "./EX4-035.js";
import "./EX4-037.js";
import "../ST17/ST17-03.js";
import "../BT26/BT26-032.js";
import "../EX13/EX13-042.js";
import "../BT17/BT17-049.js";

async function attackWithAlliance(s: EngineSetup, seat: 0 | 1, attacker: string, ally?: string, target = "target") {
  const promptCount = s.events.filter((event) => event.kind === "alliancePrompt").length;
  expect(
    s.engine.applyIntent(seat, {
      type: "attack",
      attackerPermanentId: s.perm(attacker).permanentId,
      target: { kind: "permanent", permanentId: s.perm(target).permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.filter((event) => event.kind === "alliancePrompt").length > promptCount);
  expect(
    s.engine.applyIntent(seat, {
      type: "respondAlliance",
      ...(ally === undefined ? {} : { allyPermanentId: s.perm(ally).permanentId }),
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
}

describe("Discord 1557815584748601454 — Alliance inherited host and legal candidates", () => {
  for (const seat of [0, 1] as const) {
    for (const inherited of ["EX4-032", "EX4-033"]) {
      for (const role of ["attacker", "suspended ally", "uninvolved"] as const) {
        it(`${inherited}, seat ${seat}: ${role} host reacts to Alliance granted by ST17-03`, async () => {
          const preferred: string[] = [];
          const s = setupEngine(
            {
              [seat]: {
                battleArea: [
                  { card: "BT1-073", as: "host", under: [inherited] },
                  { card: "BT1-073", as: "attacker" },
                  { card: "ST17-03", as: "lopmon" },
                ],
                hand: [{ card: "BT17-049", as: "evolution" }],
                deck: ["BT1-009", "BT1-010"],
              },
              [1 - seat]: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
            },
            { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
          );
          const attacker = role === "attacker" ? "host" : "attacker";
          preferred.push(s.perm(attacker).permanentId);
          s.state.turnSeat = seat;
          s.state.memory = 10;
          await s.ready();
          const effects = JSON.parse(s.perm("lopmon").activatableEffectsJson) as { effectKey: string }[];
          expect(
            s.engine.applyIntent(seat, {
              type: "activateEffect",
              sourceInstanceId: s.inst("lopmon").instanceId,
              effectKey: effects[0]!.effectKey,
            }),
          ).toEqual({ ok: true });
          await settle(() => s.perm(attacker).keywords.includes("Alliance") && s.state.pendingDecision === undefined);
          await attackWithAlliance(s, seat, attacker, role === "suspended ally" ? "host" : "lopmon");
          expect(s.perm("host").topCard.cardId).toBe("BT17-049");
          expect(s.state.memory).toBe(8);
          expect(s.events.filter((event) => event.kind === "digivolved")).toHaveLength(1);
        });
      }
    }
    for (const inherited of ["EX4-032", "EX4-033"]) {
      for (const role of ["attacker", "suspended ally", "uninvolved"] as const) {
        it(`${inherited}, seat ${seat}: evolves the ${role} host exactly once before battle`, async () => {
          const s = setupEngine(
            {
              [seat]: {
                battleArea: [
                  { card: "EX4-035", as: "host", under: [inherited] },
                  { card: "EX4-035", as: "attacker" },
                  { card: "BT1-064", as: "ally" },
                ],
                hand: [{ card: "BT17-049", as: "evolution" }],
                deck: ["BT1-009", "BT1-010"],
              },
              [1 - seat]: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
            },
            { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
          );
          s.state.turnSeat = seat;
          s.state.memory = 10;
          await s.ready();
          await attackWithAlliance(
            s,
            seat,
            role === "attacker" ? "host" : "attacker",
            role === "suspended ally" ? "host" : "ally",
          );
          expect(s.perm("host").topCard.cardId).toBe("BT17-049");
          expect(s.state.memory).toBe(8);
          expect(s.state.players[seat]!.deck).toHaveLength(1);
          const evolutionEvents = s.events.filter((event) => event.kind === "digivolved");
          expect(evolutionEvents).toHaveLength(1);
          const evolutionIndex = s.events.findIndex((event) => event.kind === "digivolved");
          const battleIndex = s.events.findIndex((event) => event.kind === "battleCompared");
          expect(battleIndex).toBeGreaterThan(evolutionIndex);
          expect(s.perm("host").isSuspended).toBe(role !== "uninvolved");
        });
      }
    }
    for (const inherited of ["EX4-032", "EX4-033"]) {
      it(`${inherited}, seat ${seat}: recognizes inherited Alliance on another attacker`, async () => {
        const s = setupEngine(
          {
            [seat]: {
              battleArea: [
                { card: "BT1-073", as: "host", under: [inherited] },
                { card: "BT3-056", as: "attacker", under: ["EX13-042"] },
              ],
              hand: [{ card: "BT17-049", as: "evolution" }],
            },
            [1 - seat]: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
          },
          { autoAcceptOptional: true, autoSelectCards: true },
        );
        s.state.turnSeat = seat;
        s.state.memory = 10;
        await s.ready();
        expect(s.perm("attacker").keywords).toContain("Alliance");
        await attackWithAlliance(s, seat, "attacker", "host");
        expect(s.perm("host").topCard.cardId).toBe("BT17-049");
        expect(s.state.memory).toBe(8);
      });

      it(`${inherited}, seat ${seat}: a printed Alliance card's non-Alliance suspension does not trigger`, async () => {
        const preferred: string[] = [];
        const s = setupEngine(
          {
            [seat]: {
              battleArea: [
                { card: "BT1-073", as: "host", under: [inherited] },
                { card: "BT1-076", as: "base" },
              ],
              hand: [
                { card: "BT17-049", as: "evolution" },
                { card: "BT26-032", as: "ceresmon" },
              ],
            },
          },
          { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
        );
        preferred.push(s.perm("host").permanentId);
        s.state.turnSeat = seat;
        s.state.memory = 10;
        await s.ready();
        expect(
          s.engine.applyIntent(seat, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("ceresmon").instanceId,
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.perm("host").isSuspended &&
            s.state.pendingDecision === undefined &&
            s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT26-032"),
        );
        expect(s.perm("host").topCard.cardId).toBe("BT1-073");
        expect(s.state.players[seat]!.hand.some((card) => card.cardId === "BT17-049")).toBe(true);
        expect(s.state.memory).toBe(5);
      });
    }

    it(`seat ${seat}: the inherited is not once per turn and reduces each separate evolution once`, async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [
              { card: "EX4-035", as: "host", under: ["EX4-032"] },
              { card: "EX4-035", as: "attacker" },
              { card: "EX4-035", as: "attacker2" },
              { card: "BT1-064", as: "ally" },
              { card: "BT1-064", as: "ally2" },
            ],
            hand: [
              { card: "BT17-049", as: "evolution" },
              { card: "EX4-037", as: "secondEvolution" },
            ],
            deck: ["BT1-009", "BT1-010", "BT1-010"],
          },
          [1 - seat]: {
            battleArea: [
              { card: "BT1-010", as: "target", suspended: true },
              { card: "BT1-010", as: "target2", suspended: true },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      await attackWithAlliance(s, seat, "attacker", "ally");
      expect(s.perm("host").topCard.cardId).toBe("BT17-049");
      expect(s.state.memory).toBe(8);
      await attackWithAlliance(s, seat, "attacker2", "ally2", "target2");
      expect(s.perm("host").topCard.cardId).toBe("EX4-037");
      expect(s.state.memory).toBe(5); // The default chooser selects the normal 5-cost route, reduced by 2.
      expect(s.events.filter((event) => event.kind === "digivolved")).toHaveLength(2);
      expect(s.state.players[seat]!.deck).toHaveLength(1);
    });

    it(`seat ${seat}: declining the inherited does not discount a later normal evolution`, async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [
              { card: "EX4-035", as: "host", under: ["EX4-032"] },
              { card: "BT1-064", as: "ally" },
            ],
            hand: [{ card: "BT17-049", as: "evolution" }],
            deck: ["BT1-009", "BT1-010"],
          },
          [1 - seat]: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      await attackWithAlliance(s, seat, "host", "ally");
      expect(s.perm("host").topCard.cardId).toBe("EX4-035");
      expect(s.state.memory).toBe(10);
      expect(
        s.engine.applyIntent(seat, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evolution").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").topCard.cardId === "BT17-049" && s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(6);
    });

    it(`seat ${seat}: an opponent's Alliance does not evolve the opposing inherited host`, async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [
              { card: "EX4-035", as: "attacker" },
              { card: "BT1-064", as: "ally" },
            ],
          },
          [1 - seat]: {
            battleArea: [
              { card: "EX4-035", as: "host", under: ["EX4-032"] },
              { card: "BT1-010", as: "target", suspended: true },
            ],
            hand: [{ card: "BT17-049", as: "evolution" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      await attackWithAlliance(s, seat, "attacker", "ally");
      expect(s.perm("host").topCard.cardId).toBe("EX4-035");
      expect(s.events.filter((event) => event.kind === "digivolved")).toHaveLength(0);
      expect(s.state.memory).toBe(10);
    });

    for (const candidate of ["BT1-076", "BT8-039", "BT10-013"]) {
      it(`seat ${seat}: excludes ${candidate} (wrong color count, level, or colors)`, async () => {
        const s = setupEngine(
          {
            [seat]: {
              battleArea: [
                { card: "EX4-035", as: "host", under: ["EX4-032"] },
                { card: "BT1-064", as: "ally" },
              ],
              hand: [{ card: candidate, as: "invalid" }],
            },
            [1 - seat]: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
          },
          { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
        );
        s.state.turnSeat = seat;
        s.state.memory = 10;
        await s.ready();
        await attackWithAlliance(s, seat, "host", "ally");
        expect(s.perm("host").topCard.cardId).toBe("EX4-035");
        expect(s.state.players[seat]!.hand.map((card) => card.cardId)).toEqual([candidate]);
        expect(s.events.filter((event) => event.kind === "digivolved")).toHaveLength(0);
        expect(s.state.memory).toBe(10);
      });
    }
    it(`seat ${seat}: declining Alliance never activates the inherited`, async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [
              { card: "EX4-035", as: "host", under: ["EX4-032"] },
              { card: "BT1-064", as: "ally" },
            ],
            hand: [{ card: "BT17-049", as: "evolution" }],
          },
          [1 - seat]: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      await attackWithAlliance(s, seat, "host");
      expect(s.perm("host").topCard.cardId).toBe("EX4-035");
      expect(s.perm("ally").isSuspended).toBe(false);
      expect(s.events.filter((event) => event.kind === "digivolved")).toHaveLength(0);
    });
  }
});
