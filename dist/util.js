"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.epochSeconds = epochSeconds;
exports.toEpochSeconds = toEpochSeconds;
function epochSeconds() {
    return toEpochSeconds(Date.now());
}
function toEpochSeconds(timestamp) {
    return Math.floor(timestamp / 1000);
}
//# sourceMappingURL=util.js.map