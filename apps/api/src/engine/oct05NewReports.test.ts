import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("#4999 Mother D-Reaper in battle supplies white for In-Between Theater", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX2-007", as: "mother" }],
        hand: [{ card: "BT24-100", as: "option" }],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 8;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(
    () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-100") && !s.state.pendingDecision,
  );
  expect(s.state.memory).toBe(5);
});
it("#5000 Mother D-Reaper qualifies Marsmon's 13000 DP play reduction", async () => {
  const s = setupEngine(
    { 0: { battleArea: [{ card: "EX2-007", as: "mother" }], hand: [{ card: "BT25-020", as: "mars" }] } },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mars").instanceId })).toEqual({ ok: true });
  await settle();
  expect(s.state.memory).toBe(3);
});
it("#5001 Gomamon searches LM-040 Vikemon as a Sea Beast", async () => {
  const s = setupEngine(
    { 0: { hand: [{ card: "EX8-018", as: "goma" }], deck: [{ card: "LM-040", as: "vike" }, "BT1-010", "BT1-010"] } },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 8;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goma").instanceId })).toEqual({ ok: true });
  await settle(
    () => s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX8-018") && !s.state.pendingDecision,
  );
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("vike").instanceId);
});
it("#5004 ST24-13 pays Burst Digivolution's Marcus Damon return", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "ST24-07", as: "shine" },
          { card: "ST24-13", as: "marcus" },
        ],
        hand: [{ card: "BT25-104", as: "burst" }],
        deck: ["BT1-010", "BT1-010"],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: false },
  );
  await s.ready();
  s.state.memory = 8;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("shine").permanentId,
      instanceId: s.inst("burst").instanceId,
      useAlternateCost: true,
      alternateRequirementIndex: 1,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("shine").topCard.cardId === "BT25-104" && !s.state.pendingDecision);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("marcus").instanceId);
  expect(s.state.memory).toBe(8);
});
it("#5005 Mococomon's inherited once-per-turn does not reset when its host digivolves", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX12-006", as: "host", under: ["EX12-002"] }],
        hand: [
          { card: "EX12-006", as: "play1" },
          { card: "EX12-006", as: "play2" },
          { card: "EX12-012", as: "evo1" },
          { card: "EX12-045", as: "evo2" },
        ],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true, declinePrompts: ["Apemon"] },
  );
  await s.ready();
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("play1").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("host").topCard.cardId === "EX12-012" && !s.state.pendingDecision);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("play2").instanceId })).toEqual({ ok: true });
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
  expect(s.perm("host").topCard.cardId).toBe("EX12-012");
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("evo2").instanceId);
});
it("#5010 Espimon moving increases face-up security and draws from Kapurimon", async () => {
  const s = setupEngine(
    {
      0: { breeding: { card: "EX11-037", as: "espi", under: ["EX11-004"] }, deck: ["BT1-010", "BT1-010"] },
      1: { security: [{ card: "BT1-010", faceUp: false }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.phase = Phase.Breeding;
  const before = s.state.players[0]!.hand.length;
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("espi").permanentId })).toEqual({
    ok: true,
  });
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX11-037") && !s.state.pendingDecision,
  );
  expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);
  expect(s.state.players[0]!.hand.length).toBe(before + 1);
});

it("#5009 AeroVeedramon does not return a level-less Pipe Fox Token", async () => {
  const s = setupEngine(
    { 0: { hand: [{ card: "BT22-023", as: "aero" }] }, 1: { battleArea: [{ card: "TOKEN-Pipe-Fox", as: "fox" }] } },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  const foxId = s.perm("fox").permanentId;
  await s.ready();
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aero").instanceId })).toEqual({ ok: true });
  await settle();
  expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toContain(foxId);
});

it("#5005 a forced attack consumes pending Mococomon only once", async () => {
  const opts = {
    autoOrderTriggers: false,
    autoSelectCards: true,
    autoAcceptOptional: true,
    autoChooseOption: true,
    preferInstanceIds: [] as string[],
    preferTriggerKeys: ["EX12-056"],
    declineDigiXros: true,
    declinePrompts: ["Apemon", "Suspend another"],
  };
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX12-043", as: "host", under: ["EX12-002"] }],
        security: ["BT1-010", "BT1-010", "BT1-010"],
        hand: [
          { card: "EX12-056", as: "cho" },
          { card: "EX12-045", as: "sanz" },
          { card: "EX12-034", as: "evo1" },
          { card: "EX12-076", as: "evo2" },
        ],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
      1: { security: ["BT1-010", "BT1-010"] },
    },
    opts,
  );
  opts.preferInstanceIds = [s.inst("cho").instanceId];
  await s.ready();
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("sanz").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const first = s.decisions.at(-1)!.req;
  expect(first.options!.triggerCardIds).toEqual(["EX12-056", "EX12-002"]);
  const keys = first.options!.triggerKeys!;
  opts.autoOrderTriggers = true;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: first.decisionId,
      response: {
        kind: "orderTriggers",
        order: [...keys].sort((a, b) => Number(b.includes("EX12-056")) - Number(a.includes("EX12-056"))),
        optionalAnswers: Object.fromEntries(keys.map((k) => [k, true])),
      },
    }),
  ).toEqual({ ok: true });
  await settle();
  await advance(s.engine).finishAttack();
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision && !s.state.combatWindow);

  expect(s.events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-002")).toHaveLength(1);
  expect(s.perm("host").topCard.cardId).toBe("EX12-034");
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("evo2").instanceId);
});
it.each(["BT23-032", "BT16-102"])(
  "#5007 battle deletion orders Shakkoumon with Armor Purge (%s first)",
  async (first) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-102", as: "armor", under: ["BT1-051", "BT23-032"] }] },
        1: { battleArea: [{ card: "BT1-084", as: "defender", suspended: true, dp: 16000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferTriggerKeys: [first] },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("armor").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "attackEnded") && !s.state.pendingDecision);
    const order = s.decisions.find(
      (d) =>
        d.req.kind === "orderTriggers" &&
        d.req.options?.triggerCardIds?.includes("BT23-032") &&
        d.req.options?.triggerCardIds?.includes("BT16-102"),
    );
    expect(order).toBeDefined();
    expect(s.perm("armor").topCard.cardId).toBe("BT23-032");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-051")).toBe(first === "BT23-032");
  },
);

