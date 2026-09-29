import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT10-088.js";
import "./BT10-084.js";

describe("BT10-088 Kiriha Aonuma", () => {
  it("sets memory to 3 at the start of the turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-088", as: "kiriha" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kiriha"));
    expect(s.state.memory).toBe(3);
  });

  it("does not lower memory when the turn starts above 3", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-088", as: "kiriha" }] } });
    s.state.memory = 5;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kiriha"));

    expect(s.state.memory).toBe(5);
  });

  it("suspends itself to DigiXros with cards under another Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-088", as: "kiriha" },
          {
            card: "BT10-087",
            as: "otherTamer",
            under: [
              { card: "BT10-019", as: "greymon" },
              { card: "BT10-021", as: "mailbirdramon" },
            ],
          },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 7;
    await s.ready();
    expect(s.perm("kiriha").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
          expanderPermanentIds: [s.perm("kiriha").permanentId],
          underTamerHostPermanentId: s.perm("otherTamer").permanentId,
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT10-024" && permanent.stack.length === 2,
      ),
    );

    expect(s.perm("kiriha").isSuspended).toBe(true);
    expect(s.perm("otherTamer").isSuspended).toBe(false);
    expect(s.perm("otherTamer").stack).toHaveLength(0);
  });

  it("does not mix materials under two different Tamers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-088", as: "kiriha" },
          { card: "BT10-087", as: "firstTamer", under: [{ card: "BT10-019", as: "greymon" }] },
          { card: "BT10-089", as: "secondTamer", under: [{ card: "BT10-021", as: "mailbirdramon" }] },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
          expanderPermanentIds: [s.perm("kiriha").permanentId],
          underTamerHostPermanentId: s.perm("firstTamer").permanentId,
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("kiriha").isSuspended).toBe(false);
    expect(s.perm("firstTamer").stack).toHaveLength(1);
    expect(s.perm("secondTamer").stack).toHaveLength(1);
  });

  it("rejects duplicate material IDs before paying the expander cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-088", as: "kiriha" },
          { card: "BT10-087", as: "host", under: [{ card: "BT10-058", as: "monitamon" }] },
        ],
        hand: [{ card: "BT10-063", as: "hiVisionMonitamon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("hiVisionMonitamon").instanceId,
        digiXros: {
          materialInstanceIds: [
            s.inst("monitamon").instanceId,
            s.inst("monitamon").instanceId,
            s.inst("monitamon").instanceId,
          ],
          expanderPermanentIds: [s.perm("kiriha").permanentId],
          underTamerHostPermanentId: s.perm("host").permanentId,
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("kiriha").isSuspended).toBe(false);
    expect(s.perm("host").stack).toHaveLength(1);
    expect(s.state.memory).toBe(10);
  });

  it("rejects duplicate expander IDs before suspending the Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-088", as: "kiriha" },
          {
            card: "BT10-087",
            as: "host",
            under: [
              { card: "BT10-019", as: "greymon" },
              { card: "BT10-021", as: "mailbirdramon" },
            ],
          },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
          expanderPermanentIds: [s.perm("kiriha").permanentId, s.perm("kiriha").permanentId],
          underTamerHostPermanentId: s.perm("host").permanentId,
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
    expect(s.perm("kiriha").isSuspended).toBe(false);
    expect(s.perm("host").stack).toHaveLength(2);
    expect(s.state.memory).toBe(10);
  });

  it("rejects a DigiXros expander the player no longer controls", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-088", as: "kiriha" },
          {
            card: "BT10-087",
            as: "host",
            under: [
              { card: "BT10-019", as: "greymon" },
              { card: "BT10-021", as: "mailbirdramon" },
            ],
          },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    s.perm("kiriha").controllerSeat = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
          expanderPermanentIds: [s.perm("kiriha").permanentId],
          underTamerHostPermanentId: s.perm("host").permanentId,
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
    expect(s.perm("kiriha").isSuspended).toBe(false);
    expect(s.perm("host").stack).toHaveLength(2);
  });

  it("rejects materials under a Tamer the player no longer controls", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-088", as: "kiriha" },
          {
            card: "BT10-087",
            as: "host",
            under: [
              { card: "BT10-019", as: "greymon" },
              { card: "BT10-021", as: "mailbirdramon" },
            ],
          },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    s.perm("host").controllerSeat = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
          expanderPermanentIds: [s.perm("kiriha").permanentId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("kiriha").isSuspended).toBe(false);
    expect(s.perm("host").stack).toHaveLength(2);
  });

  it("plays itself from security without paying memory", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT10-088", as: "kiriha", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("kiriha"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-088"));

    expect(s.state.memory).toBe(0);
  });
});

