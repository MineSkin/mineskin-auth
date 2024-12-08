export declare class MSAError extends Error {
    readonly stage: string;
    readonly cause: Error;
    constructor(stage: string, cause?: Error);
    get name(): string;
}
