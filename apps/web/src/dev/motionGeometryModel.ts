export interface MotionRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Measured poses, not a reconstructed intermediate animation. Coordinates are decoded pixels. */
export const HAND_HOVER_GEOMETRY = {
  reference: "kYBHuw7ItSg",
  sourceHash: "e5ae09d8756a68cc293a8c8dbd842a53b20e1813a7dc5d94ddbf9be4020c95d7",
  restFrame: 2071,
  focusedFrame: 2099,
  rest: { x: 357, y: 461, width: 100, height: 140 },
  focused: { x: 346.4, y: 376.2, width: 120, height: 168 },
  uncertaintyPx: 2,
  family: "hand-hover",
  release: {
    lastFocusedFrame: 2105,
    mixedFrame: 2106,
    restingFrame: 2107,
    focusedTemplateFrame: 2099,
    restingTemplateFrame: 2071,
    focusedPatch: { x: 380, y: 411, width: 60, height: 48 },
    restingPatch: { x: 385, y: 490, width: 50, height: 40 },
    observations: [
      { frame: 2104, focusedCorrelation: 0.999931, restingCorrelation: 0.017592 },
      { frame: 2105, focusedCorrelation: 0.999941, restingCorrelation: 0.01746 },
      { frame: 2106, focusedCorrelation: 0.351443, restingCorrelation: 0.960023 },
      { frame: 2107, focusedCorrelation: 0.053759, restingCorrelation: 0.969485 },
      { frame: 2108, focusedCorrelation: 0.053656, restingCorrelation: 0.969491 },
      { frame: 2109, focusedCorrelation: 0.053466, restingCorrelation: 0.969486 },
      { frame: 2110, focusedCorrelation: 0.053054, restingCorrelation: 0.969423 },
    ],
    note: "A seleção permanece marcada enquanto o hover passa para outra carta. A arte muda da pose ampliada para repouso em dois intervalos de vídeo, com imagem misturada no frame 2106. A correlação identifica essas poses; não mede uma curva intermediária nem o encerramento de uma ativação.",
  },
  note: "Duas poses aproximadas em frames de 960×540. A arte foi correlacionada entre as imagens; a parte inferior da carta sai do vídeo. Isto mede hover durante seleção, não ativação de efeito.",
} as const;

/** Video annotations identify visible beats; they do not reconstruct the projected trajectory. */
export const DRAW_VIEWER_SEQUENCE = {
  reference: HAND_HOVER_GEOMETRY.reference,
  sourceHash: HAND_HOVER_GEOMETRY.sourceHash,
  family: "draw",
  firstFrame: 1716,
  lastFrame: 1755,
  uncertaintyFrames: 1,
  markers: [
    { frame: 1720, label: "Primeiro movimento" },
    { frame: 1724, label: "Carta e clarão" },
    { frame: 1730, label: "Saída da apresentação" },
    { frame: 1732, label: "Entrada na mão" },
    { frame: 1738, label: "Carta assentada" },
  ],
  light: {
    baselineFrame: 1723,
    region: { x: 440, y: 285, width: 280, height: 160 },
    observations: [
      { frame: 1723, meanPositiveLuma: 0 },
      { frame: 1724, meanPositiveLuma: 72.62 },
      { frame: 1725, meanPositiveLuma: 155.38 },
      { frame: 1726, meanPositiveLuma: 152.96 },
      { frame: 1727, meanPositiveLuma: 133.19 },
      { frame: 1728, meanPositiveLuma: 95.3 },
      { frame: 1729, meanPositiveLuma: 30.38 },
      { frame: 1730, meanPositiveLuma: 0.06 },
    ],
    note: "Aumento de luminância em uma região do campo fora da carta, comparado ao frame 1723. O clarão ocupa seis frames; início e fim têm ±1 frame de incerteza. Isto não mede partículas individuais nem a câmera.",
  },
  pose: {
    frame: 1728,
    deckFrame: 1719,
    face: { x: 798, y: 266, width: 112, height: 157 },
    deck: { x: 868, y: 295, width: 61, height: 80 },
    uncertaintyPx: 3,
    note: "Limites aproximados em pixels decodificados: carta legível no frame 1728 e deck sem a carta no frame 1719. O deck tem perspectiva; os retângulos não reconstroem a câmera.",
  },
  note: "Marcos visuais em 40 frames consecutivos. Há sobreposição de imagens durante a chegada; estes marcos não medem a curva de movimento nem a câmera.",
} as const;

