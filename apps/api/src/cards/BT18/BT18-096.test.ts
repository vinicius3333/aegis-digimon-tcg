import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT18-096.js";

describe("BT18-096 Lord of Devastation and Rebirth", () => {
  it("covers color waiver, Susanoomon digivolution, distinct-color placement, and security", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "Digivolve", payCost: false },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: { usePaidCount: true },
          cost: {
            targetIsPermanent: true,
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            target: { filter: { controller: "mine", zone: "battleArea", kind: ["Tamer"], differentColors: true } },
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Susanoomon"], match: "nameExact" }],
            },
          },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }],
    });
  });

  it("naturally places four differently colored Tamers under an existing Susanoomon and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-102", as: "susanoomon" },
            { card: "BT18-088", as: "redYellowTamer" },
            { card: "BT18-089", as: "redBlueTamer" },
            { card: "BT18-090", as: "redGreenTamer" },
            { card: "BT18-092", as: "blackTamer" },
          ],
          hand: [{ card: "BT18-096", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("susanoomon").stack.length === 4);

    expect(s.perm("susanoomon").stack).toHaveLength(4);
    expect(s.state.memory).toBe(8);
  });

  it("excludes a duplicate single-color Tamer while retaining assignable colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-102", as: "susanoomon" },
            { card: "BT1-085", as: "redTamerA" },
            { card: "BT1-085", as: "redTamerB" },
            { card: "BT1-086", as: "blueTamer" },
            { card: "BT1-087", as: "yellowTamer" },
          ],
          hand: [{ card: "BT18-096", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("susanoomon").stack.length === 3);

    expect(s.perm("susanoomon").stack).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("redTamerB").permanentId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(7);
  });

  it("naturally executes Security by playing an inherited-effect Tamer and returning this Option to hand", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT18-096", as: "option" }], hand: [{ card: "BT18-088", as: "tamer" }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});

const TEN_HYBRIDS = [
  "BT18-018",
  "BT18-042",
  "BT18-018",
  "BT18-042",
  "BT18-018",
  "BT18-042",
  "BT18-018",
  "BT18-042",
  "BT18-018",
  "BT18-042",
];

function playLordOfDevastation(s: EngineSetup) {
  return s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId });
}

function battleAreaTopCardIds(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard!.cardId);
}

describe("BT18-096 Lord of Devastation and Rebirth — KB Q&A rulings", () => {
  it("digivolves a chosen Tamer into [Susanoomon] only when its ten-Hybrid digivolve condition is met (Q1686)", async () => {
    const digivolveTamerWith = async (hybridsUnder: string[]) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-088", as: "takuyaKoji", under: hybridsUnder }],
            hand: [
              { card: "BT18-096", as: "option" },
              { card: "BT18-102", as: "susanoomon" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(playLordOfDevastation(s)).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      return s;
    };

    const eligible = await digivolveTamerWith(TEN_HYBRIDS);
    expect(eligible.perm("takuyaKoji").topCard?.instanceId).toBe(eligible.inst("susanoomon").instanceId);
    expect(eligible.perm("takuyaKoji").stack).toHaveLength(TEN_HYBRIDS.length + 1);
    expect(eligible.state.memory).toBe(4);

    const tooFewHybrids = await digivolveTamerWith(TEN_HYBRIDS.slice(0, 9));
    expect(tooFewHybrids.perm("takuyaKoji").topCard?.cardId).toBe("BT18-088");
    expect(tooFewHybrids.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      tooFewHybrids.inst("susanoomon").instanceId,
    );
  });

  it("digivolves only the chosen Digimon, never switching to an eligible Tamer (Q1687)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-080", as: "titamon" },
            { card: "BT18-088", as: "takuyaKoji", under: TEN_HYBRIDS },
          ],
          hand: [
            { card: "BT18-096", as: "option" },
            { card: "BT18-102", as: "susanoomonA" },
            { card: "BT18-102", as: "susanoomonB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const titamonPermanentId = s.perm("titamon").permanentId;
    const tamerPermanentId = s.perm("takuyaKoji").permanentId;
    preferred.push(titamonPermanentId, s.perm("titamon").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(playLordOfDevastation(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    const baseChoices = s.decisions.filter(
      ({ req }) => req.kind === "chooseTargets" && req.options?.targetFate === "digivolve",
    );
    expect(baseChoices).toHaveLength(1);
    expect(baseChoices[0]!.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([titamonPermanentId, tamerPermanentId]),
    );
    // The "Then" clause may legally place the Tamer under the new Susanoomon, so the Tamer is
    // checked through the Susanoomon permanents rather than by looking up its own permanent.
    const susanoomonPermanentIds = s.state.players[0]!.battleArea.filter(
      (permanent) => permanent.topCard?.cardId === "BT18-102",
    ).map((permanent) => permanent.permanentId);
    expect(susanoomonPermanentIds).toEqual([titamonPermanentId]);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT18-102")).toHaveLength(1);
  });

  it("places Tamers only from the battle area, not from the hand or trash (Q3047)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-102", as: "susanoomon" },
            { card: "BT1-085", as: "fieldTamer" },
          ],
          hand: [
            { card: "BT18-096", as: "option" },
            { card: "BT1-086", as: "handTamer" },
          ],
          trash: [{ card: "BT1-087", as: "trashTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(playLordOfDevastation(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("susanoomon").stack.map((card) => card.instanceId)).toEqual([s.inst("fieldTamer").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("handTamer").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashTamer").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("places a red/blue Tamer and a red/yellow Tamer together because each supplies a different color (Q3048)", async () => {
    const placeTamers = async (tamers: string[]) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-102", as: "susanoomon" }, ...tamers.map((card) => ({ card }))],
            hand: [{ card: "BT18-096", as: "option" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(playLordOfDevastation(s)).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      return s;
    };

    const dualColored = await placeTamers(["BT18-089", "BT18-088"]);
    expect(
      dualColored
        .perm("susanoomon")
        .stack.map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT18-088", "BT18-089"]);
    expect(battleAreaTopCardIds(dualColored, 0)).toEqual(["BT18-102"]);
    expect(dualColored.state.memory).toBe(6);

    const bothOnlyRed = await placeTamers(["BT1-085", "BT1-085"]);
    expect(bothOnlyRed.perm("susanoomon").stack).toHaveLength(1);
    expect(bothOnlyRed.state.memory).toBe(5);
  });
});
