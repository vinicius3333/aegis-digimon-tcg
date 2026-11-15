import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { PackCard } from "@aegis/shared/packOpening/PackCard";
import type { PackOpeningSource } from "@/packOpening/PackOpeningSource";
import { CardDetailDrawer } from "@/screens/CardDetailDrawer";
import { PackOpeningResults } from "@/packOpening/PackOpeningResults";
import { getNextBatchFrame } from "@/packOpening/getNextBatchFrame";
import { PackOpeningProgress } from "@/packOpening/PackOpeningProgress";
import { listPackAlternateArts } from "@aegis/shared/packOpening/listPackAlternateArts";
import { getPackCardRarity } from "@aegis/shared/packOpening/getPackCardRarity";
import { getPackCardKey } from "@/packOpening/getPackCardKey";
import { Button, IconButton } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useFullscreen } from "@/game/screen/hooks/useFullscreen";
import { motionPreference } from "@/design/motion/motionPreference";
import { createCarouselState } from "@/packOpening/carousel/createCarouselState";
import { getAngleForPack } from "@/packOpening/carousel/getAngleForPack";
import { getCarouselStep } from "@/packOpening/carousel/getCarouselStep";
import { getFrontPackIndex } from "@/packOpening/carousel/getFrontPackIndex";
import { findPackRarity } from "@aegis/shared/packOpening/findPackRarity";
import { PackOpeningPhase } from "@/packOpening/PackOpeningPhase";
import { createLazyComponent } from "@/net/createLazyComponent";
import { useTranslation } from "@/i18n/useTranslation";
import "@/packOpening/packOpening.css";

const PackOpeningScene = createLazyComponent({
  load: () => import("@/packOpening/scene/PackOpeningScene"),
  pick: (module) => module.PackOpeningScene,
});

const PACK_COUNT = 8;
const INTRO_SPIN_SPEED = 13;
const TAP_TOLERANCE_PIXELS = 8;
const SETTLED_SPEED = 1.5;

interface DragTrack {
  pointerId: number;
  lastX: number;
  lastTime: number;
}

function isControl(target: EventTarget): boolean {
  return target instanceof Element && target.closest("button, select, label, a") !== null;
}

type PackOpeningParams = {
  source: PackOpeningSource;
  onBack?: () => void;
  backLabel?: string;
};

