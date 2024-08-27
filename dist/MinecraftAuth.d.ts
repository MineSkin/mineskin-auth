import { RequestHandlers } from "./types/RequestHandler";
import { BasicMojangProfile } from "@mineskin/types";
import winston from "winston";
export declare class MinecraftAuth {
    private readonly requestHandlers;
    static logger: winston.Logger;
    constructor(requestHandlers: RequestHandlers<'minecraftServices' | 'minecraftServicesProfile'>);
    checkGameOwnership(accessToken: string): Promise<boolean>;
    getProfile(accessToken: string): Promise<BasicMojangProfile>;
}
