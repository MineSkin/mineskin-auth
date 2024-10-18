import * as process from "node:process";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import * as qs from "qs";
import * as XboxLiveAuth from "@xboxreplay/xboxlive-auth"
import { XBLExchangeTokensResponse } from "@xboxreplay/xboxlive-auth"
import {
    MicrosoftAuthInfo,
    MicrosoftIdentities, MicrosoftOauthResult,
    XboxInfo,
    XboxLoginResponse,
    XSTSResponse
} from "@mineskin/types";
import { RequestHandlers } from "./types/RequestHandler";
import { MSAError } from "./MSAError";
import { epochSeconds, toEpochSeconds } from "./util";
import winston from "winston";
import * as Sentry from "@sentry/node";

const MC_XSTSRelyingParty = 'rp://api.minecraftservices.com/'
const XBOX_XSTSRelyingParty = 'http://xboxlive.com'

// manage app on portal.azure.com
export class MicrosoftAuth {

    static logger: winston.Logger = winston.createLogger();

    constructor(
        private readonly requestHandlers: RequestHandlers<'generic' | 'liveLogin' | 'minecraftServices'>,
        private readonly redirectUri: string = process.env.MSA_REDIRECT_URI,
    ) {
    }

    public async newOAuthRedirect(
        scopes: string[],
        state: string,
        loginHint: string
    ) {
        const scope = scopes.join("%20");
        return 'https://login.live.com/oauth20_authorize.srf?' +
            `client_id=${ process.env.MSA_CLIENT_ID }` +
            '&response_type=code' +
            `&redirect_uri=${ this.redirectUri }` +
            `&scope=${ scope }` +
            `&state=${ state }` +
            '&prompt=login&' +
            `login_hint=${ loginHint }`;
    }

    public async loginWithXboxCode(code: string): Promise<XboxInfo> {
        MicrosoftAuth.logger.debug("loginWithXboxCode")
        const form = {
            "client_id": process.env.MSA_CLIENT_ID,
            "client_secret": process.env.MSA_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": this.redirectUri
        }
        return await this.authenticateXboxLiveWithFormData(form);
    }

    async exchangeRpsTicketForIdentities(rpsTicket: string): Promise<MicrosoftIdentities & {
        token: XBLExchangeTokensResponse
    }> {
        MicrosoftAuth.logger.debug("exchangeRpsTicketForIdentities")
        if (!rpsTicket.startsWith("d=")) {
            // username+password login doesn't seem to need this prefix, code auth does
            rpsTicket = `d=${ rpsTicket }`;
        }
        // https://user.auth.xboxlive.com/user/authenticate
        let userTokenResponse: XBLExchangeTokensResponse;
        try {
            userTokenResponse = await XboxLiveAuth.xbl.exchangeRpsTicketForUserToken(rpsTicket);
        } catch (e) {
            Sentry.captureException(e,{
                tags: {
                    stage: 'exchangeRpsTicketForIdentities'
                }
            });
            throw new MSAError('exchangeRpsTicketForIdentities', e);
        }
        // console.log("exchangeRpsTicket")
        // console.log(JSON.stringify(userTokenResponse))
        return {
            token: userTokenResponse,
            mc: await this.getIdentityForRelyingParty(userTokenResponse, MC_XSTSRelyingParty),
            xbox: await this.getIdentityForRelyingParty(userTokenResponse, XBOX_XSTSRelyingParty)
        };
    }

