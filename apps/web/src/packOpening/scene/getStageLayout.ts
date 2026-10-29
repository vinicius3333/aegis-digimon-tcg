import { CARD_DIMENSIONS } from "@/packOpening/scene/cardDimensions";

type Vector = [number, number, number];

type Params = {
  aspect: number;
  cardCount: number;
};

export interface CarouselLayout {
  center: Vector;
  radiusX: number;
  radiusZ: number;
}

export interface StageLayout {
  carousel: CarouselLayout;
  packScale: number;
  chargePosition: Vector;
  cardSlots: Vector[];
  cardScale: number;
  focusPosition: Vector;
  focusScale: number;
  stackPosition: Vector;
  cameraPosition: Vector;
  cameraTarget: Vector;
}

const FIELD_OF_VIEW_HALF_TANGENT = Math.tan((40 / 2) * (Math.PI / 180));
const MINIMUM_VISIBLE_HEIGHT = 5.2;
const WIDE_CARD_SCALE = 0.72;
const NARROW_CARD_SCALE = 0.7;

type GridParams = {
  cardCount: number;
  columns: number;
  spacingX: number;
  spacingY: number;
  centerY: number;
  depth: number;
};

function buildGrid({ cardCount, columns, spacingX, spacingY, centerY, depth }: GridParams): Vector[] {
  const rows = Math.ceil(cardCount / columns);
  return Array.from({ length: cardCount }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = (column - (columns - 1) / 2) * spacingX;
    const y = centerY + ((rows - 1) / 2 - row) * spacingY;
    return [x, y, depth];
  });
}

type DistanceParams = {
  aspect: number;
  visibleWidth: number;
};

function getCameraDistance({ aspect, visibleWidth }: DistanceParams): number {
  const fitWidth = visibleWidth / 2 / (FIELD_OF_VIEW_HALF_TANGENT * aspect);
  const fitHeight = MINIMUM_VISIBLE_HEIGHT / 2 / FIELD_OF_VIEW_HALF_TANGENT;
  return Math.max(fitWidth, fitHeight);
}

export function getStageLayout({ aspect, cardCount }: Params): StageLayout {
  if (aspect >= 1) {
    const distance = getCameraDistance({ aspect, visibleWidth: 7.4 });
    return {
      carousel: { center: [0, 1.45, 0.2], radiusX: 2.9, radiusZ: 1.5 },
      packScale: 1,
      chargePosition: [0, 1.65, 2.7],
      cardSlots: buildGrid({
        cardCount,
        columns: 6,
        spacingX: 0.86,
        spacingY: CARD_DIMENSIONS.height * WIDE_CARD_SCALE + 0.13,
        centerY: 1.55,
        depth: 1.5,
      }),
      cardScale: WIDE_CARD_SCALE,
      focusPosition: [0, 1.85, 3.4],
      focusScale: 1.1,
      stackPosition: [-2.45, 0.04, 1.7],
      cameraPosition: [0, 2.1, distance + 0.6],
      cameraTarget: [0, 1.4, 0],
    };
  }
  const distance = getCameraDistance({ aspect, visibleWidth: 3.9 });
  return {
    carousel: { center: [0, 1.95, 0.2], radiusX: 1.5, radiusZ: 1.2 },
    packScale: 0.86,
    chargePosition: [0, 1.75, 2.6],
    cardSlots: buildGrid({
      cardCount,
      columns: 4,
      spacingX: 0.8,
      spacingY: CARD_DIMENSIONS.height * NARROW_CARD_SCALE + 0.06,
      centerY: 1.85,
      depth: 1.2,
    }),
    cardScale: NARROW_CARD_SCALE,
    focusPosition: [0, 2.15, 3.6],
    focusScale: 1,
    stackPosition: [-1.05, 0.04, 1.5],
    cameraPosition: [0, 2.2, distance + 0.6],
    cameraTarget: [0, 1.6, 0],
  };
}
