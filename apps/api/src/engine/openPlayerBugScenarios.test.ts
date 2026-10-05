import { Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { ISSUE_REPRO_SCENARIO_IDS, type IssueReproScenarioId } from "./issueReproScenarios.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, type SetupEngineOptions } from "./testkit/harness.js";

async function start(id: IssueReproScenarioId, options: SetupEngineOptions = {}) {
  const drasil = id === "arena-discord-1556732255148179569-drasil-turn";
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: !drasil,
      autoDeclineOptional: drasil,
      autoSelectCards: true,
      autoChooseOption: true,
      ...options,
    },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding || s.state.phase === Phase.Main);
  if (s.state.phase === Phase.Breeding) expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  const inBreeding = s.state.phase === Phase.Breeding;
  const endResult = inBreeding ? s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" }) : { ok: true };
  expect(endResult).toEqual({ ok: true });
  if (inBreeding) await advance(s.engine).waitForMainPhase(s.state.turnSeat);
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}
function hand(s: ReturnType<typeof setupEngine>, cardId: string, seat: Seat = 0) {
  const card = s.state.players[seat]!.hand.find((c) => c.cardId === cardId);
  if (!card) throw new Error(`Missing ${cardId} in seat ${seat}'s hand`);
  return card;
}
function field(s: ReturnType<typeof setupEngine>, cardId: string, seat: Seat = 0) {
  const permanent = s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === cardId);
  if (!permanent) throw new Error(`Missing ${cardId} in seat ${seat}'s field`);
  return permanent;
}
async function resolved(s: ReturnType<typeof setupEngine>, cardId: string) {
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === cardId) &&
      s.state.pendingDecision === undefined,
  );
}

