/* Aegis shared chrome: the letterboxed 16:9 Stage, UI primitives, and the top nav.
   maintained as part of the Aegis design system. Presentational only. */

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { COLORS, colorKey } from "./theme";
import { Icons, type IconComponent } from "./icons";
import { playSound, type SoundKind } from "./sound";
import { useTranslation } from "../i18n";
import { digimonAvatarUrl, type DigimonWorldAvatarId } from "../account/avatars";

/** The lightweight identity carried across screens (name + accent color). */
export interface PlayerIdentity {
  name: string;
  color: string;
  shards: number;
  avatarId?: DigimonWorldAvatarId | null;
  avatarUrl?: string | null;
  /** Portrait picked during guest onboarding; account avatars win over it. */
  guestAvatarId?: DigimonWorldAvatarId | null;
}

/** A screen key in the client router. */
export type Screen =
  | "onboarding"
  | "home"
  | "lobby"
  | "deck"
  | "collection"
  | "tournaments"
  | "settings"
  | "game";

export function Stage({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div id="aegis-stage" className="aegis-stage">
      <a className="aegis-skip-link" href="#aegis-main">{t("nav.skipToContent")}</a>
      <div className="aegis-stage__content">{children}</div>
    </div>
  );
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

type AegisButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconComponent;
  onClick?: () => void;
  full?: boolean;
  sound?: SoundKind | false;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  onClick,
  disabled,
  full,
  className,
  style,
  sound = "nav",
  type = "button",
  ...buttonProps
}: AegisButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      className={`aegis-button aegis-button--${variant} aegis-button--${size}${full ? " aegis-button--full" : ""}${className ? ` ${className}` : ""}`}
      onClick={disabled ? undefined : () => { if (sound) playSound(sound); onClick?.(); }}
      disabled={disabled}
      style={style}
    >
      {Icon ? <Icon size={size === "lg" ? 18 : 16} /> : null}
      {children}
    </button>
  );
}

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div className="aegis-eyebrow" style={color ? { color } : undefined}>
      {children}
    </div>
  );
}

export function Panel({
  children,
  className,
  style,
  pad = 20,
  hero = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  pad?: number;
  hero?: boolean;
}) {
  return (
    <div
      className={`aegis-panel${className ? ` ${className}` : ""}`}
      data-hero={hero || undefined}
      style={{ ...(pad != null ? { "--aegis-panel-pad": `${pad}px` } : {}), ...style } as CSSProperties}
    >
      {children}
    </div>
  );
}

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

export function Badge({ children, className, tone = "neutral", style }: { children: ReactNode; className?: string; tone?: BadgeTone; style?: CSSProperties }) {
  return (
    <span className={`aegis-badge${className ? ` ${className}` : ""}`} data-tone={tone} style={style}>
      {children}
    </span>
  );
}

export function IconButton({ label, className, children, ...props }: Omit<AegisButtonProps, "children" | "icon"> & { label: string; children: ReactNode }) {
  return (
    <Button {...props} className={`aegis-icon-action${className ? ` ${className}` : ""}`} aria-label={label}>
      {children}
    </Button>
  );
}

export type AlertTone = "neutral" | "info" | "success" | "warning" | "danger";

export function Alert({ children, className, title, tone = "neutral" }: { children?: ReactNode; className?: string; title?: ReactNode; tone?: AlertTone }) {
  return (
    <div className={`aegis-alert${className ? ` ${className}` : ""}`} data-tone={tone} role={tone === "danger" ? "alert" : "status"}>
      {title ? <strong className="aegis-alert__title">{title}</strong> : null}
      {children ? <div className="aegis-alert__body">{children}</div> : null}
    </div>
  );
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function Field({ className, error, hint, id: providedId, label, ...inputProps }: FieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const messageId = hint || error ? `${id}-message` : undefined;
  return (
    <div className={`aegis-field${className ? ` ${className}` : ""}`}>
      <label className="aegis-field__label" htmlFor={id}>{label}</label>
      <input {...inputProps} id={id} className="aegis-field__control" aria-describedby={messageId} aria-invalid={error ? true : undefined} />
      {error || hint ? <span id={messageId} className="aegis-field__message" data-error={error ? true : undefined}>{error ?? hint}</span> : null}
    </div>
  );
}

export function Switch({ checked, description, disabled, label, onChange }: { checked: boolean; description?: ReactNode; disabled?: boolean; label: ReactNode; onChange: (checked: boolean) => void }) {
  return (
    <button className="aegis-switch" type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}>
      <span className="aegis-switch__copy">
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <span className="aegis-switch__track" aria-hidden="true"><span className="aegis-switch__thumb" /></span>
    </button>
  );
}

