import { RequestHandlers } from "./types/RequestHandler";
import { BasicMojangProfile } from "@mineskin/types";
import winston from "winston";
import * as Sentry from "@sentry/node";

export class MinecraftAuth {

    static logger: winston.Logger = winston.createLogger();

    constructor(
        private readonly requestHandlers: RequestHandlers<'minecraftServices'|'minecraftServicesProfile'>
    ) {
    }

    async checkGameOwnership(accessToken: string): Promise<boolean> {
        return await Sentry.startSpan({
            op: 'auth',
            name: 'checkGameOwnership'
        }, async () => {
            MinecraftAuth.logger.debug("checkGameOwnership")
            const entitlementsResponse = await this.requestHandlers.minecraftServices({
                method: "GET",
                url: "https://api.minecraftservices.com/entitlements",
                headers: {
                    Authorization: `Bearer ${ accessToken }`
                }
            });
            const entitlementsBody = entitlementsResponse.data;
            // console.log("entitlements");
            // console.log(entitlementsBody)
            return entitlementsBody.hasOwnProperty("items") && entitlementsBody["items"].length > 0;
        });
    }

    public async getProfile(accessToken: string): Promise<BasicMojangProfile> {
        return await Sentry.startSpan({
            op: 'auth',
            name: 'getProfile'
        }, async () => {
            const response = await this.requestHandlers.minecraftServicesProfile({
                method: "GET",
                url: "/minecraft/profile",
                headers: {
                    "Authorization": `Bearer ${ accessToken }`
                }
            });
            return response.data;
        });
    }

}
