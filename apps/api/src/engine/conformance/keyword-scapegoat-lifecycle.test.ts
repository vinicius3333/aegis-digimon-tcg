import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

const fingerprint = "277f5623c77994bee5dbc71b1f2a4f31767ccd0ce7f44b9173f6ca5e590ff6c2";

describe("§16-32 Scapegoat lifecycle", () => {
  beforeEach(() =>
    cite(
      "comprehensive-0251",
      "16-32-1 through 16-32-3: optional deletion of one other Digimon prevents the holder's non-owner-effect deletion; once accepted, prevention is mandatory",
      fingerprint,
    ),
  );

  it("uses granted Scapegoat to sacrifice the selected ally and preserve the holder", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-057", as: "holder", suspended: true },
            { card: "BT1-010", as: "sacrifice" },
            { card: "BT1-009", as: "untouched" },
          ],
          security: [{ card: "EX8-071", as: "source", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const holderId = s.perm("holder").permanentId;
    const sacrificeId = s.inst("sacrifice").instanceId;
    expect(observe(s.engine).hasKeyword(s.perm("holder"), "Scapegoat")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: holderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === sacrificeId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === holderId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sacrificeId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("untouched").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("holder").instanceId)).toBe(false);
  });

  it("allows the controller to refuse Scapegoat, sending the holder to trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-057", as: "holder", suspended: true },
            { card: "BT1-010", as: "sacrifice" },
            { card: "BT1-009", as: "untouched" },
          ],
          security: [{ card: "EX8-071", as: "source", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const holderId = s.perm("holder").permanentId;
    const holderInstanceId = s.inst("holder").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: holderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === holderInstanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === holderInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(false);
  });

  it("uses native Scapegoat from EX11-023 to preserve the host and trash the chosen ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-023", as: "host", suspended: true },
            { card: "BT1-009", as: "sacrifice" },
            { card: "BT1-010", as: "untouched" },
          ],
        },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Scapegoat")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("host").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("untouched").permanentId)).toBe(true);
  });

  it("does not protect against its controller's own public delete-own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-023", as: "holder", suspended: true },
            { card: "BT1-009", as: "untouched" },
          ],
          hand: [{ card: "BT20-073", as: "blocker" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const holderId = s.perm("holder").permanentId;
    const holderInstanceId = s.inst("holder").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blocker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === holderInstanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === holderInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === holderId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("untouched").permanentId)).toBe(true);
  });

  it("uses Scapegoat against a public opponent Gaia Force deletion and preserves the selected holder", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-023", as: "holder" },
            { card: "BT1-009", as: "sacrifice" },
            { card: "BT1-010", as: "untouched" },
          ],
        },
        1: {
          hand: [{ card: "ST1-16", as: "gaia" }],
          battleArea: [{ card: "BT1-009", as: "opponent" }],
        },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const holderId = s.perm("holder").permanentId;
    const sacrificeId = s.inst("sacrifice").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [holderId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [sacrificeId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === sacrificeId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === holderId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("untouched").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("holder").instanceId)).toBe(false);
  });
});
