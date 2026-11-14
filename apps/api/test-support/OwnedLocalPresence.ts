import { LocalPresence } from "colyseus";

export class OwnedLocalPresence extends LocalPresence {
  private readonly ownedTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private disposed = false;

  get pendingExpirationCount(): number {
    return this.ownedTimeouts.size;
  }

  override expire(key: string, seconds: number): void {
    this.assertOpen();
    this.schedule(key, seconds, () => {
      delete this.keys[key];
    });
  }

  override setex(key: string, value: string, seconds: number): void {
    this.assertOpen();
    super.setex(key, value, seconds);
  }

  override hincrbyex(key: string, field: string, incrBy: number, seconds: number): Promise<number> {
    this.assertOpen();
    if (!this.hash[key]) this.hash[key] = Object.create(null);
    const fields = this.hash[key]!;
    let value = Number(fields[field] || "0");
    value += incrBy;
    fields[field] = value.toString();
    this.schedule(key, seconds, () => {
      delete this.hash[key];
    });
    return Promise.resolve(value);
  }

  dispose(): void {
    this.disposed = true;
    for (const timer of this.ownedTimeouts.values()) clearTimeout(timer);
    this.ownedTimeouts.clear();
  }

  private assertOpen(): void {
    if (this.disposed) throw new Error("Owned LocalPresence is disposed");
  }

  private schedule(key: string, seconds: number, expire: () => void): void {
    clearTimeout(this.ownedTimeouts.get(key));
    this.ownedTimeouts.set(
      key,
      setTimeout(() => {
        expire();
        this.ownedTimeouts.delete(key);
      }, seconds * 1e3),
    );
  }
}
