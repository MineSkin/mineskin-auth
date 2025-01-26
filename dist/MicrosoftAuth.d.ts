import { XBLExchangeTokensResponse } from "@inventivetalent/xboxlive-auth";
import { MicrosoftIdentities, XboxInfo, XSTSResponse } from "@mineskin/types";
import { RequestHandlers } from "./types/RequestHandler";
import winston from "winston";
export declare class MicrosoftAuth {
    private readonly requestHandlers;
    private readonly redirectUri;
    static logger: winston.Logger;
    constructor(requestHandlers: RequestHandlers<'generic' | 'liveLogin' | 'minecraftServices'>, redirectUri?: string);
    newOAuthRedirect(scopes: string[], state: string, loginHint: string): Promise<string>;
    loginWithXboxCode(code: string): Promise<XboxInfo>;
    exchangeRpsTicketForIdentities(rpsTicket: string, requestServer?: string, breadcrumb?: string): Promise<MicrosoftIdentities & {
        token: XBLExchangeTokensResponse;
    }>;
    getIdentityForRelyingParty(userTokenResponse: XBLExchangeTokensResponse, relyingParty: string, requestServer?: string, breadcrumb?: string): Promise<XSTSResponse>;
    private authenticateXboxLiveWithFormData;
    private loginToMinecraftWithXbox;
    refreshXboxAccessToken(xboxRefreshToken: string, requestServer?: string, breadcrumb?: string): Promise<XboxInfo>;
}
