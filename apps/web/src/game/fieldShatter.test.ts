// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import fracture from "./fieldFracture.json";
import { captureFieldShatterFace } from "./fieldShatter";

it("freezes a departing face and both stack orientations from one descendant style snapshot", () => {
  const board = document.createElement("div");
  board.className = "game-board";
  board.innerHTML = `<div data-permanent-id="departing" style="rotate:none;transform:none;scale:none">
    <div class="game-card-enter" style="rotate:none;transform:none;scale:none">
      <div data-state="active" style="width:100px;height:140px;box-sizing:border-box;rotate:none;transform:none;scale:none">
        <span id="chrome" tabindex="0" style="color:rgb(12,34,56);--caption:'text; with: separators'">Printed face</span>
      </div>
    </div>
  </div>`;
  document.body.append(board);
  const permanent = board.firstElementChild as HTMLElement;
  const face = permanent.querySelector<HTMLElement>("[data-state]")!;
  const label = face.querySelector("span")!;
  face.getBoundingClientRect = () => new DOMRect(10, 20, 100, 140);
  permanent.getBoundingClientRect = face.getBoundingClientRect;
  board.getBoundingClientRect = () => new DOMRect(0, 0, 800, 1000);
  const styleOf = window.getComputedStyle.bind(window);
  const style = vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const computed = styleOf(element);
    // The browser's declaration is iterable; jsdom's declaration needs this adapter.
    Object.defineProperty(computed, Symbol.iterator, {
      value: function* () {
        for (let index = 0; index < computed.length; index++) yield computed.item(index);
      },
    });
    return computed;
  });
  try {
    const captured = captureFieldShatterFace(permanent, board, true)!;
    expect(style.mock.calls.filter(([element]) => element === label)).toHaveLength(1);
    label.style.color = "red";
    for (const clone of [captured.clone!, captured.stackClone!, captured.handStackClone!]) {
      const frozen = clone.querySelector("span")!;
      expect(frozen.style.color).toBe("rgb(12, 34, 56)");
      expect(frozen.style.getPropertyValue("--caption")).toBe("'text; with: separators'");
      expect(frozen.style.animation).toBe("none");
      expect(frozen.hasAttribute("id")).toBe(false);
      expect(frozen.hasAttribute("tabindex")).toBe(false);
      expect(clone.inert).toBe(true);
    }
    expect(captured).toMatchObject({ x: 60, y: 90, width: 100, height: 140, angle: 0 });
  } finally {
    style.mockRestore();
    board.remove();
  }
});

function contains(polygon: number[][], x: number, y: number) {
  let inside = false;
  polygon.forEach(([px, py], index) => {
    const [qx, qy] = polygon[(index + 1) % polygon.length]!;
    if (py! > y !== qy! > y && x < ((qx! - px!) * (y - py!)) / (qy! - py!) + px!) inside = !inside;
  });
  return inside;
}

it("the extracted irregular mesh covers the full printed plane without gaps or overlapping faces", () => {
  expect(fracture.polygons).toHaveLength(41);
  let area = 0;
  for (const polygon of fracture.polygons) {
    let twice = 0;
    polygon.forEach(([x, y], index) => {
      const [nx, ny] = polygon[(index + 1) % polygon.length]!;
      twice += x! * ny! - nx! * y!;
    });
    area += Math.abs(twice) / 2;
  }
  expect(area).toBeCloseTo(10000, 2);
  for (let x = 0.371; x < 100; x += 1.037)
    for (let y = 0.613; y < 100; y += 1.079)
      expect(fracture.polygons.filter((polygon) => contains(polygon, x, y))).toHaveLength(1);
});
