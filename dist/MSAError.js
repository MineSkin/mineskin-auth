"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MSAError = void 0;
class MSAError extends Error {
    constructor(stage, cause) {
        super(`${stage}: ${cause ? cause.message : ""}`);
        Object.setPrototypeOf(this, MSAError.prototype);
        this.stage = stage;
        this.cause = cause;
    }
}
exports.MSAError = MSAError;
//# sourceMappingURL=MSAError.js.map