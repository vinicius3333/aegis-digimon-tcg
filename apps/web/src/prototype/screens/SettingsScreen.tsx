import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ConsolePanel, SectionHeading, Surface } from "../panels";
import { ArenaSettings } from "../arena/ArenaSettings";

const AVATARS = ["toyagumon", "tentomon", "angemon", "garurumon", "greymon", "devimon", "birdramon", "andromon"];

const SLEEVES = ["digimon-standard.webp", "official-03-adventure.png", "official-03-chronicle.png"];

function SettingRow({
  id,
  label,
  detail,
  children,
}: {
  id: string;
  label: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="grid gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsScreen({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  const [avatar, setAvatar] = useState("toyagumon");
  const [sleeve, setSleeve] = useState(SLEEVES[0]!);

  return (
    <>
      <ConsolePanel className="flex flex-wrap items-center gap-5 p-6 sm:p-8">
        <img
          src={`/avatars/digimon-world-1/${avatar}.png`}
          alt=""
          className="size-20 rounded-lg border border-white/15 bg-white/5 object-contain p-1 [image-rendering:pixelated]"
        />
        <div className="grid gap-1">
          <p className="text-[11px] tracking-[0.14em] text-on-ink-muted uppercase">Guest player</p>
          <h1 className="font-display text-3xl font-bold">Settings</h1>
        </div>
      </ConsolePanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface className="grid gap-4 p-5">
          <SectionHeading title="Profile" />
          <div className="grid gap-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input id="nickname" defaultValue="NeonTamer" maxLength={24} />
          </div>
          <div className="grid gap-2">
            <Label>Avatar</Label>
            <div className="grid grid-cols-8 gap-2">
              {AVATARS.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  aria-pressed={avatar === name}
                  onClick={() => setAvatar(name)}
                  className={cn(
                    "aspect-square rounded-md border bg-muted p-1 transition-colors hover:border-primary/50",
                    avatar === name && "border-primary ring-2 ring-primary/25",
                  )}
                >
                  <img
                    src={`/avatars/digimon-world-1/${name}.png`}
                    alt=""
                    className="size-full object-contain [image-rendering:pixelated]"
                  />
                </button>
              ))}
            </div>
          </div>
          <Button className="w-fit">Save profile</Button>
        </Surface>

        <Surface className="grid content-start gap-2 p-5">
          <SectionHeading title="Appearance" />
          <SettingRow id="dark-mode" label="Dark theme" detail="Use a dark background on every screen.">
            <Switch id="dark-mode" checked={dark} onCheckedChange={onToggleDark} />
          </SettingRow>
          <Separator />
          <SettingRow id="language" label="Language" detail="Menus and card rulings.">
            <Select defaultValue="en">
              <SelectTrigger id="language" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt-BR">Português (BR)</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <div className="grid gap-2 py-3">
            <Label>Card sleeve</Label>
            <div className="grid grid-cols-3 gap-3">
              {SLEEVES.map((file) => (
                <button
                  key={file}
                  type="button"
                  aria-pressed={sleeve === file}
                  onClick={() => setSleeve(file)}
                  className={cn(
                    "overflow-hidden rounded-md border-2 border-transparent",
                    sleeve === file && "border-primary",
                  )}
                >
                  <img
                    src={`/sleeves/${file}`}
                    alt={file.replace(/\.\w+$/, "")}
                    className="aspect-[63/88] w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </Surface>

        <Surface className="grid content-start gap-2 p-5 lg:col-span-2">
          <SectionHeading title="Gameplay" />
          <SettingRow id="sound" label="Sound effects" detail="Play sounds for draws, attacks, and security checks.">
            <Switch id="sound" defaultChecked />
          </SettingRow>
          <Separator />
          <SettingRow id="confirm" label="Confirm risky actions" detail="Ask before ending a turn with memory left.">
            <Switch id="confirm" defaultChecked />
          </SettingRow>
        </Surface>

        <ArenaSettings />
      </div>
    </>
  );
}
