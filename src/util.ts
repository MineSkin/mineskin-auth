export function epochSeconds(): number {
    return toEpochSeconds(Date.now());
}

export function toEpochSeconds(timestamp: number): number {
    return Math.floor(timestamp / 1000);
}