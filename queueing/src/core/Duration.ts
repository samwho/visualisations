export class Duration {
  constructor(public ms: number) {
    this.ms = ms;
  }

  public static ms(ms: number) {
    return new Duration(ms);
  }

  public static seconds(seconds: number) {
    return new Duration(seconds * 1000);
  }

  public static minutes(minutes: number) {
    return new Duration(minutes * 60 * 1000);
  }

  public get seconds(): number {
    return this.ms / 1000;
  }

  public get minutes(): number {
    return this.seconds / 60;
  }
}