describe("open player bugs — playable production turn-loop scenarios", () => {
  it.each(ISSUE_REPRO_SCENARIO_IDS)("%s reaches interactive Main", async (id) => {
    const run = await start(id);
    expect(run.s.state.phase).toBe(Phase.Main);
    expect(run.s.state.pendingDecision).toBeUndefined();
    await finish(run);
  });

  it.each([true, false])("#4938 makes Ruli's suspension optional (accept: %s)", async (accept) => {
    const run = await start("arena-issue-4938-ruli-optional-reduction", {
      autoAcceptOptional: accept,
      autoDeclineOptional: !accept,
    });
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: field(s, "RB1-022").permanentId,
        instanceId: hand(s, "RB1-024").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "RB1-024") &&
        s.state.pendingDecision === undefined,
    );
    expect(field(s, "RB1-034").isSuspended).toBe(accept);
    expect(s.state.memory).toBe(accept ? 3 : 2);
    expect(s.decisions.filter((d) => d.req.sourceCardId === "RB1-034" && d.req.kind === "optional")).toHaveLength(1);
    await finish(run);
  });

  it("#4931 applies the printed Knightmon play reduction", async () => {
    const run = await start("arena-issue-4931-lordknightmon-reduction", {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
    });
    const { s } = run;
    const memory = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "AD1-018").instanceId })).toEqual({
      ok: true,
    });
    await resolved(s, "AD1-018");
    expect(s.state.memory).toBe(memory - 6);
    await finish(run);
  });

  it("#4923 uses Sagomon in Assembly through a real play intent", async () => {
    const run = await start("arena-issue-4923-seiten-assembly", {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
    });
    const { s } = run;
    const memory = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: hand(s, "EX12-048").instanceId,
        assembly: { materialInstanceIds: s.state.players[0]!.trash.map((c) => c.instanceId) },
      }),
    ).toEqual({ ok: true });
    await resolved(s, "EX12-048");
    expect(s.state.memory).toBe(memory - 7);
    expect(field(s, "EX12-048").stack.map((c) => c.cardId)).toEqual(
      expect.arrayContaining(["EX12-015", "EX12-029", "BT12-041"]),
    );
    await finish(run);
  });

  it("#4933 leaves Lilamon's other allied Digimon unprotected", async () => {
    const run = await start("arena-issue-4933-lilamon-host");
    const { s } = run;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT6-095").instanceId })).toEqual({
      ok: true,
    });
    await resolved(s, "BT6-095");
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST24-03")).toBe(false);
    expect(field(s, "ST24-11", 1)).toBeDefined();
    expect(field(s, "ST24-13", 1).stack).toHaveLength(1);
    await finish(run);
  });

  it("#4930 offers the opponent's source-free Digimon as Venusmon's cost", async () => {
    const preferred: string[] = [];
    const run = await start("arena-issue-4930-venusmon-opponent-cost", { preferInstanceIds: preferred });
    const { s } = run;
    const cost = field(s, "BT6-007");
    preferred.push(cost.permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT6-095").instanceId })).toEqual({
      ok: true,
    });
    await resolved(s, "BT6-095");
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(cost.topCard.instanceId);
    expect(field(s, "BT24-034", 1)).toBeDefined();
    await finish(run);
  });

  it("#4929 peels the same chosen opponent three times with one target prompt", async () => {
    const run = await start("arena-issue-4929-noir-single-target", {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
    });
    const { s } = run;
    const victims = [...s.state.players[1]!.battleArea];
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "EX13-066").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await resolved(s, "EX13-066");
    expect(victims[0]!.topCard.cardId).toBe("BT1-013");
    expect(victims[1]!.topCard.cardId).toBe("BT1-080");
    expect(s.decisions.filter((d) => d.req.sourceCardId === "EX13-066" && d.req.kind === "chooseTargets")).toHaveLength(
      1,
    );
    await finish(run);
  });

  it("#4926 resolves the turn player's battle effects before Rie", async () => {
    const run = await start("arena-issue-4926-battle-priority", {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
    });
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: field(s, "BT23-047").permanentId,
        target: { kind: "permanent", permanentId: field(s, "BT5-042", 1).permanentId },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "EX13-074")).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX13-074")).toBe(false);
    await finish(run);
  });

  it("#4924 sends private security faces to the selection", async () => {
    const run = await start("arena-issue-4924-revelation-security-faces");
    const { s } = run;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT15-092").instanceId })).toEqual({
      ok: true,
    });
    await resolved(s, "BT15-092");
    const decision = s.decisions.find((d) => d.req.sourceCardId === "BT15-092" && d.req.kind === "selectCards");
    expect(decision?.req.options?.visibleCards).toHaveLength(3);
    expect(s.events.filter((e) => e.kind === "cardRevealed" && e.sourceCardId === "BT15-092")).toHaveLength(0);
    await finish(run);
  });

  it("#4919 returns Seventh Lightning even when the level 4 deletion has no target", async () => {
    const run = await start("arena-issue-4919-seventh-lightning-cost");
    const { s } = run;
    const option = s.state.players[0]!.trash.find((c) => c.cardId === "BT15-100")!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: field(s, "BT15-077").permanentId,
        instanceId: hand(s, "BT15-081").instanceId,
      }),
    ).toEqual({ ok: true });
    await resolved(s, "BT15-100");
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(option.instanceId);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === option.instanceId)).toBe(false);
    await finish(run);
  });

  it("#4915 makes Homeros a legal Junomon hand play", async () => {
    const run = await start("arena-issue-4915-junomon-homeros");
    const { s } = run;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: field(s, "BT1-024").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(field(s, "BT24-102", 1)).toBeDefined();
    await finish(run);
  });

  it("#4913 triggers Cool Boy after the Proto Form evolution", async () => {
    const run = await start("arena-issue-4913-cool-boy-proto-form");
    const { s } = run;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "EX5-070").instanceId })).toEqual({
      ok: true,
    });
    await resolved(s, "EX5-070");
    await settle(() => field(s, "BT9-092").isSuspended && s.state.pendingDecision === undefined);
    expect(field(s, "BT20-028")).toBeDefined();
    await finish(run);
  });

  it("#4921 does not retroactively trigger Homeros played by Kanan at end of turn", async () => {
    const run = await start("arena-issue-4921-homeros-late-arrival");
    const { s } = run;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(field(s, "BT24-102")).toBeDefined();
    expect(
      s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT24-102" && e.timing === "OnEndTurn"),
    ).toBe(false);
    await finish(run);
  });

  it("#4916 excludes an immune Craniamon already targeted by Raid from blocking", async () => {
    const run = await start("arena-issue-4916-raid-target-block");
    const { s } = run;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: hand(s, "EX13-062", 1).instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: field(s, "AD1-008").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(
      s.events.some((e) => e.kind === "attackDeclared" && e.redirected === true && e.target.kind === "permanent"),
    ).toBe(true);
    expect(s.events.filter((e) => e.kind === "blockWindowOpened")).toHaveLength(0);
    await finish(run);
  });

  it("#4907 allows declining Takato's cost after Kurata and Decode", async () => {
    const run = await start("arena-issue-4907-takato-end-turn", {
      declinePrompts: ["Pay cost:", "By trashing 1 card in your hand"],
    });
    const { s } = run;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(field(s, "EX13-007")).toBeDefined();
    expect(field(s, "BT17-080")).toBeDefined();
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT17-010")).toBe(true);
    expect(hand(s, "BT17-016")).toBeDefined();
    await finish(run);
  });
});