it("#5003 end-turn Bacchusmon reactions block manual plays between decisions", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX7-062", as: "lilith" }],
        trash: [{ card: "BT2-067", as: "devimon" }, "BT2-068"],
        hand: [{ card: "BT1-009", as: "spare" }],
        deck: ["BT1-010", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT25-077", as: "bacchus" }], deck: ["BT1-010", "BT1-010"] },
    },
    { autoAcceptOptional: true },
  );
  await s.ready();
  s.state.memory = 5;
  const loop = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.pendingDecision !== undefined &&
      s.decisions.at(-1)!.req.sourceCardId === "EX7-062" &&
      s.state.pendingDecision.kind === "selectCards",
  );
  const play = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: play.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("devimon").instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.pendingDecision !== undefined &&
      s.decisions.at(-1)!.req.sourceCardId === "BT25-077" &&
      s.state.pendingDecision.kind === "chooseTargets",
  );
  const suspend = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(suspend.seat, {
      type: "respondDecision",
      decisionId: suspend.decisionId,
      response: { kind: "chooseTargets", instanceIds: [] },
    }),
  ).toEqual({ ok: true });
  const memory = s.state.memory;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("spare").instanceId })).toEqual({
    ok: false,
    reason: "wrong-phase",
  });
  expect(s.state.memory).toBe(memory);
  expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("spare").instanceId)).toBe(true);
  await loop;
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT2-067")).toBe(false);
});

it("#5001 Gomamon names each search category and reserves Vikemon for Sea Beast", async () => {
  const s = setupEngine({
    0: {
      hand: [{ card: "EX8-018", as: "goma" }],
      deck: [{ card: "EX8-018", as: "ds" }, { card: "LM-040", as: "vike" }, "BT14-026", "BT1-010"],
    },
  });
  await s.ready();
  s.state.memory = 8;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goma").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const ds = s.decisions.at(-1)!.req;
  expect(ds.options?.effectTextPart).toBe("Add 1 card with the [DS] trait");
  expect(ds.options?.candidateInstanceIds).not.toContain(s.inst("vike").instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: ds.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("ds").instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision !== undefined && s.state.pendingDecision.decisionId !== ds.decisionId);
  const beast = s.decisions.at(-1)!.req;
  expect(beast.options?.effectTextPart).toBe("1 card with the [Sea Beast]/[Plesiosaur] trait among them to the hand.");
  expect(beast.options?.candidateInstanceIds).toContain(s.inst("vike").instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: beast.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("vike").instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("vike").instanceId);
});
it.each(["BT23-032", "BT16-102"])(
  "#5007 effect deletion also orders Armor Purge with Shakkoumon (%s first)",
  async (first) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-072" }], hand: [{ card: "BT2-110", as: "delete" }] },
        1: { battleArea: [{ card: "BT16-102", as: "armor", under: ["BT1-051", "BT23-032"] }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferTriggerKeys: [first] },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("delete").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    expect(
      s.decisions.some(
        (d) =>
          d.req.kind === "orderTriggers" &&
          d.req.options?.triggerCardIds?.includes("BT23-032") &&
          d.req.options.triggerCardIds.includes("BT16-102"),
      ),
    ).toBe(true);
    expect(s.perm("armor").topCard.cardId).toBe("BT23-032");
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-051")).toBe(first === "BT23-032");
  },
);
