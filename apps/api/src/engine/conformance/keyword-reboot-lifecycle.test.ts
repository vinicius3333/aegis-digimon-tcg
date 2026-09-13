import { beforeEach, describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/BT1/BT1-025.js";
import "../../cards/BT4/BT4-070.js";
import "../../cards/BT5/BT5-069.js";
import "../../cards/BT19/BT19-020.js";

const fingerprint = "755d3250951980c2b8d7a31192167c2b74789570c06b57081c2e35679c45e785";

async function runRebootTurn(card: string) {
  const rebootPermanent =
    card === "BT19-020" ? { card: "BT1-025", as: "reboot", under: [{ card }] } : { card, as: "reboot" };
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { ...rebootPermanent, suspended: false },
          { card: "BT1-009", as: "plain", suspended: true },
        ],
        deck: Array(10).fill("BT1-009"),
        security: ["BT1-009", "BT1-013", "BT1-014"],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "defender", suspended: true },
          { card: "BT1-010", as: "defender2", suspended: true },
        ],
        deck: Array(10).fill("BT1-009"),
        security: ["BT1-009", "BT1-013", "BT1-014"],
      },
    },
    { autoDeclineOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  const loop = s.engine.startTurnLoop();
  let handedOff = false;
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reboot").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("reboot").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender2").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    handedOff = true;
    return { s, loop };
  } finally {
    if (!handedOff) {
      s.engine.applyIntent(1, { type: "surrender" });
      await Promise.race([loop, new Promise<void>((resolve) => setTimeout(resolve, 100))]);
    }
  }
}

describe("§16-11 Reboot lifecycle", () => {
  beforeEach(() =>
    cite(
      "comprehensive-0229",
      "§16-11 Reboot unsuspends its Digimon during the opponent's unsuspend phase",
      fingerprint,
    ),
  );

  it("unsuspends a native BT4-070 holder during the opponent's turn", async () => {
    const { s, loop } = await runRebootTurn("BT4-070");
    expect(s.perm("reboot").isSuspended).toBe(false);
    expect(s.perm("plain").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("unsuspends a native BT5-069 holder while a plain Digimon stays suspended", async () => {
    const { s, loop } = await runRebootTurn("BT5-069");
    expect(s.perm("reboot").isSuspended).toBe(false);
    expect(s.perm("plain").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("unsuspends a BT19-020 holder through its inherited Reboot keyword", async () => {
    const { s, loop } = await runRebootTurn("BT19-020");
    expect(s.perm("reboot").isSuspended).toBe(false);
    expect(s.perm("plain").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