/** The top-edge clipping and displaced opaque back show the sign, not a full projected curve. */
export const DRAW_OPPONENT_SEQUENCE = {
  reference: HAND_HOVER_GEOMETRY.reference,
  sourceHash: HAND_HOVER_GEOMETRY.sourceHash,
  family: "draw",
  firstFrame: 4224,
  lastFrame: 4243,
  uncertaintyFrames: 1,
  markers: [
    { frame: 4226, label: "Primeiro movimento" },
    { frame: 4229, label: "Verso apresentado" },
    { frame: 4233, label: "Saída da apresentação" },
    { frame: 4237, label: "Entrada na mão" },
    { frame: 4242, label: "Carta assentada" },
  ],
  entry: {
    movingFrame: 4237,
    settledFrame: 4242,
    moving: { x: 540, y: 4, width: 30, height: 42 },
    settled: { x: 540, y: -17, width: 30, height: 42 },
    uncertaintyPx: 2,
    baselineFrame: 4242,
    region: { x: 542, y: 35, width: 26, height: 13 },
    observations: [
      { frame: 4233, meanAbsoluteRgb: 0 },
      { frame: 4234, meanAbsoluteRgb: 0 },
      { frame: 4235, meanAbsoluteRgb: 0 },
      { frame: 4236, meanAbsoluteRgb: 0 },
      { frame: 4237, meanAbsoluteRgb: 22.908 },
      { frame: 4238, meanAbsoluteRgb: 4.881 },
      { frame: 4239, meanAbsoluteRgb: 0.025 },
      { frame: 4240, meanAbsoluteRgb: 0.025 },
      { frame: 4241, meanAbsoluteRgb: 0 },
      { frame: 4242, meanAbsoluteRgb: 0 },
      { frame: 4243, meanAbsoluteRgb: 0 },
    ],
    note: "O verso avança para baixo da mão e retorna: cerca de 21 px numa carta de 42 px. Limites aproximados, com ±2 px, e parte da carta assentada fora do vídeo. A diferença de RGB na região abaixo da mão confirma a presença visível; não mede uma curva contínua nem partículas.",
  },
  note: "20 frames consecutivos inspecionados. A apresentação do oponente não tem clarão. O verso aparece assentado antes do deslocamento; imagens sobrepostas e a borda do vídeo limitam a medição do início e da curva.",
} as const;

export function drawOpponentSequenceForSource(source: Parameters<typeof handHoverGeometryForSource>[0]) {
  return handHoverGeometryForSource(source) ? DRAW_OPPONENT_SEQUENCE : undefined;
}

export function drawViewerSequenceForSource(source: Parameters<typeof handHoverGeometryForSource>[0]) {
  return handHoverGeometryForSource(source) ? DRAW_VIEWER_SEQUENCE : undefined;
}

export function handHoverGeometryForSource({
  id,
  sourceHash,
  frameWidth,
  frameHeight,
}: {
  id: string;
  sourceHash?: string;
  frameWidth: number;
  frameHeight: number;
}) {
  return id === HAND_HOVER_GEOMETRY.reference &&
    sourceHash === HAND_HOVER_GEOMETRY.sourceHash &&
    frameWidth === 960 &&
    frameHeight === 540
    ? HAND_HOVER_GEOMETRY
    : undefined;
}

export function relativeCardGeometry(rest: MotionRectangle, focused: MotionRectangle) {
  const scaleX = focused.width / rest.width;
  const scaleY = focused.height / rest.height;
  const deltaX = focused.x + focused.width / 2 - rest.x - rest.width / 2;
  const deltaY = focused.y + focused.height / 2 - rest.y - rest.height / 2;
  return { scaleX, scaleY, deltaX, deltaY, localLift: -deltaY / (rest.height * scaleY) };
}
