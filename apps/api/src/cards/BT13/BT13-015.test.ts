import { describe, expect, it } from "vitest";
import { Zone, type Seat } from "@aegis/shared";
import "../BT4/BT4-092.js";
import "../BT15/BT15-097.js";
import { compiled } from "./BT13-015.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT13-008.js";
import "./BT13-015.js";
import "../ST1/ST1-10.js";
import "../BT12/BT12-092.js";

describe("BT13-015 RizeGreymon", () => {
  it("uses exact bracketed names for its GeoGreymon evolution and Marcus Damon references", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["GeoGreymon"], cost: 3, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ target: { filter: { nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] } } }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          actions: [
            {
              source: { filter: { nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] } },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          actions: [
            {
              source: { filter: { nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] } },
            },
          ],
        },
      ],
    });
  });

  it("digivolves from GeoGreymon for 3 and may play Marcus Damon from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-012", as: "geo" }],
          hand: [
            { card: "BT13-015", as: "rize" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const evolutionMaterialId1 = s.perm("geo").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("geo").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-092"));
    expect(s.state.memory).toBe(7);
  });

  it("plays Marcus Damon & Agumon through its name rule", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-012", as: "geo" }],
          hand: [
            { card: "BT13-015", as: "rize" },
            { card: "AD1-021", as: "ruleMarcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const evolutionMaterialId2 = s.perm("geo").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").stack.some((card) => card.instanceId === evolutionMaterialId2));
    expect(s.perm("geo").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId2);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-021"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ruleMarcus").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "AD1-021")).toHaveLength(
      1,
    );
    expect(s.state.memory).toBe(7);
  });

  it("may decline to play Marcus Damon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-012", as: "geo" }],
          hand: [
            { card: "BT13-015", as: "rize" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    const evolutionMaterialId3 = s.perm("geo").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").stack.some((card) => card.instanceId === evolutionMaterialId3));
    expect(s.perm("geo").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId3);
    await settle(() => s.perm("geo").topCard.cardId === "BT13-015");
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it.each([false, true])(
    "places the exact deleted Marcus once per turn and resets (inherited=%s)",
    async (inherited) => {
      const preferredTargets: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              inherited
                ? { card: "ST1-10", as: "host", under: [{ card: "BT13-015", as: "source" }] }
                : { card: "BT13-015", as: "host" },
              { card: "BT13-008", as: "agumon" },
              { card: "BT12-092", as: "first" },
              { card: "BT12-092", as: "second" },
              { card: "BT12-092", as: "third" },
            ],
            security: ["BT1-010"],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
          1: { security: ["BT1-009", "BT1-009", "BT1-009"], deck: ["BT1-010", "BT1-010", "BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredTargets },
      );
      const firstId = s.inst("first").instanceId;
      const secondId = s.inst("second").instanceId;
      const thirdId = s.inst("third").instanceId;
      preferredTargets.push(firstId, thirdId);
      const sourceId = inherited ? s.inst("source").instanceId : s.perm("host").topCard.instanceId;
      s.state.memory = 10;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.perm("first").currentDP === 3000 && s.perm("second").currentDP === 3000);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("first").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.security).toHaveLength(2);
      expect(s.state.players[0]!.security[0]!.instanceId).toBe(firstId);
      expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("second").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.security).toHaveLength(2);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(secondId);
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      s.state.turnSeat = 1;
      s.state.memory = -s.state.memory;
      await advance(s.engine).runTurn(1);
      s.state.turnSeat = 0;
      s.state.memory = -s.state.memory;
      const nextTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.perm("third").currentDP === 3000);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("third").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.security).toHaveLength(3);
      expect(s.state.players[0]!.security[0]!.instanceId).toBe(thirdId);
      expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
      expect(
        inherited ? s.perm("host").stack.map((card) => card.instanceId) : [s.perm("host").topCard.instanceId],
      ).toContain(sourceId);
      advance(s.engine).endMainPhaseIfOpen(0);
      await nextTurn;
    },
  );
});

describe("BT13-015 RizeGreymon — KB Q&A rulings", () => {
  it("places the deleted red/yellow [Marcus Damon] itself from the trash on top of security (Q2274)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-015", as: "rizeGreymon" },
            { card: "BT12-092", as: "marcus" },
          ],
          security: [{ card: "BT1-010", as: "originalSecurity" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const marcusId = s.inst("marcus").instanceId;
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT12-092")).toBe(false);

    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("marcus").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    await settle();

    const security = s.state.players[0]!.security;
    expect(security.map((card) => card.instanceId)).toEqual([marcusId, s.inst("originalSecurity").instanceId]);
    expect(security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === marcusId)).toBe(false);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT13-015"]);
  });
});