    async getIdentityForRelyingParty(userTokenResponse: XBLExchangeTokensResponse, relyingParty: string): Promise<XSTSResponse> {
        MicrosoftAuth.logger.debug("getIdentityForRelyingParty")
        // https://xsts.auth.xboxlive.com/xsts/authorize
        const body = {
            RelyingParty: relyingParty,
            TokenType: "JWT",
            Properties: {
                SandboxId: "RETAIL",
                UserTokens: [userTokenResponse.Token]
            }
        };
        let authResponse: AxiosRequestConfig;
        try {
            authResponse = await this.requestHandlers.generic({
                method: "POST",
                url: "https://xsts.auth.xboxlive.com/xsts/authorize",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    /*"x-xbl-contract-version": 1*/
                },
                data: body
            });
        } catch (e) {
            Sentry.captureException(e,{
                tags: {
                    stage: 'getIdentityForRelyingParty'
                }
            });
            throw new MSAError('getIdentityForRelyingParty', e);
        }
        return authResponse.data as XSTSResponse
    }

    private async authenticateXboxLiveWithFormData(form: any): Promise<XboxInfo> {
        MicrosoftAuth.logger.debug("authenticateXboxLiveWithFormData")
        let refreshResponse: AxiosResponse;
        try {
            refreshResponse = await this.requestHandlers.liveLogin({
                method: "POST",
                url: "https://login.live.com/oauth20_token.srf",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                },
                data: qs.stringify(form)
            });
        } catch (e) {
            Sentry.captureException(e,{
                tags: {
                    stage: 'authenticateXboxLiveWithFormData'
                }
            });
            throw new MSAError('authenticateXboxWithFormData', e);
        }
        const refreshBody = refreshResponse.data;
        // console.log("refreshBody");
        // console.log(JSON.stringify(refreshBody))

        // Microsoft/Xbox accessToken
        const xboxAccessToken = refreshBody["access_token"];
        const xboxRefreshToken = refreshBody["refresh_token"];

        const identityResponses = await this.exchangeRpsTicketForIdentities(xboxAccessToken);
        // console.log("identities");
        // console.log(identityResponses)
        const mcIdentity = identityResponses.mc;
        const xboxIdentity = identityResponses.xbox;

        const userHash = mcIdentity.DisplayClaims.xui[0].uhs;
        const XSTSToken = mcIdentity.Token;

        const xboxLoginResponse = await this.loginToMinecraftWithXbox(userHash, XSTSToken);
        const minecraftXboxUsername = xboxLoginResponse.username;

        return {
            // Minecraft accessToken - does not return a refresh token, so need the MS one above
            mcAccessToken: xboxLoginResponse.access_token,
            msa: {
                auth: {
                    accessToken: xboxAccessToken,
                    refreshToken: xboxRefreshToken,
                    expires: epochSeconds() + parseInt(refreshBody["expires_in"]),
                    issued: epochSeconds(),
                    userId: refreshBody["user_id"]
                },
                userToken: {
                    token: identityResponses.token.Token,
                    expires: toEpochSeconds(Date.parse(identityResponses.token.NotAfter)),
                    issued: toEpochSeconds(Date.parse(identityResponses.token.IssueInstant)),
                    userHash: identityResponses.token.DisplayClaims.xui[0].uhs
                },
                identities: {
                    mc: {
                        token: mcIdentity.Token,
                        expires: toEpochSeconds(Date.parse(mcIdentity.NotAfter)),
                        issued: toEpochSeconds(Date.parse(mcIdentity.IssueInstant)),
                        claims: mcIdentity.DisplayClaims.xui[0]
                    },
                    xbox: {
                        token: xboxIdentity.Token,
                        expires: toEpochSeconds(Date.parse(xboxIdentity.NotAfter)),
                        issued: toEpochSeconds(Date.parse(xboxIdentity.IssueInstant)),
                        claims: xboxIdentity.DisplayClaims.xui[0]
                    }
                }
            }
        }
    }

    private async loginToMinecraftWithXbox(userHash: string, xstsToken: string): Promise<XboxLoginResponse> {
        MicrosoftAuth.logger.debug("loginToMinecraftWithXbox")
        const body = {
            identityToken: `XBL3.0 x=${ userHash };${ xstsToken }`
        };
        let xboxLoginResponse: AxiosResponse;
        try {
            xboxLoginResponse = await this.requestHandlers.minecraftServices({
                method: "POST",
                url: "https://api.minecraftservices.com/authentication/login_with_xbox",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                data: body
            });
        } catch (e) {
            Sentry.captureException(e,{
                tags: {
                    stage: 'loginToMinecraftWithXbox'
                }
            });
            throw new MSAError('loginToMinecraftWithXbox', e);
        }
        const xboxLoginBody = xboxLoginResponse.data;
        // console.log("xboxLogin")
        // console.log(JSON.stringify(xboxLoginBody));
        return xboxLoginBody as XboxLoginResponse;
    }


    async refreshXboxAccessToken(xboxRefreshToken: string): Promise<XboxInfo> {
        MicrosoftAuth.logger.debug("refreshXboxAccessToken");
        const form = {
            "client_id": process.env.MSA_CLIENT_ID,
            "client_secret": process.env.MSA_CLIENT_SECRET,
            "refresh_token": xboxRefreshToken,
            "grant_type": "refresh_token",
            "redirect_uri": this.redirectUri
        }
        return await this.authenticateXboxLiveWithFormData(form);
    }

}
