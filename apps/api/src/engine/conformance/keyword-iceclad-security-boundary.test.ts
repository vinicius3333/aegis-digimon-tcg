import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

describe("Iceclad Security battle boundary", () => {
  it("uses DP against a Security Digimon despite the Iceclad attacker's larger stack", async () => {
    cite(
      "comprehensive-0254",
      "16-35: Iceclad count comparison excludes battles against Security Digimon",
      "01186c00073c1b8e41772a9f13647b23310df9f738f731d17b48b3d2b123e23c",
    );
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-021", as: "attacker", under: [{ card: "BT1-036", as: "source" }] }] },
      1: { security: [{ card: "BT1-084", as: "security" }], deck: ["BT1-009"] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").topCard.instanceId;
    const securityId = s.inst("security").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === attackerId));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(attackerId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(securityId);
  });
});
