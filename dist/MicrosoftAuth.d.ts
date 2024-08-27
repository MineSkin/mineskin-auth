import { XBLExchangeTokensResponse } from "@xboxreplay/xboxlive-auth";
import { MicrosoftIdentities, XboxInfo, XSTSResponse } from "./types/MicrosoftAuthInfo";
import { RequestHandlers } from "./types/RequestHandler";
import winston from "winston";
export declare class MicrosoftAuth {
    private readonly requestHandlers;
    private readonly redirectUri;
    static logger: winston.Logger;
    constructor(requestHandlers: RequestHandlers<'generic' | 'liveLogin' | 'minecraftServices'>, redirectUri?: string);
    newOAuthRedirect(scopes: string[], state: string, loginHint: string): Promise<string>;
    loginWithXboxCode(code: string): Promise<XboxInfo>;
    exchangeRpsTicketForIdentities(rpsTicket: string): Promise<MicrosoftIdentities & {
        token: XBLExchangeTokensResponse;
    }>;
    getIdentityForRelyingParty(userTokenResponse: XBLExchangeTokensResponse, relyingParty: string): Promise<XSTSResponse>;
    private authenticateXboxLiveWithFormData;
    private loginToMinecraftWithXbox;
    refreshXboxAccessToken(xboxRefreshToken: string): Promise<XboxInfo>;
}
