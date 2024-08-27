import pino from "pino";
import { RequestHandlers } from "./types/RequestHandler";
import { BasicMojangProfile } from "@mineskin/types";

export class MinecraftAuth {


    logger: pino.Logger = pino({
        msgPrefix: '[AUTH]'
    });

    constructor(
        private readonly requestHandlers: RequestHandlers<'minecraftServices'|'minecraftServicesProfile'>
    ) {
    }

    async checkGameOwnership(accessToken: string): Promise<boolean> {
        this.logger.debug("checkGameOwnership")
        const entitlementsResponse = await this.requestHandlers.minecraftServices({
            method: "GET",
            url: "https://api.minecraftservices.com/entitlements/mcstore",
            headers: {
                Authorization: `Bearer ${ accessToken }`
            }
        });
        const entitlementsBody = entitlementsResponse.data;
        // console.log("entitlements");
        // console.log(entitlementsBody)
        return entitlementsBody.hasOwnProperty("items") && entitlementsBody["items"].length > 0;
    }

    public async getProfile(accessToken: string): Promise<BasicMojangProfile> {
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
