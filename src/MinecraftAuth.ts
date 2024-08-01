import {BasicMojangProfile} from "./types/minecraft";
import {MINECRAFT_SERVICES_PROFILE, AccountRequests} from "./AccountRequests";
import { RequestManager } from "@mineskin/requests";

export class MinecraftAuth {

    public static async getProfile(accessToken: string): Promise<BasicMojangProfile> {
        const response = await RequestManager.dynamicRequest(MINECRAFT_SERVICES_PROFILE, {
            method: "GET",
            url: "/minecraft/profile",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
        return response.data;
    }

}
