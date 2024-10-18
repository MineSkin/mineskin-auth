"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinecraftAuth = void 0;
const winston_1 = __importDefault(require("winston"));
const Sentry = __importStar(require("@sentry/node"));
class MinecraftAuth {
    constructor(requestHandlers) {
        this.requestHandlers = requestHandlers;
    }
    async checkGameOwnership(accessToken) {
        return await Sentry.startSpan({
            op: 'auth',
            name: 'checkGameOwnership'
        }, async () => {
            MinecraftAuth.logger.debug("checkGameOwnership");
            const entitlementsResponse = await this.requestHandlers.minecraftServices({
                method: "GET",
                url: "https://api.minecraftservices.com/entitlements",
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            const entitlementsBody = entitlementsResponse.data;
            // console.log("entitlements");
            // console.log(entitlementsBody)
            return entitlementsBody.hasOwnProperty("items") && entitlementsBody["items"].length > 0;
        });
    }
    async getProfile(accessToken) {
        return await Sentry.startSpan({
            op: 'auth',
            name: 'getProfile'
        }, async () => {
            const response = await this.requestHandlers.minecraftServicesProfile({
                method: "GET",
                url: "/minecraft/profile",
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            });
            return response.data;
        });
    }
}
exports.MinecraftAuth = MinecraftAuth;
MinecraftAuth.logger = winston_1.default.createLogger();
//# sourceMappingURL=MinecraftAuth.js.map