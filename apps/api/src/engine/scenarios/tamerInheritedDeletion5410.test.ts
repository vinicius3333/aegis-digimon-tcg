import { expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";

it.each(["EX13-074", "BT1-087"])("#5410: %s never inherits BT19-063's deletion effect", async (hostCard) => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT18-082", as: "chaos" }], deck: ["BT1-009", "BT1-009"] },
      1: {
        battleArea: [{ card: hostCard, as: "host", under: [{ card: "BT19-063", as: "darkknight" }] }],
        trash: [{ card: "BT18-058", as: "kotemon" }],
        deck: ["BT1-009", "BT1-009"],
        security: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT18-082") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toContain(s.inst("host").instanceId);
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toContain(s.inst("kotemon").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      s.events.filter((e) => e.kind === "effectTriggered" && e.sourceInstanceId === s.inst("darkknight").instanceId),
    ).toHaveLength(0);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});

it("#5410: a DP-bearing Digi-Egg in the battle area still confers inherited deletion effects", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "EX2-007", as: "mother", under: [{ card: "BT19-063", as: "darkknight" }] },
          { card: "BT1-084", as: "omnimon" },
        ],
        hand: [{ card: "BT5-110", as: "allDelete" }],
        trash: [{ card: "BT18-058", as: "kotemon" }],
        deck: Array(12).fill("BT1-009"),
      },
      1: { security: Array(3).fill("BT1-009"), deck: Array(12).fill("BT1-009") },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("allDelete").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("kotemon").instanceId) &&
        !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("mother").instanceId);
    expect(
      s.events.filter((e) => e.kind === "effectTriggered" && e.sourceInstanceId === s.inst("darkknight").instanceId),
    ).toHaveLength(1);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});
