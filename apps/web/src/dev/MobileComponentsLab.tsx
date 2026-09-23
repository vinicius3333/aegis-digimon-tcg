/* Dev-only gallery of every in-match surface inside phone-sized frames, reached at
   /dev/mobile. The phone styles are media queries on the viewport, so a narrow div
   would not trigger them: each specimen loads this same page in an iframe of the
   phone's size, and `?specimen=<id>&frame=1` renders that one specimen full-bleed. */

import { useEffect, useState } from "react";
import { Stage } from "../design/primitives";
import { LOCALES, useTranslation, type Locale } from "../i18n";
import { BoardSurface, SPECIMEN_GROUPS, SPECIMENS, specimenById, type Specimen } from "./mobileLabSpecimens";
import "../game/game.css";
import "../game/arena.css";
import "../game/arenaMobile.css";
import "./mobileComponentsLab.css";

export const DEVICES = [
  { id: "small", label: "360 × 740", width: 360, height: 740 },
  { id: "phone", label: "390 × 844", width: 390, height: 844 },
  { id: "large", label: "430 × 932", width: 430, height: 932 },
  { id: "landscape", label: "844 × 390 landscape", width: 844, height: 390 },
] as const;

type DeviceId = (typeof DEVICES)[number]["id"];

const SCALES = [1, 0.75, 0.5] as const;

type Scale = (typeof SCALES)[number];

const DEFAULT_DEVICE: DeviceId = "phone";

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value);
}

export function specimenFrameUrl(id: string, locale: Locale): string {
  return `/dev/mobile?specimen=${encodeURIComponent(id)}&frame=1&locale=${encodeURIComponent(locale)}`;
}

export function MobileComponentsLab() {
  const params = new URLSearchParams(window.location.search);
  const specimen = specimenById(params.get("specimen"));
  if (params.get("frame") === "1" && specimen) {
    const requestedLocale = params.get("locale");
    return <SpecimenFrame specimen={specimen} locale={isLocale(requestedLocale) ? requestedLocale : undefined} />;
  }
  return <LabIndex />;
}

/** One specimen, full-bleed, exactly as the match screen would stack it. */
function SpecimenFrame({ specimen, locale: requestedLocale }: { specimen: Specimen; locale?: Locale }) {
  const { locale, setLocale } = useTranslation();
  useEffect(() => {
    if (requestedLocale && requestedLocale !== locale) setLocale(requestedLocale);
  }, [requestedLocale, locale, setLocale]);
  const content = specimen.render(requestedLocale ?? locale);
  return (
    <Stage>
      <div className="mobile-lab-frame" data-specimen={specimen.id}>
        {specimen.surface === "match" ? content : <BoardSurface>{content}</BoardSurface>}
      </div>
    </Stage>
  );
}

function readSetting<T extends string | number>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = new URLSearchParams(window.location.search).get(key);
  return allowed.find((value) => String(value) === raw) ?? fallback;
}

function writeSetting(key: string, value: string | number) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, String(value));
  window.history.replaceState(null, "", url);
}

function LabIndex() {
  const { locale, setLocale } = useTranslation();
  const [deviceId, setDeviceId] = useState<DeviceId>(() =>
    readSetting(
      "device",
      DEVICES.map((device) => device.id),
      DEFAULT_DEVICE,
    ),
  );
  const [scale, setScale] = useState<Scale>(() => readSetting("scale", SCALES, 1));
  const device = DEVICES.find((entry) => entry.id === deviceId) ?? DEVICES[1];

  const chooseDevice = (id: DeviceId) => {
    setDeviceId(id);
    writeSetting("device", id);
  };
  const chooseScale = (next: Scale) => {
    setScale(next);
    writeSetting("scale", next);
  };

  return (
    <div className="mobile-lab">
      <header className="mobile-lab__header">
        <div className="mobile-lab__intro">
          <h1 className="mobile-lab__title">Mobile components lab</h1>
          <p className="mobile-lab__lead">
            Every in-match surface in a real phone-sized viewport, rendered from fixtures. Nothing here talks to a room.
          </p>
        </div>
        <div className="mobile-lab__toolbar" role="toolbar" aria-label="Frame settings">
          <ToggleGroup
            label="Device"
            options={DEVICES.map((entry) => ({ value: entry.id, label: entry.label }))}
            value={deviceId}
            onChange={chooseDevice}
          />
          <ToggleGroup
            label="Zoom"
            options={SCALES.map((value) => ({ value, label: `${Math.round(value * 100)}%` }))}
            value={scale}
            onChange={chooseScale}
          />
          <ToggleGroup
            label="Language"
            options={LOCALES.map((value) => ({ value, label: value }))}
            value={locale}
            onChange={setLocale}
          />
        </div>
        <nav className="mobile-lab__nav" aria-label="Groups">
          {SPECIMEN_GROUPS.map((group) => (
            <a key={group} href={`#mobile-lab-${group.toLowerCase()}`}>
              {group}
            </a>
          ))}
        </nav>
      </header>

      {SPECIMEN_GROUPS.map((group) => (
        <section
          key={group}
          id={`mobile-lab-${group.toLowerCase()}`}
          className="mobile-lab__group"
          aria-labelledby={`mobile-lab-${group.toLowerCase()}-title`}
        >
          <h2 id={`mobile-lab-${group.toLowerCase()}-title`} className="mobile-lab__group-title">
            {group}
          </h2>
          <div className="mobile-lab__grid">
            {SPECIMENS.filter((specimen) => specimen.group === group).map((specimen) => (
              <SpecimenCard
                key={specimen.id}
                specimen={specimen}
                width={device.width}
                height={device.height}
                scale={scale}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ToggleGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="mobile-lab__toggle" role="group" aria-label={label}>
      <span className="mobile-lab__toggle-label">{label}</span>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SpecimenCard({
  specimen,
  width,
  height,
  scale,
  locale,
}: {
  specimen: Specimen;
  width: number;
  height: number;
  scale: Scale;
  locale: Locale;
}) {
  const url = specimenFrameUrl(specimen.id, locale);
  return (
    <article className="mobile-lab__card" id={specimen.id}>
      <header className="mobile-lab__card-header">
        <h3 className="mobile-lab__card-title">{specimen.title}</h3>
        <a className="mobile-lab__card-link" href={url} target="_blank" rel="noreferrer">
          Open alone
        </a>
      </header>
      <code className="mobile-lab__card-id">{specimen.id}</code>
      {specimen.note ? <p className="mobile-lab__card-note">{specimen.note}</p> : null}
      <div className="mobile-lab__viewport" style={{ width: width * scale, height: height * scale }}>
        <iframe
          key={url}
          title={specimen.title}
          src={url}
          loading="lazy"
          width={width}
          height={height}
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    </article>
  );
}
