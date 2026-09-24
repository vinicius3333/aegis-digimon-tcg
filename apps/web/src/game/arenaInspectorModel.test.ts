import { describe, expect, it } from "vitest";
import { separatedEffectClauses } from "./arenaInspectorModel";

describe("separatedEffectClauses", () => {
  it("breaks lines before glued timing markers and decodes entities", () => {
    expect(
      separatedEffectClauses(
        "(it becomes the attack target).[On Play] [When Digivolving] the [Machine]/[Cyborg]&#160;trait.[Your Turn] Attack.",
      ),
    ).toBe("(it becomes the attack target).\n[On Play] [When Digivolving] the [Machine]/[Cyborg] trait.\n[Your Turn] Attack.");
  });

  it("breaks lines after keywords and spaced sentences", () => {
    expect(separatedEffectClauses("＜Blocker＞ [On Play][When Digivolving] Text. [End of Opponent’s Turn] More.")).toBe(
      "＜Blocker＞\n[On Play][When Digivolving] Text.\n[End of Opponent’s Turn] More.",
    );
  });

  it("breaks lines before timing markers glued to a word", () => {
    expect(separatedEffectClauses("w/[Xros Heart] in traits[On Play] Reveal. Cost 3[Hand][Counter] Blast.")).toBe(
      "w/[Xros Heart] in traits\n[On Play] Reveal. Cost 3\n[Hand][Counter] Blast.",
    );
  });

  it("breaks lines before timing markers that follow a name marker", () => {
    expect(
      separatedEffectClauses("Digivolve: 2 from [Liollmon] or [Elecmon] [When Attacking] This Digimon may digivolve."),
    ).toBe("Digivolve: 2 from [Liollmon] or [Elecmon]\n[When Attacking] This Digimon may digivolve.");
  });
});
