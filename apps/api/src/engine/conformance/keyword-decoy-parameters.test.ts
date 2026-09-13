import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/EX5/EX5-050.js";
import "../../cards/BT6/BT6-059.js";
import "../../cards/ST1/ST1-16.js";

const fingerprint = "311375329fc7791aba6a16b180691e3063bce3bba790f4f92dff802e21987ca1";

async function deleteWithGaia(protectedCard: string, response: "accept" | "refuse", decoyCard = "EX5-050") {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: decoyCard, as: "decoy" },
          { card: protectedCard, as: "protected" },
        ],
      },
      1: { battleArea: [{ card: "BT1-021", as: "red" }], hand: [{ card: "ST1-16", as: "gaia" }] },
    },
    { autoSelectCards: false },
  );
  s.state.turnSeat = 1;
  s.state.memory = 10;
  await s.ready();
  const decoyId = s.perm("decoy").topCard!.instanceId;
  const protectedId = s.perm("protected").topCard!.instanceId;
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const target = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(1, {
      type: "respondDecision",
      decisionId: target.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("protected").permanentId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards" || !s.state.pendingDecision);
  if (s.state.pendingDecision) {
    const decoy = s.state.pendingDecision;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decoy.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: response === "accept" ? [s.perm("decoy").topCard!.instanceId] : [],
        },
      }),
    ).toEqual({ ok: true });
  }
  await settle(() => !s.state.pendingDecision);
  return { s, decoyId, protectedId };
}

describe("§16-18 Decoy parameter eligibility", () => {
  beforeEach(() =>
    cite("comprehensive-0236", "§16-18 Decoy deletion prevention and optional self-deletion", fingerprint),
  );

  it("protects a specified Deva through public Gaia Force and trashes the Decoy holder", async () => {
    const { s, decoyId, protectedId } = await deleteWithGaia("EX5-051", "accept");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard!.cardId).toBe("EX5-051");
    expect(s.state.players[0]!.battleArea[0]!.topCard!.instanceId).toBe(protectedId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(decoyId);
  });

  it("does not protect a non-Deva target with the printed trait parameter", async () => {
    const { s, decoyId } = await deleteWithGaia("BT1-009", "accept");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard!.cardId).toBe("EX5-050");
    expect(s.state.players[0]!.battleArea[0]!.topCard!.instanceId).toBe(decoyId);
  });

  it("leaves both cards' deletion outcomes to the refusal branch", async () => {
    const { s, decoyId, protectedId } = await deleteWithGaia("EX5-051", "refuse");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard!.cardId).toBe("EX5-050");
    expect(s.state.players[0]!.battleArea[0]!.topCard!.instanceId).toBe(decoyId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(protectedId);
  });

  it("protects a black target with BT6-059's public color parameter", async () => {
    const { s, decoyId, protectedId } = await deleteWithGaia("EX5-051", "accept", "BT6-059");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard!.cardId).toBe("EX5-051");
    expect(s.state.players[0]!.battleArea[0]!.topCard!.instanceId).toBe(protectedId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(decoyId);
  });

  it("rejects a non-black target for BT6-059 without spending the Decoy", async () => {
    const { s, decoyId } = await deleteWithGaia("BT1-009", "accept", "BT6-059");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard!.cardId).toBe("BT6-059");
    expect(s.state.players[0]!.battleArea[0]!.topCard!.instanceId).toBe(decoyId);
  });
});
