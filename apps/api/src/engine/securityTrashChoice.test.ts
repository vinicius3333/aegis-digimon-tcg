import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "./testkit/harness.js";
import "../cards/index.js";

// BT15-003 (Nyaromon) inherited [When Attacking] [Once Per Turn]:
// "By trashing the top OR bottom card of your security stack, gain 1 memory."
// The end is a CONTROLLER CHOICE — the engine must prompt top/bottom.
describe("BT15-003 security-trash cost offers a top/bottom choice", () => {
  const HOST_PERM = { card: "BT1-009", dp: 6000, as: "host", under: ["BT15-003"] };

  function boardWithSecurity() {
    return {
      0: {
        battleArea: [HOST_PERM],
        // Distinct top/bottom security cards so we can tell which end was trashed.
        security: [{ card: "BT1-010", as: "secTop" }, { card: "BT1-020", as: "secBottom" }],
      },
      1: { security: ["BT1-009"] },
    };
  }

  function boardWithoutSecurity() {
    return {
      0: { battleArea: [HOST_PERM] }, // p0 security intentionally omitted (empty).
      1: { security: ["BT1-009"] },
    };
  }

  /**
   * Fire the attack, then manually answer the top/bottom `chooseOption` prompt with
   * `chooseIndex` — `setupEngine`'s auto-response opts only pick option 0, so a specific
   * index is answered directly through the Test Seam's exposed `engine`/`decisions`.
   */
  async function attackAndChoose(
    s: EngineSetup,
    chooseIndex: 0 | 1,
  ): Promise<{ chooseOptionSeen: boolean; choices: string[] | undefined }> {
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    });

    await settle(() => s.decisions.some((d) => d.req.kind === "chooseOption"));
    const chooseReq = s.decisions.find((d) => d.req.kind === "chooseOption");
    if (chooseReq !== undefined) {
      s.engine.applyIntent(chooseReq.seat, {
        type: "respondDecision",
        decisionId: chooseReq.req.decisionId,
        response: { kind: "chooseOption", optionIndex: chooseIndex },
      });
    }
    await settle(() => false, 300); // flush any trailing continuation

    return {
      chooseOptionSeen: chooseReq !== undefined,
      choices: chooseReq?.req.options?.choices,
    };
  }

  it("prompts top/bottom and trashes the TOP card when top is chosen", async () => {
    const s = setupEngine(boardWithSecurity(), { autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const topId = s.inst("secTop").instanceId;
    s.state.memory = 3;
    const memoryBefore = s.state.memory;

    const r = await attackAndChoose(s, 0);

    expect(r.chooseOptionSeen).toBe(true);
    expect(r.choices).toEqual(["top", "bottom"]);
    expect(p0.trash[0]?.instanceId).toBe(topId);
    expect(s.state.memory - memoryBefore).toBe(1);
    expect(p0.security.length).toBe(1);
  });

  it("prompts top/bottom and trashes the BOTTOM card when bottom is chosen", async () => {
    const s = setupEngine(boardWithSecurity(), { autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const bottomId = s.inst("secBottom").instanceId;
    s.state.memory = 3;
    const memoryBefore = s.state.memory;

    const r = await attackAndChoose(s, 1);

    expect(r.chooseOptionSeen).toBe(true);
    expect(p0.trash[0]?.instanceId).toBe(bottomId);
    expect(s.state.memory - memoryBefore).toBe(1);
    expect(p0.security.length).toBe(1);
  });

  // With an empty security stack the cost is unpayable, so the effect must NOT prompt at all
  // (no "you may…" optional, no top/bottom choice) and gain no memory.
  it("does not prompt when the security stack is empty", async () => {
    const s = setupEngine(boardWithoutSecurity(), { autoAcceptOptional: true, autoChooseOption: true });
    s.state.memory = 3;

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    });
    await settle(() => false, 300);

    expect(s.decisions.length).toBe(0);
    expect(s.state.memory).toBe(3);
  });
});
