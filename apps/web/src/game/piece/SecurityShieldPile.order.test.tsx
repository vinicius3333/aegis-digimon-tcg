// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { SecurityCardView } from "@aegis/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Side } from "../side";
import { SecurityShieldPile } from "./SecurityShieldPile";
// CSS imports are disabled by Vitest. A Node URL also bypasses Vite's browser
// asset-URL rewrite, so the test uses the same stylesheet as the real browser.
const securityCss = readFileSync(new NodeURL("../style/arenaPortraitSizes.css", import.meta.url), "utf8");

let stylesheet: HTMLStyleElement;
beforeEach(() => {
  stylesheet = document.createElement("style");
  stylesheet.textContent = securityCss;
  document.head.append(stylesheet);
});
afterEach(() => {
  cleanup();
  stylesheet.remove();
});

function securityCard(cardId: string, faceUp: boolean) {
  const card = new SecurityCardView();
  card.cardId = cardId;
  card.instanceId = `public-${cardId}`;
  card.faceUp = faceUp;
  return card;
}

// Equal z-index siblings paint in DOM order, so the later card covers the earlier
// card in the desktop/portrait overlapping fans. Assert effective paint order,
// rather than prescribing particular z-index values or changing the source order.
function frontToBack(slots: HTMLElement[]) {
  return [...slots].sort((a, b) => {
    const depth = (slot: HTMLElement) => Number(getComputedStyle(slot).zIndex) || 0;
    return depth(b) - depth(a) || slots.indexOf(b) - slots.indexOf(a);
  });
}

describe("GitHub #5299 security fan order", () => {
  // Canonical IR sweep: these 33 cards reach face-up bottom placement. The
  // shared presentation fix must cover Digimon, Tamers, and Options alike.
  for (const cardId of [
    "BT19-053",
    "BT19-084",
    "BT21-095",
    "BT22-100",
    "BT23-015",
    "BT23-034",
    "BT23-086",
    "BT24-090",
    "BT24-094",
    "BT25-039",
    "BT25-094",
    "BT25-095",
    "BT25-097",
    "BT25-099",
    "BT25-102",
    "EX10-012",
    "EX10-020",
    "EX10-035",
    "EX10-057",
    "EX11-025",
    "EX11-030",
    "EX11-063",
    "EX12-069",
    "EX12-072",
    "EX12-074",
    "EX8-068",
    "EX8-069",
    "EX8-071",
    "EX9-072",
    "ST21-15",
    "ST22-10",
    "BT26-082",
    "BT26-100",
  ]) {
    it(`keeps face-up bottom ${cardId} beneath the hidden top`, () => {
      const { container } = render(
        <SecurityShieldPile
          count={2}
          label="Security"
          shield={Side.Viewer}
          securityCards={[securityCard("BT1-010", false), securityCard(cardId, true)]}
        />,
      );
      const slots = Array.from(container.querySelectorAll<HTMLElement>(".game-security-cards > i"));
      expect(slots[1]!.querySelector("img")?.getAttribute("src")).toContain(cardId);
      expect(container.querySelector('img[src*="BT1-010"]')).toBeNull();
      expect(frontToBack(slots)).toEqual(slots);
    });
  }

  it("keeps face-up top Island of Adventure above face-up bottom Gennai’s House", () => {
    const { container } = render(
      <SecurityShieldPile
        count={2}
        label="Security"
        shield={Side.Opponent}
        securityCards={[securityCard("ST20-15", true), securityCard("ST21-15", true)]}
      />,
    );
    const slots = Array.from(container.querySelectorAll<HTMLElement>(".game-security-cards > i"));
    expect(slots[0]!.querySelector("img")?.getAttribute("src")).toContain("ST20-15");
    expect(slots[1]!.querySelector("img")?.getAttribute("src")).toContain("ST21-15");
    expect(frontToBack(slots)).toEqual(slots);
  });

  for (const shield of [Side.Viewer, Side.Opponent]) {
    for (const topFaceUp of [false, true]) {
      it(`${shield}: paints the top ${topFaceUp ? "face-up" : "hidden"} card over face-up bottom Ravemon`, () => {
        const cards = [
          securityCard("BT26-089", topFaceUp),
          securityCard("BT1-010", false),
          securityCard("BT26-082", true),
        ];
        const { container } = render(
          <SecurityShieldPile count={3} label="Security" shield={shield} securityCards={cards} />,
        );
        const slots = Array.from(container.querySelectorAll<HTMLElement>(".game-security-cards > i"));
        expect(slots).toHaveLength(3);
        expect(slots[2]!.querySelector("img")?.alt).toBe("Ravemon");
        expect(slots[0]!.querySelector("img")?.alt).toBe(topFaceUp ? "Kyo Sawashiro" : "");
        expect(container.querySelector('img[src*="BT1-010"]')).toBeNull();
        expect(container.querySelector('img[src*="BT26-089"]') !== null).toBe(topFaceUp);
        expect(frontToBack(slots)).toEqual(slots);
      });
    }
  }

  it("keeps a bottom face-up identity at the bottom when security changes in place", () => {
    const cards = [securityCard("BT1-010", false), securityCard("BT26-082", true)];
    const view = () => (
      <SecurityShieldPile count={cards.length} label="Security" shield={Side.Viewer} securityCards={cards} />
    );
    const { container, rerender } = render(view());
    cards.unshift(securityCard("BT26-089", true));
    rerender(view());
    const slots = Array.from(container.querySelectorAll<HTMLElement>(".game-security-cards > i"));
    expect(slots.at(-1)!.querySelector("img")?.alt).toBe("Ravemon");
    expect(frontToBack(slots)).toEqual(slots);
    expect(container.querySelector('img[src*="BT1-010"]')).toBeNull();
  });

  it("retains the bounded anonymous stack and an empty direct-attack target", () => {
    const { container, rerender } = render(<SecurityShieldPile count={12} label="Security" shield={Side.Viewer} />);
    expect(container.querySelectorAll(".game-security-cards > i")).toHaveLength(10);
    expect(container.querySelector('img[src^="/assets/card-images/"]')).toBeNull();
    rerender(<SecurityShieldPile count={0} label="Security" shield={Side.Viewer} />);
    expect(container.querySelectorAll(".game-security-cards > i")).toHaveLength(0);
    expect(container.querySelector(".game-security-shield")?.getAttribute("aria-label")).toBe("Security · 0");
  });

  it("contains card depth within the fan so cards cannot paint over the count and cues", () => {
    const { container } = render(<SecurityShieldPile count={2} label="Security" shield={Side.Viewer} />);
    const fan = container.querySelector<HTMLElement>(".game-security-cards")!;
    expect(getComputedStyle(fan).isolation).toBe("isolate");
  });
});
