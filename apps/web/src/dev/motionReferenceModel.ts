export interface MotionReferenceManifest {
  version: 1;
  id: string;
  title: string;
  sourceUrl?: string;
  sourceHash?: string;
  videoFile?: "reference.mp4" | "reference.webm";
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  duration: number;
  fps: number;
  timestamps: number[];
}

/** Media timestamps, rather than rounded nominal FPS, identify decoded frames. */
export function frameAtTime(timestamps: readonly number[], seconds: number): number {
  let low = 0;
  let high = timestamps.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (timestamps[middle]! <= seconds) low = middle;
    else high = middle - 1;
  }
  return low;
}

/** ffprobe prints microseconds; browser presentation metadata may retain more precision. */
export function frameAtMediaTime(timestamps: readonly number[], seconds: number): number {
  return frameAtTime(timestamps, seconds + 0.000001);
}

export function parseMotionManifest(value: unknown): MotionReferenceManifest {
  if (!value || typeof value !== "object") throw new Error("Manifest ausente.");
  const candidate = value as MotionReferenceManifest;
  if (
    candidate.version !== 1 ||
    typeof candidate.id !== "string" ||
    !/^[\w-]+$/.test(candidate.id) ||
    (candidate.videoFile !== undefined && !["reference.mp4", "reference.webm"].includes(candidate.videoFile)) ||
    typeof candidate.title !== "string" ||
    ![
      candidate.width,
      candidate.height,
      candidate.frameWidth,
      candidate.frameHeight,
      candidate.duration,
      candidate.fps,
    ].every((number) => Number.isFinite(number) && number > 0) ||
    !Array.isArray(candidate.timestamps) ||
    candidate.timestamps.length === 0 ||
    !candidate.timestamps.every(
      (time, index, times) => Number.isFinite(time) && time >= 0 && (index === 0 || time > times[index - 1]!),
    ) ||
    candidate.timestamps.at(-1)! > candidate.duration
  )
    throw new Error("Manifest inválido: prepare novamente os frames.");
  return candidate;
}

export function frameUrl(id: string, frame: number): string {
  return `/motion-reference/${encodeURIComponent(id)}/frame-${String(frame).padStart(6, "0")}.jpg`;
}

export const REFERENCE_CLIPS = [
  {
    id: "field",
    label: "Ativação no campo",
    start: 627.8,
    end: 628.6,
    family: "effect",
    note: "O pulso amarelo nasce na origem; o texto já está na coluna esquerda. O anel verde anterior é um indicador distinto.",
  },
  {
    id: "hatch",
    label: "Nascimento: queda e brilho no slot",
    start: 24.77475,
    end: 25.558867,
    family: "hatch",
    note: "O ovo aparece diretamente na criação, cai e assenta antes de o brilho terminar. Compare os ressaltos mantendo o slot, a carta e as cores do Aegis.",
  },
  {
    id: "evolve",
    label: "Evolução na criação",
    start: 27.5,
    end: 29.5,
    family: "evolve",
    note: "Flash → carta legível → saída → brilho no destino. Compare preparação e chegada separadamente.",
  },
  {
    id: "opponent-field-landing",
    label: "Chegada ao campo: queda e cauda de luz",
    start: 45.1451,
    end: 46.379667,
    family: "play",
    note: "A carta chega ao campo perto de f2724. A queda curta termina antes da luz; o clarão branco e as faíscas dão lugar à cauda azul. Compare a escala e o deslocamento relativos à carta, preservando o tabuleiro do Aegis.",
  },
  {
    id: "draw-viewer",
    label: "Compra: apresentação e entrada na mão",
    start: 28.6286,
    end: 29.27925,
    family: "draw",
    note: "A carta aparece brevemente junto ao deck, afina e sobe enquanto sua cópia entra na mão e assenta. Compare esses momentos separadamente, usando nossos slots e tamanhos. O código descreve uma entrada de 80 ms; os quadros iniciais têm sobreposição e não medem uma curva exata.",
  },
  {
    id: "draw-opponent",
    label: "Compra do oponente: verso e entrada na mão",
    start: 70.4704,
    end: 70.787383,
    family: "draw",
    note: "O verso aparece, afina e sobe; a nova carta entra na mão por baixo. A mão fica parcialmente cortada no vídeo. Compare a direção e a amplitude relativas à carta, preservando nossos slots e tamanhos.",
  },
  {
    id: "play",
    label: "Option e anúncio",
    start: 32.5,
    end: 35.5,
    family: "play",
    note: "A carta aparece ampliada antes da cláusula; o texto permanece enquanto o resultado começa.",
  },
  {
    id: "hand-hover",
    label: "Mão: hover durante seleção",
    start: 34.2342,
    end: 35.28525,
    family: "hand",
    note: "O hover amplia a carta e desloca seu pivô; depois a seleção marca a cópia escolhida. Compare as duas poses medidas. Esta sequência não mostra ativação de efeito na mão.",
  },
  {
    id: "attack",
    label: "Declaração e efeitos de ataque",
    start: 492,
    end: 495,
    family: "attack",
    note: "Faixa de ataque e linha de alvo antecedem o resultado; prompts podem interromper a sequência.",
  },
  {
    id: "attack-confirmed",
    label: "Ataque confirmado: dois avanços da seta",
    start: 493.009183,
    end: 493.409583,
    family: "attack",
    note: "Após suspender, a seta avança duas vezes e permanece no alvo. O arrasto anterior do jogador é outro momento.",
  },
  {
    id: "security",
    label: "Segurança: quebra e revelação",
    start: 538.6,
    end: 540.6,
    family: "security",
    note: "Pulso na origem, quebra no escudo e carta revelada são momentos distintos.",
  },
  {
    id: "removal",
    label: "Exclusão no campo",
    start: 632.7,
    end: 634,
    family: "removal",
    note: "Clarão no local da carta excluída; o aviso identifica a carta enquanto o brilho termina.",
  },
  {
    id: "security-reveal",
    label: "Segurança: carta branca, curva e clarão",
    start: 539.055183,
    end: 539.405533,
    family: "security",
    note: "A carta do oponente vem de cima, faz o arco lateral e revela a arte antes dos raios azuis. Compare o movimento preservando a composição do Aegis.",
  },
  {
    id: "security-dock",
    label: "Segurança: chegada à área de efeito",
    start: 539.422217,
    end: 539.622417,
    family: "security",
    note: "Depois do clarão, a carta já revelada se desloca diretamente ao slot de efeito. Compare a continuidade e o tempo, mantendo o dock e os tamanhos do Aegis.",
  },
  {
    id: "security-dock-close",
    label: "Segurança: fechamento da área de efeito",
    start: 543.109233,
    end: 543.309433,
    family: "security",
    note: "O slot retira a carta ao terminar de resolver seu efeito. Compare os últimos frames legíveis e o desaparecimento, mantendo o tempo de leitura das nossas cláusulas.",
  },
  {
    id: "combat-impact",
    label: "Combate: tremida, garra e pausa",
    start: 657.790467,
    end: 658.174183,
    family: "combat",
    note: "A carta atingida treme e perde força enquanto a garra avança de forma independente. Compare os dois movimentos e a pausa final, preservando o desenho das cartas e dos efeitos do Aegis.",
  },
  {
    id: "security-card-exit",
    label: "Segurança: golpe e saída da carta",
    start: 657.940617,
    end: 658.424433,
    family: "security",
    note: "Depois do golpe e da pausa de impacto, a carta revelada afina, alonga e sobe. Compare essa saída mantendo as posições e os tamanhos do Aegis.",
  },
] as const;