export function Dialog({ children, className, labelledBy, onClose }: { children: ReactNode; className?: string; labelledBy: string; onClose?: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && onClose) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  return (
    <div className="aegis-dialog-layer" onClick={onClose}>
      <section ref={dialogRef} className={`aegis-dialog${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} onKeyDown={handleKeyDown} onClick={(event) => event.stopPropagation()}>
        {children}
      </section>
    </div>
  );
}

export function ColorDot({ color, size = 12, ring }: { color: string; size?: number; ring?: boolean }) {
  const c = COLORS[colorKey(color)];
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: c.base,
        flexShrink: 0,
        boxShadow: ring ? `0 0 0 2px var(--ds-surface), 0 0 0 3px ${c.base}` : "none",
        display: "inline-block",
      }}
    />
  );
}

export function Avatar({ name, color = "Blue", size = 40, ring, avatarId, avatarUrl }: { name: string; color?: string; size?: number; ring?: boolean; avatarId?: DigimonWorldAvatarId | null; avatarUrl?: string | null }) {
  const c = COLORS[colorKey(color)];
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const imageSources = [avatarId ? digimonAvatarUrl(avatarId) : undefined, avatarUrl].filter(
    (source, index, sources): source is string => Boolean(source) && sources.indexOf(source) === index,
  );
  const sourceKey = imageSources.join("\n");
  const [imageState, setImageState] = useState({ sourceKey, index: 0 });
  const imageIndex = imageState.sourceKey === sourceKey ? imageState.index : 0;
  const imageUrl = imageSources[imageIndex];
  // Digimon World portraits are card scans: printed frame, background scenery
  // and a pixel ornament around a small subject. Large tiles show the whole
  // card; small ones zoom past the frame onto the character, biased upward
  // where the head sits, or it reads as a smudge.
  const isCardPortrait = Boolean(avatarId) && imageIndex === 0;
  const cropsToSubject = isCardPortrait && size <= 96;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: isCardPortrait ? "18%" : "30%",
        flexShrink: 0,
        overflow: "hidden",
        background: isCardPortrait ? "transparent" : `linear-gradient(150deg, ${c.base}, ${c.edge})`,
        color: "#ffffff",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--ds-font-display)",
        fontWeight: 800,
        fontSize: size * 0.4,
        boxShadow: ring ? `0 0 0 2px var(--ds-background), 0 0 0 4px ${c.base}` : "none",
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          width={size}
          height={size}
          onError={() => setImageState({ sourceKey, index: imageIndex + 1 })}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            borderRadius: "inherit",
            objectFit: isCardPortrait && !cropsToSubject ? "contain" : "cover",
            transform: cropsToSubject ? "scale(1.38)" : undefined,
            transformOrigin: "50% 38%",
            imageRendering: isCardPortrait && size > 150 ? "pixelated" : "auto",
          }}
        />
      ) : initials}
    </div>
  );
}

const AEGIS_MARK_SRC = "/branding/aegis-mark-tcg-inspired.png";

/* Aegis crest rendered from the current brand mark. */
export function AegisMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src={AEGIS_MARK_SRC}
      alt=""
      width={size}
      height={size}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}

export function Logo({ size = 26, sub = true }: { size?: number; sub?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="aegis-logo" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <AegisMark size={size + 8} />
      <div className="aegis-logo__copy" style={{ lineHeight: 1 }}>
        <div
          className="aegis-logo__wordmark"
          style={{
            color: "var(--ds-fg)",
            fontFamily: "var(--ds-font-brand)",
            fontSize: Math.round(size * 0.9),
            fontWeight: 900,
            letterSpacing: "0.08em",
            lineHeight: 0.9,
            textShadow: "none",
          }}
        >
          AEGIS
        </div>
        {sub ? <div className="aegis-logo__subtitle" style={{ fontFamily: "var(--ds-font-mono)", fontSize: 8.5, letterSpacing: "0.32em", color: "var(--ds-foreground-muted)", marginTop: 2 }}>{t("brand.subtitle")}</div> : null}
      </div>
    </div>
  );
}

function NavItem({ item, active, onSelect, compact = false }: { item: { label: string; icon: IconComponent }; active: boolean; onSelect: () => void; compact?: boolean }) {
  return (
    <button
      className={`aegis-nav-item${compact ? " aegis-nav-item--compact" : ""}`}
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
    >
      <item.icon size={compact ? 19 : 16} />
      {item.label}
    </button>
  );
}

/* ---- Top nav (persistent app chrome) ---- */
export function TopNav({ screen, onNav, player, actions }: { screen: Screen; onNav: (s: Screen) => void; player: PlayerIdentity; actions?: ReactNode }) {
  const { t } = useTranslation();
  const navTo = (s: Screen) => { playSound("nav"); onNav(s); };
  const items: { key: Screen; label: string; icon: IconComponent }[] = [
    { key: "home", label: t("nav.home"), icon: Icons.LayoutDashboard },
    { key: "lobby", label: t("nav.play"), icon: Icons.Swords },
    { key: "deck", label: t("nav.decks"), icon: Icons.LayoutDashboard },
    { key: "collection", label: t("nav.collection"), icon: Icons.BookOpen },
    { key: "tournaments", label: t("nav.tournaments"), icon: Icons.Calendar },
  ];
  return (
    <>
    <header className="aegis-top-nav">
      <div className="aegis-top-nav__primary">
        <button className="aegis-brand-button" onClick={() => navTo("home")} aria-label={t("nav.home")}><Logo size={46} /></button>
        <nav className="aegis-top-nav__links" aria-label={t("nav.primaryAria")}>
          {items.map((it) => {
            const active = screen === it.key || (it.key === "deck" && screen === "deck");
            return <NavItem key={it.key} item={it} active={active} onSelect={() => navTo(it.key)} />;
          })}
        </nav>
      </div>
      <div className="aegis-top-nav__account">
        {actions}
        <button
          className="aegis-icon-button"
          onClick={() => navTo("settings")}
          aria-label={t("menu.settings")}
          aria-current={screen === "settings" ? "page" : undefined}
        >
          <Icons.Settings size={18} />
        </button>
        <div className="aegis-player-chip">
          <span>{player.name}</span>
          <button className="aegis-profile-avatar-button" onClick={() => navTo("settings")} aria-label={t("menu.settings")} aria-current={screen === "settings" ? "page" : undefined}>
            <Avatar name={player.name} color={player.color} avatarId={player.avatarId} avatarUrl={player.avatarUrl} size={36} />
          </button>
        </div>
      </div>
    </header>
    <header className="aegis-mobile-bar">
      <button className="aegis-brand-button" onClick={() => navTo("home")} aria-label={t("nav.home")}><AegisMark size={30} /></button>
      <div className="aegis-mobile-bar__actions">{actions}</div>
      <div className="aegis-player-chip aegis-player-chip--mobile">
        <span>{player.name}</span>
        <button className="aegis-profile-avatar-button" onClick={() => navTo("settings")} aria-label={t("menu.settings")} aria-current={screen === "settings" ? "page" : undefined}>
          <Avatar name={player.name} color={player.color} avatarId={player.avatarId} avatarUrl={player.avatarUrl} size={32} />
        </button>
      </div>
    </header>
    <nav className="aegis-bottom-nav" aria-label={t("nav.primaryAria")}>
      {items.map((it) => <NavItem key={it.key} item={it} active={screen === it.key} onSelect={() => navTo(it.key)} compact />)}
      <NavItem item={{ label: t("menu.settings"), icon: Icons.Settings }} active={screen === "settings"} onSelect={() => navTo("settings")} compact />
    </nav>
    </>
  );
}
