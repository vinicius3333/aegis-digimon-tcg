import type { ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

const GRANTED_CLAUSE = "[End of Attack] Delete this Digimon.";

function targetEventsOf(events: readonly ServerEvent[]) {
  return events.filter((event) => event.kind === "effectTargetsSelected");
}

describe("effect target arrow for a granted effect", () => {
  it("links LadyDevimon (X Antibody) to the only opposing Digimon it picks without a prompt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-053", as: "base" }],
          hand: [{ card: "EX7-058", as: "ladyX" }],
          deck: Array(6).fill("BT1-009"),
        },
        1: { battleArea: [{ card: "BT1-009", as: "recipient" }], deck: Array(6).fill("BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    const granterId = s.perm("base").permanentId;
    const recipientId = s.perm("recipient").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: granterId,
        instanceId: s.inst("ladyX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Volée-&-Zerdrücken"),
    );

    expect([...s.perm("recipient").grantedEffectTexts]).toEqual([GRANTED_CLAUSE]);
    expect(targetEventsOf(s.events)).toEqual([
      { kind: "effectTargetsSelected", seat: 0, sourcePermanentId: granterId, targetPermanentIds: [recipientId] },
    ]);
    const triggeredIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "EX7-058",
    );
    const targetIndex = s.events.findIndex((event) => event.kind === "effectTargetsSelected");
    expect(triggeredIndex).toBeGreaterThanOrEqual(0);
    expect(targetIndex).toBeGreaterThan(triggeredIndex);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("links Witchmon to the one opposing Digimon chosen among several", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-048", as: "witchmon" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: Array(6).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          deck: Array(6).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("witchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId));

    const recipients = [s.perm("first"), s.perm("second")].filter((permanent) =>
      [...permanent.grantedEffectTexts].includes(GRANTED_CLAUSE),
    );
    expect(recipients).toHaveLength(1);
    const witchmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX6-048")!;
    expect(targetEventsOf(s.events)).toEqual([
      {
        kind: "effectTargetsSelected",
        seat: 0,
        sourcePermanentId: witchmon.permanentId,
        targetPermanentIds: [recipients[0]!.permanentId],
      },
    ]);
  });

  it("links GulusGammamon to the own Digimon chosen to gain a deletion effect", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-078", dp: 4000, as: "base" },
            { card: "BT1-024", dp: 7000, as: "recipient" },
          ],
          hand: [{ card: "BT10-094" }, { card: "RB1-030", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "opposing" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const granterId = s.perm("base").permanentId;
    const recipient = s.perm("recipient");
    preferInstanceIds.push(recipient.permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: granterId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => targetEventsOf(s.events).length > 0 || s.state.players[0]!.trash.length > 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(targetEventsOf(s.events)).toEqual([
      {
        kind: "effectTargetsSelected",
        seat: 0,
        sourcePermanentId: granterId,
        targetPermanentIds: [recipient.permanentId],
      },
    ]);
  });
});
