import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-023.js";

describe("BT13-023 Jellymon", () => {
  it("registers Evade and trashes the opponent's bottom evolution card", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Evade" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
          amount: 1,
          fromTop: false,
        },
      ],
    });
  });

  it("trashes the bottom card of an opponent's evolution stack through the inherited attack trigger", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-023"] }] },
      1: {
        battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-009", "BT1-010"] }],
        security: [{ card: "BT1-001" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT13-023"]);
  });

  it("uses Evade to suspend Jellymon and prevent an effect deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-023", as: "jellymon" }] } });
    const jellymonId = s.perm("jellymon").permanentId;
    await s.ready();

    const deletion = advance(s.engine).verb.deletePermanent([jellymonId], "byEffect");
    await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: jellymonId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);

    expect(s.state.players[0]!.battleArea).toContain(s.perm("jellymon"));
    expect(s.perm("jellymon").isSuspended).toBe(true);
    expect(s.events).toContainEqual({ kind: "evadeResolved", permanentId: jellymonId, accepted: true });
  });
});
