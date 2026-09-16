import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT18-036.js";
import "./BT18-019.js";

const INERT_SECURITY = ["BT1-009", "BT1-011", "BT1-012"];

type Setup = ReturnType<typeof setupEngine>;

async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

async function stopLoop(s: Setup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT18-036 Wizardmon", () => {
  it("limits inherited prevention to opponent effects and the yellow Data/Witchelny filter", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "byOpponentEffect",
          sourceFilter: {
            isSelfRef: true,
            colors: ["Yellow"],
            nameOrTrait: [{ tokens: ["Data", "Witchelny"], match: "trait" }],
          },
        },
      ],
    });
  });

  it("trashes the exact top security card, draws, and gains 1 memory when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-034", as: "lucemon" }],
          security: [
            { card: "BT1-009", as: "topSecurity" },
            { card: "BT1-010", as: "bottomSecurity" },
          ],
          deck: [
            { card: "BT1-011", as: "evolutionDraw" },
            { card: "BT1-012", as: "effectDraw" },
          ],
          hand: [{ card: "BT18-036", as: "wizardmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lucemon").permanentId,
        instanceId: s.inst("wizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("effectDraw").instanceId) &&
        s.state.memory === 4,
    );

    expect(s.perm("lucemon").topCard?.instanceId).toBe(s.inst("wizardmon").instanceId);
    expect(s.perm("lucemon").stack.map(({ cardId }) => cardId)).toEqual(["BT18-034"]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottomSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("topSecurity").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(4);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("may decline without trashing security, drawing, or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-034", as: "lucemon" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: [
            { card: "BT1-011", as: "evolutionDraw" },
            { card: "BT1-012", as: "notDrawn" },
          ],
          hand: [{ card: "BT18-036", as: "wizardmon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lucemon").permanentId,
        instanceId: s.inst("wizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("prevents a natural opponent-effect deletion by trashing the top security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "host", under: ["BT18-036"] }],
          security: ["BT1-009", "BT1-010"],
        },
        1: { hand: [{ card: "BT18-019", as: "opponentRemover" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentRemover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-036")).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("inherits once-per-turn protection against an opponent effect for a yellow Data host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "host", under: ["BT18-036"] }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it.each([
    ["BT3-037", "Data"],
    ["BT26-022", "Witchelny"],
  ])("prevents an opponent effect from removing a yellow %s host by trashing the top security card", async (host) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: host, as: "host", dp: 4000, under: [{ card: "BT18-036", as: "wizardmon" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([host]);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("wizardmon").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("secTop").instanceId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secNext").instanceId]);
    assertNoLoudGap(s);
  });

  it.each([
    ["BT1-051", "a yellow Vaccine host with neither the [Data] nor the [Witchelny] trait"],
    ["BT1-014", "a red [Data] host that is not yellow"],
  ])("does not protect %s (%s)", async (host) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: host, as: "host", dp: 4000, under: [{ card: "BT18-036", as: "wizardmon" }] }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT18-036", host].sort());
  });

  it("protects only the Digimon carrying this card, not a matching yellow [Data] sibling (Q3087)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-037", as: "carrier", dp: 4000, under: [{ card: "BT18-036", as: "wizardmon" }] },
            { card: "BT9-035", as: "sibling", dp: 4000 },
          ],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-011", as: "secNext" },
          ],
          deck: ["BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flare" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    preferInstanceIds.push(s.perm("sibling").topCard!.instanceId, s.perm("sibling").permanentId);
    const siblingTopId = s.perm("sibling").topCard!.instanceId;
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("carrier").topCard!.instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([siblingTopId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secNext").instanceId,
    ]);
  });

  it("prevents only once per opponent turn and re-arms on the opponent's following turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT18-036", as: "wizardmon" }] }],
          security: [
            { card: "BT1-009", as: "secOne" },
            { card: "BT1-011", as: "secTwo" },
            { card: "BT1-012", as: "secThree" },
          ],
          deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flareOne" },
            { card: "BT2-091", as: "flareTwo" },
            { card: "BT2-091", as: "flareThree" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareOne").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareTwo").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secTwo").instanceId,
      s.inst("secThree").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT18-036", "BT3-037"]);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);
  });

  it("re-arms the once-per-turn prevention on the opponent's following turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-037", as: "host", dp: 4000, under: [{ card: "BT18-036", as: "wizardmon" }] }],
          security: [
            { card: "BT1-009", as: "secOne" },
            { card: "BT1-011", as: "secTwo" },
            { card: "BT1-012", as: "secThree" },
          ],
          deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponentSource", dp: 20_000 }],
          hand: [
            { card: "BT2-091", as: "flareOne" },
            { card: "BT2-091", as: "flareTwo" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012", "BT1-012", "BT1-012", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareOne").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);
    closeMain(s, 1);

    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flareTwo").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT3-037"]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("secThree").instanceId]);
  });
});