describe("BT10-088 Kiriha Aonuma — KB Q&A rulings", () => {
  const metalGreymonMaterials = (): CardSpec[] => [
    { card: "BT10-019", as: "greymon" },
    { card: "BT10-021", as: "mailbirdramon" },
  ];

  function declareMetalGreymonDigiXros(
    s: EngineSetup,
    options: { expander: boolean; underTamerHost?: string },
  ): ReturnType<EngineSetup["engine"]["applyIntent"]> {
    return s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("metalGreymon").instanceId,
      digiXros: {
        materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
        ...(options.expander ? { expanderPermanentIds: [s.perm("kiriha").permanentId] } : {}),
        ...(options.underTamerHost === undefined
          ? {}
          : { underTamerHostPermanentId: s.perm(options.underTamerHost).permanentId }),
      },
    });
  }

  async function settleMetalGreymonDigiXros(s: EngineSetup): Promise<void> {
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT10-024" && permanent.stack.length === 2,
      ),
    );
  }

  it("lets a DigiXros use Digimon cards from under a Tamer only by suspending this Tamer (Q2016)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-088", as: "kiriha", under: metalGreymonMaterials() }],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(declareMetalGreymonDigiXros(s, { expander: false })).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.perm("kiriha").stack).toHaveLength(2);

    expect(declareMetalGreymonDigiXros(s, { expander: true, underTamerHost: "kiriha" })).toEqual({ ok: true });
    await settleMetalGreymonDigiXros(s);

    const metalGreymon = s.perm("metalGreymon");
    expect(metalGreymon.stack.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId].sort(),
    );
    expect(s.perm("kiriha").isSuspended).toBe(true);
    expect(s.perm("kiriha").stack).toHaveLength(0);
    expect(s.state.memory).toBe(4);
  });

  it("also lets a DigiXros use cards from under a Tamer other than this Tamer (Q2017)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-088", as: "kiriha" },
          { card: "BT1-085", as: "tai", under: metalGreymonMaterials() },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(declareMetalGreymonDigiXros(s, { expander: true, underTamerHost: "tai" })).toEqual({ ok: true });
    await settleMetalGreymonDigiXros(s);

    expect(s.perm("metalGreymon").stack).toHaveLength(2);
    expect(s.perm("tai").stack).toHaveLength(0);
    expect(s.perm("tai").isSuspended).toBe(false);
    expect(s.perm("kiriha").isSuspended).toBe(true);
  });

  it("does not let a DigiXros use the digivolution cards of a Digimon that digivolved from a Tamer (Q2018)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-088", as: "kiriha" },
          { card: "BT1-010", as: "digivolvedTamer", under: [{ card: "BT1-085" }, ...metalGreymonMaterials()] },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(declareMetalGreymonDigiXros(s, { expander: true })).toEqual({ ok: false, reason: "invalid-material" });
    expect(declareMetalGreymonDigiXros(s, { expander: true, underTamerHost: "digivolvedTamer" })).toMatchObject({
      ok: false,
    });
    expect(s.perm("kiriha").isSuspended).toBe(false);
    expect(s.perm("digivolvedTamer").stack).toHaveLength(3);
    expect(s.state.memory).toBe(7);

    const control = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-088", as: "kiriha" },
          { card: "BT1-085", as: "tai", under: metalGreymonMaterials() },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    control.state.memory = 7;
    await control.ready();
    expect(declareMetalGreymonDigiXros(control, { expander: true })).toEqual({ ok: true });
  });

  async function playTactimonWithKiriha(trash: CardSpec[]): Promise<EngineSetup> {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-088", as: "kiriha" },
            { card: "BT1-085", as: "tai", under: [{ card: "BT10-076", as: "troopmon" }] },
          ],
          hand: [{ card: "BT10-084", as: "tactimon" }],
          trash,
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("troopmon").instanceId);
    s.state.memory = 13;
    await s.ready();

    const playedCardIds = trash.map((spec) => (typeof spec === "string" ? spec : spec.card));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tactimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        playedCardIds.every((cardId) =>
          s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === cardId),
        ),
    );
    return s;
  }

  function kirihaWasOfferedAsExpander(s: EngineSetup): boolean {
    const kirihaCardId = s.inst("kiriha").instanceId;
    return s.decisions.some(
      ({ req }) => req.kind === "selectCards" && (req.options?.candidateInstanceIds ?? []).includes(kirihaCardId),
    );
  }

  it.fails("cannot be used when 2 Digimon with DigiXros requirements are played at the same time (Q2019)", async () => {
    const single = await playTactimonWithKiriha([{ card: "BT10-077", as: "madLeomon" }]);
    expect(kirihaWasOfferedAsExpander(single)).toBe(true);
    expect(single.perm("kiriha").isSuspended).toBe(true);
    expect(single.perm("madLeomon").stack.map((card) => card.instanceId)).toContain(single.inst("troopmon").instanceId);

    const pair = await playTactimonWithKiriha([
      { card: "BT10-077", as: "madLeomon" },
      { card: "BT11-081", as: "madLeomonArmed" },
    ]);
    expect(kirihaWasOfferedAsExpander(pair)).toBe(false);
    expect(pair.perm("kiriha").isSuspended).toBe(false);
    expect(pair.perm("tai").stack.map((card) => card.instanceId)).toEqual([pair.inst("troopmon").instanceId]);
  });

  it.fails("cannot be used when a DigiXros Digimon is played together with a Digimon without DigiXros requirements (Q2020)", async () => {
    const s = await playTactimonWithKiriha([
      { card: "BT10-077", as: "madLeomon" },
      { card: "BT10-075", as: "damemon" },
    ]);

    expect(kirihaWasOfferedAsExpander(s)).toBe(false);
    expect(s.perm("kiriha").isSuspended).toBe(false);
    expect(s.perm("tai").stack.map((card) => card.instanceId)).toEqual([s.inst("troopmon").instanceId]);
  });
});
