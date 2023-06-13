
export class DashError extends Error {
  public constructor(message?: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = "DashError";
  }
}
