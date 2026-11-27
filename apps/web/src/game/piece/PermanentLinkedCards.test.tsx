// @vitest-environment jsdom
import type { CardInstance } from "@aegis/shared";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PermanentLinkedCards } from "@/game/piece/PermanentLinkedCards";

afterEach(cleanup);

it("keeps the first linked card nearest the Digimon and painted over later links", () => {
  const newestFirst = ["newest", "middle", "oldest"].map(
    (instanceId) => ({ instanceId, cardId: "BT26-086", faceUp: true }) as unknown as CardInstance,
  );
  const { container } = render(<PermanentLinkedCards linked={newestFirst} width={100} useSelectedSleeve={false} />);
  const tops = [...container.querySelectorAll<HTMLElement>(".game-permanent__link")].map((link) =>
    parseFloat(link.style.top),
  );
  expect(tops[2]).toBeLessThan(tops[1]!);
  expect(tops[1]).toBeLessThan(tops[0]!);
});
