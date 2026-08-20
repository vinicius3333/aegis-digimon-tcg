import { describe, expect, it } from "vitest";
import { CardKind, EffectDuration, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import "./BT25-079.js";
import "../BT2/BT2-085.js";

describe("BT25-079 Hyemon", () => {
  it("matches the catalog and compiles both the All Turns lock and inherited Retaliation", () => {
    expect(getCardDefinition("BT25-079")).toMatchObject({
      nameEn: "Hyemon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beast", "BEATBREAK"],
      effectText: "[All Turns] Players can't gain memory other than by Tamer effects.",
      inheritedEffectText: "＜Retaliation＞",
    });
  });

  it("blocks both players' Digimon-effect memory gain but permits Tamer effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT25-079", as: "hyemon" }] } });
    await s.ready();
    const policy = observe(s.engine);

    expect(policy.canGainMemoryFromEffect(0, ["Digimon"])).toBe(false);
    expect(policy.canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(policy.canGainMemoryFromEffect(0, ["Tamer"])).toBe(true);
    expect(policy.canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
  });

  it("allows a Tamer's memory effect while that Tamer is also treated as a Digimon (KB Q6381)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-079", as: "hyemon" },
            { card: "BT2-085", as: "joe" },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", under: ["BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const internals = internalsOf(s.engine);
    internals.continuous.addKindGrant(
      s.perm("joe").permanentId,
      [CardKind.Digimon],
      EffectDuration.Permanent,
      { continuous: true },
    );
    expect(internals.continuous.grantedKinds(s.perm("joe").permanentId)).toContain(CardKind.Digimon);

    s.state.memory = 0;
    const sourceId = s.perm("target").stack[0]!.instanceId;
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("target").permanentId, [sourceId], 0);

    expect(s.perm("joe").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("keeps the inherited keyword attached through a legal evolution stack", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT25-080", as: "witchmon" }],
        battleArea: [{ card: "BT25-079", as: "base" }],
      },
    });
    await s.ready();
    const base = s.perm("base");
    const witchmon = s.inst("witchmon");
    await advance(s.engine).verb.digivolveFromInstance(base.permanentId, witchmon.instanceId);
    expect(s.perm("base").topCard?.cardId).toBe("BT25-080");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT25-079");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
  });
});
