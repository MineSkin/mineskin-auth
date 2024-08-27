export class MSAError extends Error {
    public readonly stage: string;
    public readonly cause: Error;
    constructor(stage: string, cause?: Error) {
        super(`${stage}: ${cause ? cause.message : ""}`);
        Object.setPrototypeOf(this, MSAError.prototype);
        this.stage = stage;
        this.cause = cause;
    }
}
