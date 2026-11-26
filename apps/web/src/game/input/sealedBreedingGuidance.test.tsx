import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BreedingDock } from "@/game/screen/layout/BreedingDock";

vi.mock("@/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "sealed.breedingHint" ? "Choose one breeding action, or end breeding." : key),
  }),
}));
vi.mock("@/game/piece", () => ({
  Pile: () => <div data-testid="eggs" />,
  BreedingSlot: () => <div data-testid="raising" />,
}));

function renderGuidance(actionsOpen: boolean) {
  const markup = renderToStaticMarkup(
    <BreedingDock
      sealed
      eggDeckCount={0}
      breeding={undefined}
      pileWidth={44}
      compactPiles
      burst={undefined}
      effectSource={false}
      effectLinked={false}
      highlight={false}
      eggDeckRiffling={false}
      actionsOpen={actionsOpen}
      canHatchEgg={false}
      canMoveOut={false}
      slotCandidate={false}
      slotDrop={{}}
      onHatch={undefined}
      onSlotClick={undefined}
      actions={<button>Place in breeding · Gabumon</button>}
    />,
  );
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

describe("sealed breeding guidance ownership", () => {
  it("keeps the instruction before its actions in one flow-owned panel", () => {
    const document = renderGuidance(true);
    const instruction = document.querySelector('[role="status"]');
    const action = document.querySelector("button");
    expect(instruction?.textContent).toBe("Choose one breeding action, or end breeding.");
    expect(action).not.toBeNull();
    expect(action?.parentElement).toBe(instruction?.parentElement);
    expect(instruction?.nextElementSibling).toBe(action);
    const panel = document.querySelector<HTMLElement>(".game-breeding-hint");
    expect(panel?.style.display).toBe("flex");
    expect(panel?.style.flexDirection).toBe("column");
    expect(instruction?.getAttribute("style")).toContain("margin:0");
  });

  it("removes both guidance and its actions when breeding closes", () => {
    const document = renderGuidance(false);
    expect(document.querySelector(".game-breeding-hint")).toBeNull();
    expect(document.querySelector("button")).toBeNull();
  });

  it("composes sealed actions inside the real dock rather than as a field grid sibling", () => {
    const screen = readFileSync(resolve(import.meta.dirname, "../GameScreen.tsx"), "utf8");
    const start = screen.indexOf("const yourBreedingDock = (");
    const end = screen.indexOf("const tutorialLesson", start);
    const dock = screen.slice(start, end);
    expect(dock).toMatch(/<BreedingDock\s+actions=\{\s*<SealedBreedingActions/);
    expect(dock).not.toMatch(/<>\s*<SealedBreedingActions/);
  });

  it("keeps action hit testing and width bounded by the containing guidance panel", () => {
    const css = readFileSync(resolve(import.meta.dirname, "../style/fieldLayout.css"), "utf8");
    const panel = css.match(/\.sealed-breeding-actions \{([^}]*)\}/)?.[1];
    const button = css.match(/\.sealed-breeding-actions > button \{([^}]*)\}/)?.[1];
    expect(panel).toContain("z-index: 21;");
    expect(panel).toContain("pointer-events: auto;");
    expect(panel).toContain("max-width: 100%;");
    expect(button).toContain("white-space: normal;");
    expect(button).toContain("overflow-wrap: anywhere;");
  });
});
