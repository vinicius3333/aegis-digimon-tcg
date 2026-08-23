import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-057.js";

describe("EX11-057 Suzune Kazuki", () => {
  it("gains memory at the start of your main phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-057", as: "suzune" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("suzune"));
    expect(s.state.memory).toBe(1);
  });

  it("asks before suspending when an opponent Digimon loses a digivolution card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-057", as: "suzune" }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenDigivolutionTrashed", {
      subjectPermanentId: s.perm("opponent").permanentId,
    });
    await settle(() => s.perm("suzune").isSuspended);

    expect(s.perm("suzune").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("leaves Suzune unsuspended and gains no memory when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-057", as: "suzune" }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenDigivolutionTrashed", {
      subjectPermanentId: s.perm("opponent").permanentId,
    });
    await settle(() => false, 30);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("suzune").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