export function PackOpeningEngine({ source, onBack, backLabel }: PackOpeningParams) {
  const { t } = useTranslation();
  const { progress, saveFailed, drawPacks, startBox, startNextBox, sets, totalPacks, allocation } = source;
  const restored = source.presentation;
  const carouselPackCount = allocation ? totalPacks : PACK_COUNT;
  const opening = useRef(false);
  const fullscreen = useFullscreen();
  const [immersive, setImmersive] = useState(false);
  const wasFullscreen = useRef(false);
  const [skipAnimations, setSkipAnimations] = useState(false);
  const [foilEnabled, setFoilEnabled] = useState(true);
  const [setId, setSetId] = useState(() => source.initialSetId);
  const [phase, setPhase] = useState<PackOpeningPhase>(restored?.phase ?? PackOpeningPhase.INTRO.value);
  const [selectedPack, setSelectedPack] = useState<number | undefined>(restored?.selectedPack);
  const [inspectedIndex, setInspectedIndex] = useState<number | undefined>();
  const [cards, setCards] = useState<PackCard[]>(restored?.cards ?? []);
  const [revealedCount, setRevealedCount] = useState(restored?.revealedCount ?? 0);
  const [bulkOpenedCount, setBulkOpenedCount] = useState(restored?.bulkOpenedCount ?? 0);
  const [batch, setBatch] = useState<PackCard[][]>(restored?.batch ?? []);
  const [batchIndex, setBatchIndex] = useState(restored?.batchIndex ?? 0);
  const [summaryPage, setSummaryPage] = useState(restored?.summaryPage ?? 0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const carousel = useRef(createCarouselState());
  const drag = useRef<DragTrack | undefined>(undefined);
  const reducedMotion = motionPreference.useReduced();
  const boosterSet = sets.find((set) => set.setId === setId) ?? sets[0];
  const setProgress = progress.activeBox?.setId === setId ? progress.activeBox : undefined;
  const remainingPacks = source.remainingPacks ?? totalPacks - (setProgress?.packs.length ?? 0);
  const availableCards = useMemo(() => {
    if (allocation) {
      return (source.completedAllocation ?? allocation).flat();
    }
    if (!boosterSet) {
      return [];
    }
    return [
      ...boosterSet.cards.map((card) => ({ ...card, rarity: getPackCardRarity({ card, setId }) })),
      ...listPackAlternateArts({ cards: boosterSet.cards, setId }),
    ];
  }, [allocation, source.completedAllocation, boosterSet, setId]);
  useEffect(() => {
    source.savePresentation?.({
      phase,
      selectedPack,
      cards,
      revealedCount,
      bulkOpenedCount,
      batch,
      batchIndex,
      summaryPage,
    });
  }, [
    source.savePresentation,
    phase,
    selectedPack,
    cards,
    revealedCount,
    bulkOpenedCount,
    batch,
    batchIndex,
    summaryPage,
  ]);
  const choosing = phase === PackOpeningPhase.CHOOSING.value;
  const boxEmpty = remainingPacks === 0 && (choosing || phase === PackOpeningPhase.INTRO.value);

  const spinIn = useCallback(() => {
    const state = carousel.current;
    state.target = undefined;
    state.velocity = reducedMotion || skipAnimations ? 0 : INTRO_SPIN_SPEED;
  }, [reducedMotion, skipAnimations]);

  useEffect(spinIn, [spinIn]);

  const restart = useCallback(() => {
    setBatch([]);
    setBatchIndex(0);
    setSummaryPage(0);
    setBulkOpenedCount(0);
    setInspectedIndex(undefined);
    opening.current = false;
    setPhase(skipAnimations ? PackOpeningPhase.CHOOSING.value : PackOpeningPhase.INTRO.value);
    setSelectedPack(undefined);
    setCards([]);
    setRevealedCount(0);
    spinIn();
  }, [spinIn, skipAnimations]);

  const drawPack = useCallback(
    (index: number) => {
      if (!boosterSet || remainingPacks === 0) {
        return;
      }
      const [drawn] = drawPacks({ setId, count: 1 });
      if (!drawn) {
        return;
      }
      opening.current = true;
      const state = carousel.current;
      state.target = getAngleForPack({ angle: state.angle, index, count: carouselPackCount });
      setSelectedPack(index);
      setCards(drawn);
      setRevealedCount(skipAnimations ? drawn.length : 0);
      setPhase(skipAnimations ? PackOpeningPhase.SUMMARY.value : PackOpeningPhase.CHARGING.value);
      if (skipAnimations) {
        source.completeOpening?.();
      }
    },
    [boosterSet, remainingPacks, drawPacks, setId, skipAnimations, carouselPackCount, source.completeOpening],
  );

  const openPack = useCallback(
    (index: number) => {
      if (opening.current || phase !== PackOpeningPhase.CHOOSING.value) {
        return;
      }
      drawPack(index);
    },
    [drawPack, phase],
  );

  function openAnotherPack() {
    if (phase !== PackOpeningPhase.SUMMARY.value) {
      return;
    }
    setBatch([]);
    setBatchIndex(0);
    setSummaryPage(0);
    setBulkOpenedCount(0);
    setInspectedIndex(undefined);
    carousel.current.velocity = 0;
    drawPack(getFrontPackIndex({ angle: carousel.current.angle, count: carouselPackCount }));
  }

  const openFrontPack = useCallback(() => {
    openPack(getFrontPackIndex({ angle: carousel.current.angle, count: carouselPackCount }));
  }, [openPack, carouselPackCount]);

  const rotateBy = useCallback(
    (steps: number) => {
      const state = carousel.current;
      const step = getCarouselStep(carouselPackCount);
      const resting = state.target ?? Math.round(state.angle / step) * step;
      state.target = resting + steps * step;
    },
    [carouselPackCount],
  );

  function spinRoulette() {
    const state = carousel.current;
    const direction = Math.random() < 0.5 ? -1 : 1;
    state.target = undefined;
    state.velocity = direction * (9 + Math.random() * 6);
  }

  function activatePack(index: number) {
    const state = carousel.current;
    if (!choosing || state.dragDistance > TAP_TOLERANCE_PIXELS) {
      return;
    }
    const front = getFrontPackIndex({ angle: state.angle, count: carouselPackCount });
    if (index === front && Math.abs(state.velocity) < SETTLED_SPEED) {
      openPack(index);
      return;
    }
    state.target = getAngleForPack({ angle: state.angle, index, count: carouselPackCount });
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (!choosing || isControl(event.target)) {
      return;
    }
    drag.current = { pointerId: event.pointerId, lastX: event.clientX, lastTime: event.timeStamp };
    const state = carousel.current;
    state.dragging = true;
    state.dragDistance = 0;
    state.target = undefined;
    state.velocity = 0;
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const track = drag.current;
    if (!track || track.pointerId !== event.pointerId) {
      return;
    }
    const state = carousel.current;
    const deltaX = event.clientX - track.lastX;
    const deltaTime = Math.max(1, event.timeStamp - track.lastTime) / 1000;
    const deltaAngle = (deltaX / Math.max(320, event.currentTarget.clientWidth)) * Math.PI * 1.6;
    state.angle += deltaAngle;
    state.velocity = state.velocity * 0.6 + (deltaAngle / deltaTime) * 0.4;
    state.dragDistance += Math.abs(deltaX);
    drag.current = { ...track, lastX: event.clientX, lastTime: event.timeStamp };
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    if (drag.current?.pointerId !== event.pointerId) {
      return;
    }
    drag.current = undefined;
    carousel.current.dragging = false;
  }

  const completePhase = useCallback(
    (next: PackOpeningPhase) => {
      if (next === PackOpeningPhase.REVEALING.value && batch.length > 0) {
        const frame = getNextBatchFrame({ packs: batch, index: batchIndex });
        source.completeOpening?.(batch.length - frame.index);
        setInspectedIndex(undefined);
        setBatchIndex(frame.index);
        setCards(frame.cards);
        if (frame.complete) {
          setBatch([]);
          setSummaryPage(0);
          setRevealedCount(frame.cards.length);
          setPhase(PackOpeningPhase.SUMMARY.value);
        } else {
          setRevealedCount(0);
          setPhase(PackOpeningPhase.CHARGING.value);
        }
        return;
      }
      setPhase(next);
      if (next === PackOpeningPhase.REVEALING.value) {
        setRevealedCount(1);
      }
    },
    [batch, batchIndex, source.completeOpening],
  );

  const revealNext = useCallback(() => {
    setInspectedIndex(undefined);
    if (phase !== PackOpeningPhase.REVEALING.value) {
      return;
    }
    if (revealedCount >= cards.length) {
      source.completeOpening?.();
      setPhase(PackOpeningPhase.SUMMARY.value);
      return;
    }
    setRevealedCount(revealedCount + 1);
  }, [phase, revealedCount, cards.length, source.completeOpening]);

  function openRemainingPacks() {
    if (
      !boosterSet ||
      (!choosing && phase !== PackOpeningPhase.INTRO.value && phase !== PackOpeningPhase.SUMMARY.value) ||
      remainingPacks < 1
    ) {
      return;
    }
    const drawn = drawPacks({ setId, count: remainingPacks });
    if (drawn.length === 0) {
      return;
    }
    opening.current = true;
    setInspectedIndex(undefined);
    setBulkOpenedCount(drawn.length);
    setBatchIndex(0);
    setSummaryPage(0);
    const frontIndex = getFrontPackIndex({ angle: carousel.current.angle, count: carouselPackCount });
    carousel.current.velocity = 0;
    carousel.current.target = getAngleForPack({
      angle: carousel.current.angle,
      index: frontIndex,
      count: carouselPackCount,
    });
    setSelectedPack(frontIndex);
    if (skipAnimations || reducedMotion) {
      source.completeOpening?.();
      const allCards = drawn.flat();
      setBatch([]);
      setCards(allCards);
      setRevealedCount(allCards.length);
      setPhase(PackOpeningPhase.SUMMARY.value);
    } else {
      setBatch(drawn);
      setCards(drawn[0] ?? []);
      setRevealedCount(0);
      setPhase(PackOpeningPhase.CHARGING.value);
    }
  }

  function revealAll() {
    source.completeOpening?.();
    setInspectedIndex(undefined);
    const allCards = batch.length > 0 ? batch.flat() : cards;
    setBatch([]);
    setSummaryPage(0);
    setCards(allCards);
    setRevealedCount(allCards.length);
    setPhase(PackOpeningPhase.SUMMARY.value);
  }

  function inspectCard(index: number) {
    setSummaryPage(Math.floor(index / (allocation?.[0]?.length || 12)));
    setInspectedIndex(index);
    stage.current?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  }

  useEffect(() => {
    if (wasFullscreen.current && !fullscreen.active) {
      setImmersive(false);
    }
    wasFullscreen.current = fullscreen.active;
  }, [fullscreen.active]);

  function toggleImmersive() {
    const entering = !immersive;
    setImmersive(entering);
    if (fullscreen.supported && entering !== fullscreen.active) {
      fullscreen.toggle();
    }
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && inspectedIndex !== undefined) {
        setInspectedIndex(undefined);
        return;
      }
      if (event.key === "Escape" && immersive) {
        setImmersive(false);
        return;
      }
      if (
        inspectedIndex !== undefined ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLAnchorElement ||
        (event.target instanceof Element && event.target.closest("summary") !== null)
      ) {
        return;
      }
      if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLSelectElement) {
        return;
      }
      const confirm = event.key === " " || event.key === "Enter";
      if (phase === PackOpeningPhase.CHOOSING.value && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        rotateBy(event.key === "ArrowLeft" ? 1 : -1);
      } else if (phase === PackOpeningPhase.CHOOSING.value && confirm) {
        event.preventDefault();
        openFrontPack();
      } else if (phase === PackOpeningPhase.REVEALING.value && (confirm || event.key === "ArrowRight")) {
        event.preventDefault();
        revealNext();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, revealNext, rotateBy, openFrontPack, inspectedIndex, immersive]);

  const pageSize = allocation?.[0]?.length || 12;
  const summaryOffset = phase === PackOpeningPhase.SUMMARY.value ? summaryPage * pageSize : 0;
  const sceneCards = useMemo(
    () => (phase === PackOpeningPhase.SUMMARY.value ? cards.slice(summaryOffset, summaryOffset + pageSize) : cards),
    [phase, cards, summaryOffset, pageSize],
  );
  const focusedCard = phase === PackOpeningPhase.REVEALING.value ? cards[revealedCount - 1] : undefined;
  const focusedRarity = findPackRarity(focusedCard?.rarity);
  const detailCard = cards[inspectedIndex ?? Math.max(0, revealedCount - 1)];

  if (!boosterSet) {
    return <main className="pack-opening pack-opening--empty">No booster sets are available.</main>;
  }

  return (
    <div className="pack-opening-page">
      <div className="pack-opening-page__heading">
        <div>
          <span className="aegis-eyebrow">{allocation ? t("sealed.open") : "Booster lab"}</span>
          <h1>Pack opening</h1>
          {allocation ? null : <p>Pick a set. Find your next favorite card.</p>}
        </div>
        {onBack ? (
          <Button variant="ghost" size="sm" icon={Icons.ArrowLeft} sound={false} onClick={onBack}>
            {backLabel ?? t("redesign.collection.booster.back")}
          </Button>
        ) : null}
      </div>
      <main
        ref={stage}
        className="pack-opening"
        data-phase={phase}
        data-dragging={choosing || undefined}
        data-inspecting={inspectedIndex !== undefined || undefined}
        data-immersive={immersive || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <Suspense
          fallback={
            <p className="pack-opening__loading" role="status">
              Loading booster scene…
            </p>
          }
        >
          <PackOpeningScene
            setId={boosterSet.setId}
            coverUrl={boosterSet.coverUrl}
            playbackRate={batch.length > 0 ? 4 : 1}
            cards={sceneCards}
            phase={phase}
            packCount={carouselPackCount}
            showPacks={!boxEmpty}
            carousel={carousel}
            selectedPack={selectedPack}
            revealedCount={Math.min(revealedCount, sceneCards.length)}
            reducedMotion={reducedMotion || skipAnimations}
            foilEnabled={foilEnabled}
            onPhaseComplete={completePhase}
            onActivatePack={activatePack}
            onRevealNext={revealNext}
            inspectedIndex={inspectedIndex === undefined ? undefined : inspectedIndex - summaryOffset}
            onInspectCard={(index) =>
              setInspectedIndex((current) => (current === index + summaryOffset ? undefined : index + summaryOffset))
            }
            onClearInspection={() => setInspectedIndex(undefined)}
          />
        </Suspense>

        {inspectedIndex !== undefined ? (
          <button type="button" className="pack-opening__zoom-back" onClick={() => setInspectedIndex(undefined)}>
            ← Back to cards
          </button>
        ) : null}
        {inspectedIndex !== undefined ? (
          <p className="pack-opening__zoom-hint" aria-hidden="true">
            <span className="pack-opening__zoom-hint-mouse">Drag to turn the card · Scroll to zoom</span>
            <span className="pack-opening__zoom-hint-touch">Drag to turn · Pinch to zoom and move</span>
          </p>
        ) : null}
        <header className="pack-opening__top" hidden={inspectedIndex !== undefined}>
          <div className="pack-opening__title">
            <span>Digimon card game</span>
            <h2>
              {boosterSet.setId} <span>Booster pack</span>
            </h2>
          </div>
          <div className="pack-opening__settings">
            <div className="pack-opening__toggles">
              <label className="pack-opening__skip">
                <input
                  type="checkbox"
                  checked={skipAnimations}
                  onChange={(event) => {
                    setSkipAnimations(event.target.checked);
                    if (event.target.checked && batch.length > 0) {
                      revealAll();
                    } else if (event.target.checked && phase === PackOpeningPhase.INTRO.value) {
                      setPhase(PackOpeningPhase.CHOOSING.value);
                    }
                  }}
                />{" "}
                Skip animations
              </label>
              <label className="pack-opening__skip">
                <input
                  type="checkbox"
                  checked={foilEnabled}
                  onChange={(event) => setFoilEnabled(event.target.checked)}
                />{" "}
                Foil effects
              </label>
            </div>
            <label className="pack-opening__set">
              <span>Set</span>
              <select
                aria-label="Booster set"
                disabled={Boolean(allocation) || batch.length > 0}
                value={boosterSet.setId}
                onChange={(event) => {
                  if (allocation) {
                    return;
                  }
                  startBox(event.target.value);
                  setSetId(event.target.value);
                  restart();
                }}
              >
                {sets.map((set) => (
                  <option key={set.setId} value={set.setId}>
                    {set.label}
                  </option>
                ))}
              </select>
            </label>
            <IconButton
              label={immersive ? "Exit full screen" : "Full screen"}
              variant="secondary"
              sound={false}
              className="pack-opening__fullscreen"
              aria-pressed={immersive}
              onClick={toggleImmersive}
            >
              {immersive ? <Icons.Minimize size={18} /> : <Icons.Maximize size={18} />}
            </IconButton>
          </div>
        </header>

        <footer className="pack-opening__bottom" aria-live="polite" hidden={inspectedIndex !== undefined}>
          {boxEmpty ? (
            <div className="pack-opening__panel">
              <p className="pack-opening__hint">You opened all {totalPacks} packs in this box.</p>
              {allocation ? null : (
                <Button
                  sound={false}
                  onClick={() => {
                    startNextBox(setId);
                    restart();
                  }}
                >
                  Start next box
                </Button>
              )}
            </div>
          ) : phase === PackOpeningPhase.INTRO.value || choosing ? (
            <div className="pack-opening__panel">
              <p className="pack-opening__hint">
                {remainingPacks} / {totalPacks} packs remaining in this box
              </p>
              <Button size="lg" sound={false} onClick={openRemainingPacks}>
                Open all packs ({remainingPacks})
              </Button>
              <div className="pack-opening__carousel-controls">
                <button
                  type="button"
                  className="pack-opening__arrow"
                  aria-label="Previous pack"
                  disabled={!choosing}
                  onClick={() => rotateBy(1)}
                >
                  ‹
                </button>
                <Button variant="secondary" sound={false} disabled={!choosing} onClick={spinRoulette}>
                  Spin
                </Button>
                <Button sound={false} disabled={!choosing} onClick={openFrontPack}>
                  Open pack
                </Button>
                <button
                  type="button"
                  className="pack-opening__arrow"
                  aria-label="Next pack"
                  disabled={!choosing}
                  onClick={() => rotateBy(-1)}
                >
                  ›
                </button>
              </div>
            </div>
          ) : null}

          {phase === PackOpeningPhase.CHARGING.value || phase === PackOpeningPhase.BURST.value ? (
            <div className="pack-opening__panel">
              <p className="pack-opening__hint">
                {batch.length > 0 ? `Opening pack ${batchIndex + 1} / ${bulkOpenedCount}` : "Opening…"}
              </p>
              <Button sound={false} onClick={revealAll}>
                Skip animation
              </Button>
            </div>
          ) : null}

          {focusedCard ? (
            <div className="pack-opening__panel">
              <div className="pack-opening__reveal">
                <span className="pack-opening__count">
                  {revealedCount} / {cards.length}
                </span>
                <span className="pack-opening__name">{focusedCard.nameEn}</span>
                <span
                  className="pack-opening__rarity"
                  style={focusedRarity?.glowColor ? { borderColor: focusedRarity.glowColor } : undefined}
                >
                  {focusedRarity?.label ?? focusedCard.rarity}
                  {focusedCard.artId ? " · AA" : ""}
                </span>
              </div>
              <div className="pack-opening__actions">
                <Button variant="secondary" sound={false} onClick={revealAll}>
                  Reveal all
                </Button>
                <Button sound={false} onClick={revealNext}>
                  {revealedCount >= cards.length ? "Finish" : "Next card"}
                </Button>
              </div>
            </div>
          ) : null}

          {phase === PackOpeningPhase.SUMMARY.value ? (
            <div className="pack-opening__panel pack-opening__panel--summary">
              {cards.length > pageSize ? (
                <div className="pack-opening__pager" role="group" aria-label="Opened packs">
                  <button
                    type="button"
                    className="pack-opening__arrow"
                    aria-label="Previous opened pack"
                    disabled={summaryPage === 0}
                    onClick={() => {
                      setInspectedIndex(undefined);
                      setSummaryPage((page) => page - 1);
                    }}
                  >
                    ‹
                  </button>
                  <span className="pack-opening__pager-label" aria-live="polite">
                    Pack <strong>{summaryPage + 1}</strong> / {Math.ceil(cards.length / pageSize)}
                  </span>
                  <button
                    type="button"
                    className="pack-opening__arrow"
                    aria-label="Next opened pack"
                    disabled={(summaryPage + 1) * pageSize >= cards.length}
                    onClick={() => {
                      setInspectedIndex(undefined);
                      setSummaryPage((page) => page + 1);
                    }}
                  >
                    ›
                  </button>
                </div>
              ) : null}
              <div className="pack-opening__actions pack-opening__actions--summary">
                {remainingPacks > 0 ? (
                  <>
                    <Button variant="secondary" sound={false} onClick={openAnotherPack}>
                      Open another pack
                    </Button>
                    <Button sound={false} onClick={openRemainingPacks}>
                      Open all packs ({remainingPacks})
                    </Button>
                  </>
                ) : allocation ? null : (
                  <Button
                    sound={false}
                    onClick={() => {
                      startNextBox(setId);
                      restart();
                    }}
                  >
                    Start next box
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </footer>
      </main>
      {phase === PackOpeningPhase.SUMMARY.value ? (
        <PackOpeningResults cards={cards} foilEnabled={foilEnabled} onInspect={inspectCard} packSize={pageSize} />
      ) : null}
      {revealedCount > 0 && phase !== PackOpeningPhase.SUMMARY.value ? (
        <nav className="pack-opening-card-links" aria-label="Zoom revealed cards">
          {cards.slice(0, revealedCount).map((card, index) => (
            <button type="button" key={`${getPackCardKey(card)}-${index}`} onClick={() => setInspectedIndex(index)}>
              {card.nameEn}
              {card.artId ? " · AA" : ""}
            </button>
          ))}
        </nav>
      ) : null}
      {saveFailed ? (
        <p role="alert" className="pack-opening-page__note">
          Browser storage is unavailable or full. This session works, but the latest packs could not be saved.
        </p>
      ) : null}
      <PackOpeningProgress
        totalPacks={totalPacks}
        allocated={Boolean(allocation)}
        progress={setProgress}
        availableCards={availableCards}
        onViewPack={(viewed) => {
          if (
            viewed.length === 0 ||
            (source.remainingPacks !== undefined &&
              source.remainingPacks !== totalPacks - (setProgress?.packs.length ?? 0))
          ) {
            return;
          }
          setBatch([]);
          setSummaryPage(0);
          setBulkOpenedCount(0);
          setInspectedIndex(undefined);
          opening.current = true;
          setCards(viewed);
          setRevealedCount(viewed.length);
          setPhase(PackOpeningPhase.SUMMARY.value);
        }}
      />
      {allocation ? null : (
        <div className="pack-opening-page__note">
          <p>Practice opening · Cards are not added to your collection</p>
        </div>
      )}
      {allocation && detailCard && (phase === PackOpeningPhase.SUMMARY.value || revealedCount > 0) ? (
        <Button variant="secondary" onClick={() => setDetailsOpen(true)}>
          {t("deck.cardDetails")}
        </Button>
      ) : null}
      {allocation && detailsOpen && detailCard ? (
        <CardDetailDrawer
          cardId={detailCard.cardId}
          artId={detailCard.artId}
          ownedLimit={
            (source.completedAllocation ?? allocation).flat().filter((card) => card.cardId === detailCard.cardId).length
          }
          allowedArtIds={(source.completedAllocation ?? allocation)
            .flat()
            .filter((card) => card.cardId === detailCard.cardId)
            .map((card) => card.artId ?? card.cardId)}
          onClose={() => setDetailsOpen(false)}
        />
      ) : null}
    </div>
  );
}
