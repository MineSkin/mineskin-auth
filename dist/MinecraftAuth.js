"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinecraftAuth = void 0;
const winston_1 = __importDefault(require("winston"));
class MinecraftAuth {
    constructor(requestHandlers) {
        this.requestHandlers = requestHandlers;
    }
    async checkGameOwnership(accessToken) {
        MinecraftAuth.logger.debug("checkGameOwnership");
        const entitlementsResponse = await this.requestHandlers.minecraftServices({
            method: "GET",
            url: "https://api.minecraftservices.com/entitlements/mcstore",
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const entitlementsBody = entitlementsResponse.data;
        // console.log("entitlements");
        // console.log(entitlementsBody)
        return entitlementsBody.hasOwnProperty("items") && entitlementsBody["items"].length > 0;
    }
    async getProfile(accessToken) {
        const response = await this.requestHandlers.minecraftServicesProfile({
            method: "GET",
            url: "/minecraft/profile",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
        return response.data;
    }
}
exports.MinecraftAuth = MinecraftAuth;
MinecraftAuth.logger = winston_1.default.createLogger();
//# sourceMappingURL=MinecraftAuth.js.map