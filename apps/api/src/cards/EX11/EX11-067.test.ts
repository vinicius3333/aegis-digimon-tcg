import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-067.js";

describe("EX11-067 Dokuson Aruba", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-067")).toMatchObject({
      nameEn: "Dokuson Aruba",
      colors: ["Purple", "Yellow"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-067", as: "dokuson" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("dokuson"));
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("digivolves a battle-area Lucemon-text Digimon and triggers the Tamer memory effect (Q5935)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-067", as: "dokuson" },
            { card: "BT18-034", as: "battleLucemon" },
          ],
          hand: [{ card: "BT18-082", as: "chaosMode" }],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dokuson"));
    await settle(() => s.perm("dokuson").isSuspended);

    expect(s.perm("battleLucemon").topCard?.cardId).toBe("BT18-082");
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("digivolves a breeding-area Digimon without firing either digivolution effect (Q5933/Q5934/Q5936)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-067", as: "dokuson" }],
          breeding: { card: "BT18-034", as: "breedingLucemon" },
          hand: [{ card: "BT18-082", as: "chaosMode" }],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dokuson"));

    expect(s.perm("breedingLucemon").topCard?.cardId).toBe("BT18-082");
    expect(s.perm("dokuson").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with the field union and Q5937 text match", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "Digivolve",
        target: {
          filter: {
            or: [{ zone: "battleArea" }, { zone: "breeding" }],
            nameOrTrait: [{ tokens: ["Lucemon"], match: "text" }],
          },
        },
        from: ["hand", "trash"],
        payCost: false,
      },
    ]);
  });
});