describe("Discord 1557876784681328641 — BT13-015 Tamer deletion", () => {
  for (const seat of [0, 1] as const) {
    for (const inherited of [false, true]) {
      for (const control of ["empty trash", "opponent Tamer", "deleted host"] as const) {
        it(`seat ${seat}: ${inherited ? "inherited" : "main"} does not recover Marcus for ${control}`, async () => {
          const opponent = (1 - seat) as Seat;
          const killer = control === "opponent Tamer" ? seat : opponent;
          const victimSeat = (1 - killer) as Seat;
          const host = inherited ? { card: "ST1-10", under: ["BT13-015"] } : { card: "BT13-015" };
          const s = setupEngine(
            {
              [seat]: {
                battleArea: control === "deleted host" ? [{ ...host, as: "victim" }] : [host],
                trash: control === "empty trash" ? [] : ["BT4-092"],
                security: ["BT1-001"],
              },
            },
            { autoSelectCards: true, autoAcceptOptional: true },
          );
          if (control !== "deleted host") s.putOnBoard(victimSeat, { card: "BT1-085", as: "victim" });
          s.putOnBoard(killer, "BT2-056");
          const slicer = s.give(killer, Zone.Hand, "BT15-097");
          s.give(killer, Zone.Hand, "BT1-024");
          s.state.turnSeat = killer;
          s.state.memory = 10;
          await s.ready();
          const victimId = s.perm("victim").topCard.instanceId;
          expect(s.engine.applyIntent(killer, { type: "playCard", instanceId: slicer.instanceId })).toEqual({
            ok: true,
          });
          await settle();
          expect(s.state.players[victimSeat]!.trash.some((c) => c.instanceId === victimId)).toBe(true);
          expect(s.state.players[seat]!.security).toHaveLength(1);
          expect(s.state.pendingDecision).toBeUndefined();
        });
      }

      it(`seat ${seat}: ${inherited ? "inherited" : "main"} places Marcus only once for two qualifying deletions in the same turn`, async () => {
        const opponent = (1 - seat) as Seat;
        const s = setupEngine(
          {
            [seat]: {
              battleArea: [
                inherited ? { card: "ST1-10", under: ["BT13-015"] } : "BT13-015",
                { card: "BT13-094", as: "first" },
                { card: "BT1-085", as: "second" },
              ],
              trash: [
                { card: "BT4-092", as: "marcus1" },
                { card: "BT4-092", as: "marcus2" },
              ],
              security: ["BT1-001"],
            },
            [opponent]: {
              battleArea: ["BT2-056"],
              hand: [{ card: "BT15-097", as: "slicer1" }, { card: "BT15-097", as: "slicer2" }, "BT1-024", "BT1-024"],
            },
          },
          { autoSelectCards: true, autoAcceptOptional: true },
        );
        s.state.turnSeat = opponent;
        s.state.memory = 10;
        await s.ready();
        const victims = [s.perm("first").topCard.instanceId, s.perm("second").topCard.instanceId];
        for (const slicer of ["slicer1", "slicer2"]) {
          expect(s.engine.applyIntent(opponent, { type: "playCard", instanceId: s.inst(slicer).instanceId })).toEqual({
            ok: true,
          });
          await settle();
          expect(s.state.players[seat]!.security).toHaveLength(2);
          expect(s.state.pendingDecision).toBeUndefined();
        }
        expect(victims.every((id) => s.state.players[seat]!.trash.some((c) => c.instanceId === id))).toBe(true);
        expect(s.state.players[seat]!.trash.filter((c) => c.cardId === "BT4-092")).toHaveLength(1);
      });
      for (const [deletedCard, qualifies] of [
        ["BT1-085", true], // red Tamer, not Marcus
        ["BT1-087", true], // yellow Tamer, not Marcus
        ["BT3-093", false], // blue Tamer
        ["BT1-010", false], // red Digimon, not a Tamer
      ] as const) {
        it(`seat ${seat}: ${inherited ? "inherited" : "main"} ${qualifies ? "accepts" : "rejects"} deletion of ${deletedCard}`, async () => {
          const opponent = (1 - seat) as Seat;
          const s = setupEngine(
            {
              [seat]: {
                battleArea: [
                  inherited ? { card: "ST1-10", as: "host", under: ["BT13-015"] } : { card: "BT13-015", as: "host" },
                  { card: deletedCard, as: "victim" },
                ],
                trash: [{ card: "BT4-092", as: "oldMarcus" }],
                security: ["BT1-001"],
              },
              [opponent]: {
                battleArea: ["BT2-056"],
                hand: [{ card: "BT15-097", as: "slicer" }, "BT1-024"],
              },
            },
            { autoSelectCards: true, autoAcceptOptional: true },
          );
          s.state.turnSeat = opponent;
          s.state.memory = 10;
          await s.ready();
          const victimId = s.perm("victim").topCard.instanceId;
          const marcusId = s.inst("oldMarcus").instanceId;
          expect(s.engine.applyIntent(opponent, { type: "playCard", instanceId: s.inst("slicer").instanceId })).toEqual(
            { ok: true },
          );
          await settle();
          expect(s.state.players[seat]!.trash.some((c) => c.instanceId === victimId)).toBe(true);
          expect(s.state.players[seat]!.security).toHaveLength(qualifies ? 2 : 1);
          expect(s.state.players[seat]!.security.some((c) => c.instanceId === marcusId)).toBe(qualifies);
          expect(s.state.pendingDecision).toBeUndefined();
        });
      }

      for (const chooseOlder of [false, true]) {
        for (const securityBattle of [false, true]) {
          it(`seat ${seat}: ${inherited ? "inherited" : "main"} ${securityBattle ? "security" : "permanent"} battle places ${chooseOlder ? "another Marcus from trash" : "the deleted Marcus"} face down on security`, async () => {
            const opponent = (1 - seat) as Seat;
            const preferred: string[] = [];
            const s = setupEngine(
              {
                [seat]: {
                  battleArea: [
                    inherited ? { card: "ST1-10", as: "host", under: ["BT13-015"] } : { card: "BT13-015", as: "host" },
                    { card: "BT13-008", as: "agumon" },
                    { card: "BT4-092", as: "marcus" },
                  ],
                  security: ["BT1-001"],
                  trash: chooseOlder ? [{ card: "BT4-092", as: "olderMarcus" }] : [],
                },
                [opponent]: {
                  battleArea: [{ card: "BT1-024", as: "defender", suspended: true }],
                  security: ["BT1-024", "BT1-024"],
                },
              },
              { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
            );
            if (chooseOlder) preferred.push(s.inst("olderMarcus").instanceId);
            s.state.turnSeat = seat;
            s.state.memory = 10;
            await s.ready();
            const marcusId = s.perm("marcus").topCard.instanceId;
            const effect = observe(s.engine).activatableEffects(s.perm("agumon"))[0]!;
            expect(
              s.engine.applyIntent(seat, {
                type: "activateEffect",
                sourceInstanceId: s.perm("agumon").topCard.instanceId,
                effectKey: effect.effectKey,
              }),
            ).toEqual({ ok: true });
            await settle(() => s.perm("marcus").currentDP === 3000 && s.state.pendingDecision === undefined);
            expect(
              s.engine.applyIntent(seat, {
                type: "attack",
                attackerPermanentId: s.perm("marcus").permanentId,
                target: securityBattle
                  ? { kind: "player" }
                  : { kind: "permanent", permanentId: s.perm("defender").permanentId },
              }),
            ).toEqual({ ok: true });
            await settle();
            const securityId = chooseOlder ? s.inst("olderMarcus").instanceId : marcusId;
            expect(s.state.players[seat]!.security[0]).toMatchObject({ instanceId: securityId, faceUp: false });
            expect(s.state.players[seat]!.security).toHaveLength(2);
            expect(s.state.players[seat]!.trash.some((c) => c.instanceId === marcusId)).toBe(chooseOlder);
            const pick = s.decisions.find(
              ({ req }) => req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes(securityId),
            );
            expect(pick?.seat).toBe(chooseOlder ? seat : undefined);
            const bounds = pick === undefined ? undefined : { min: pick.req.options?.min, max: pick.req.options?.max };
            expect(bounds).toEqual(chooseOlder ? { min: 1, max: 1 } : undefined);
            expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
            expect(s.state.pendingDecision).toBeUndefined();
          });
        }
      }
    }
  }
});
