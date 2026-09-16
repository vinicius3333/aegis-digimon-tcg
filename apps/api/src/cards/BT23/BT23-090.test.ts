import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-090.js";

const NEUTRAL_SECURITY = ["BT1-009", "BT1-010", "BT1-011"];
const NEUTRAL_DECK = ["BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"];

function turnBoard(seat0: BoardSpec[0], seat1?: BoardSpec[1]): BoardSpec {
  return {
    0: { deck: [...NEUTRAL_DECK], security: [...NEUTRAL_SECURITY], ...seat0 },
    1: {
      deck: [...NEUTRAL_DECK],
      security: [...NEUTRAL_SECURITY],
      hand: [{ card: "BT1-009", as: "opponentSpare" }],
      ...seat1,
    },
  };
}

async function runSeat0Turn(board: BoardSpec, opts: SetupEngineOptions, memory?: number) {
  const s = setupEngine(board, opts);
  if (memory !== undefined) s.state.memory = memory;
  const loop = s.engine.startTurnLoop();
  for (let i = 0; i < 500 && s.state.phase !== Phase.Main; i += 1) {
    if (s.state.phase === Phase.Breeding && s.state.turnSeat === 0) {
      s.engine.applyIntent(0, { type: "endPhase" });
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

async function endSeat0Turn(s: Awaited<ReturnType<typeof runSeat0Turn>>["s"]) {
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
}

async function finish(s: Awaited<ReturnType<typeof runSeat0Turn>>["s"], loop: Promise<unknown>) {
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT23-090 Keisuke Amasawa", () => {
  it("matches every catalog field and complete compiled clause", () => {
    const definition = getCardDefinition("BT23-090")!;
    expect(definition).toMatchObject({
      cardId: "BT23-090",
      nameEn: "Keisuke Amasawa",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["Hudie", "CS"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    const printed = (definition.effectText ?? "").replace(/\s+/g, " ");
    expect(printed).toContain("[Start of Your Turn] If you have 2 or less memory, set it to 3.");
    expect(printed).toContain(
      "[End of Your Turn] By suspending this Tamer and returning 1 of your Digimon with the [Hudie] trait to the hand, you may play 1 Tamer card with the [CS] trait from your hand without paying the cost.",
    );
    expect(printed).toContain("[All Turns] All of your [Hudie] Digimon get +1000 DP.");

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((entry) => entry.trigger)).toEqual([
      "StartOfYourTurn",
      "EndOfYourTurn",
      "AllTurns",
      "Security",
    ]);
  });

  it("sets memory to 3 through the real turn start when it is 2 or less", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [{ card: "BT23-090", as: "keisuke" }],
        hand: [{ card: "BT1-009", as: "spare" }],
      }),
      { autoDeclineOptional: true },
      1,
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("keisuke").isSuspended).toBe(false);
    await endSeat0Turn(s);
    await finish(s, loop);
  });

  it("leaves memory above the gate untouched at the turn start", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [{ card: "BT23-090", as: "keisuke" }],
        hand: [{ card: "BT1-009", as: "spare" }],
      }),
      { autoDeclineOptional: true },
      5,
    );

    expect(s.state.memory).toBe(5);
    await endSeat0Turn(s);
    await finish(s, loop);
  });

  it("pays both costs at the end of the turn and plays a [CS] Tamer from hand for free", async () => {
    const memoryAtPlay: number[] = [];
    let watchedTamerId: string | undefined;
    let sRef: Awaited<ReturnType<typeof runSeat0Turn>>["s"] | undefined;
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-090", as: "keisuke" },
          { card: "BT23-101", as: "hudie" },
        ],
        hand: [
          { card: "BT23-080", as: "csTamer" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent(event) {
          if (
            event.kind === "cardsMoved" &&
            watchedTamerId !== undefined &&
            event.instanceIds.includes(watchedTamerId) &&
            event.to === "battleArea"
          ) {
            memoryAtPlay.push(sRef!.state.memory);
          }
        },
      },
      1,
    );
    sRef = s;
    const hudieId = s.inst("hudie").instanceId;
    const tamerId = s.inst("csTamer").instanceId;
    watchedTamerId = tamerId;
    const memoryBefore = s.state.memory;

    await endSeat0Turn(s);

    const me = s.state.players[0]!;
    expect(s.perm("keisuke").isSuspended).toBe(true);
    expect(me.hand.some((card) => card.instanceId === hudieId)).toBe(true);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === hudieId)).toBe(false);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === tamerId)).toBe(true);
    expect(me.hand.some((card) => card.instanceId === tamerId)).toBe(false);
    expect(me.trash.some((card) => card.instanceId === tamerId)).toBe(false);
    expect(memoryBefore).toBe(3);
    expect(memoryAtPlay).toEqual([-3]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();

    await finish(s, loop);
  });

  it("declining the optional pays neither cost and plays nothing", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-090", as: "keisuke" },
          { card: "BT23-101", as: "hudie" },
        ],
        hand: [
          { card: "BT23-080", as: "csTamer" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoDeclineOptional: true, autoSelectCards: true },
      1,
    );

    await endSeat0Turn(s);

    const me = s.state.players[0]!;
    expect(s.perm("keisuke").isSuspended).toBe(false);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("hudie").instanceId)).toBe(true);
    expect(me.hand.some((card) => card.instanceId === s.inst("csTamer").instanceId)).toBe(true);

    await finish(s, loop);
  });

  it("suspends nothing and plays nothing without a [Hudie] Digimon to return (Q5363)", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-090", as: "keisuke" },
          { card: "BT23-006", as: "nonHudie" },
        ],
        hand: [
          { card: "BT23-080", as: "csTamer" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
      1,
    );

    await endSeat0Turn(s);

    const me = s.state.players[0]!;
    expect(s.perm("keisuke").isSuspended).toBe(false);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("nonHudie").instanceId)).toBe(
      true,
    );
    expect(me.hand.some((card) => card.instanceId === s.inst("csTamer").instanceId)).toBe(true);
    expect(me.battleArea).toHaveLength(2);

    await finish(s, loop);
  });

  it("cannot pay the return cost with the opponent's [Hudie] Digimon", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard(
        {
          battleArea: [{ card: "BT23-090", as: "keisuke" }],
          hand: [
            { card: "BT23-080", as: "csTamer" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        {
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          battleArea: [{ card: "BT23-101", as: "opponentHudie" }],
        },
      ),
      { autoAcceptOptional: true, autoSelectCards: true },
      1,
    );

    await endSeat0Turn(s);

    expect(s.perm("keisuke").isSuspended).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("opponentHudie").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("csTamer").instanceId)).toBe(true);

    await finish(s, loop);
  });

  it("does not activate while this Tamer is already suspended", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-090", as: "keisuke", suspended: true },
          { card: "BT23-101", as: "hudie" },
        ],
        hand: [
          { card: "BT23-080", as: "csTamer" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
      1,
    );
    s.perm("keisuke").isSuspended = true;

    await endSeat0Turn(s);

    const me = s.state.players[0]!;
    expect(s.perm("keisuke").isSuspended).toBe(true);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("hudie").instanceId)).toBe(true);
    expect(me.hand.some((card) => card.instanceId === s.inst("csTamer").instanceId)).toBe(true);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("csTamer").instanceId)).toBe(
      false,
    );

    await finish(s, loop);
  });

  it("does not play a Tamer without the [CS] trait", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: "BT23-090", as: "keisuke" },
          { card: "BT23-101", as: "hudie" },
        ],
        hand: [
          { card: "BT2-088", as: "nonCsTamer" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
      1,
    );

    await endSeat0Turn(s);

    const me = s.state.players[0]!;
    expect(s.perm("keisuke").isSuspended).toBe(false);
    expect(me.hand.some((card) => card.instanceId === s.inst("nonCsTamer").instanceId)).toBe(true);
    expect(me.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("hudie").instanceId)).toBe(true);

    await finish(s, loop);
  });

  it("gives +1000 DP to your [Hudie] Digimon only, on both turns", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard(
        {
          battleArea: [
            { card: "BT23-090", as: "keisuke" },
            { card: "BT23-101", as: "hudie" },
            { card: "BT23-006", as: "nonHudie" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
        {
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          battleArea: [{ card: "BT23-101", as: "opponentHudie" }],
        },
      ),
      { autoDeclineOptional: true },
      1,
    );

    expect(s.perm("hudie").currentDP).toBe(8000);
    expect(s.perm("nonHudie").currentDP).toBe(1000);
    expect(s.perm("opponentHudie").currentDP).toBe(7000);

    const late = s.putOnBoard(0, { card: "BT23-020", as: "lateHudie" });
    await s.ready();
    expect(late.currentDP).toBe(6000);

    await endSeat0Turn(s);
    expect(s.perm("hudie").currentDP).toBe(8000);
    expect(s.perm("opponentHudie").currentDP).toBe(7000);

    await finish(s, loop);
  });

  it("stops granting +1000 DP the moment this Tamer leaves the field", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard(
        {
          battleArea: [
            { card: "BT23-090", as: "keisuke" },
            { card: "BT23-101", as: "hudieA" },
            { card: "BT23-020", as: "hudieB" },
            { card: "BT1-024", as: "control" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
        {
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
          battleArea: [{ card: "BT10-064", as: "opponentBlack" }],
          hand: [
            { card: "BT15-097", as: "slicer" },
            { card: "BT10-065", as: "cyborgFodder" },
          ],
        },
      ),
      { autoDeclineOptional: true, autoSelectCards: true },
      1,
    );
    const keisukeId = s.perm("keisuke").topCard!.instanceId;
    const fodderId = s.inst("cyborgFodder").instanceId;

    expect(s.perm("hudieA").currentDP).toBe(8000);
    expect(s.perm("hudieB").currentDP).toBe(6000);
    expect(s.perm("control").currentDP).toBe(10_000);
    expect(s.perm("keisuke").currentDP).toBe(0);

    await endSeat0Turn(s);
    expect(s.perm("hudieA").currentDP).toBe(8000);
    expect(s.perm("hudieB").currentDP).toBe(6000);
    s.state.memory = 6;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("slicer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === keisukeId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === keisukeId)).toBe(true);
    expect(s.perm("hudieA").currentDP).toBe(7000);
    expect(s.perm("hudieB").currentDP).toBe(5000);
    expect(s.perm("control").currentDP).toBe(10_000);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === fodderId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    await finish(s, loop);
  });

  it("plays itself from the security stack without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
        },
        1: {
          deck: [...NEUTRAL_DECK],
          security: [{ card: "BT23-090", as: "keisukeInSecurity" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const memoryBefore = s.state.memory;
    const keisukeId = s.inst("keisukeInSecurity").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === keisukeId) || s.events.length > 400,
    );

    const opponent = s.state.players[1]!;
    expect(opponent.battleArea.some((permanent) => permanent.topCard?.instanceId === keisukeId)).toBe(true);
    expect(opponent.trash.some((card) => card.instanceId === keisukeId)).toBe(false);
    expect(opponent.security.some((card) => card.instanceId === keisukeId)).toBe(false);
    expect(opponent.security).toHaveLength(1);
    expect(s.state.memory).toBe(memoryBefore);
  });
});
