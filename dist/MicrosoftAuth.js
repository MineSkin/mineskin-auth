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
exports.MicrosoftAuth = void 0;
const process = __importStar(require("node:process"));
const qs = __importStar(require("qs"));
const XboxLiveAuth = __importStar(require("@xboxreplay/xboxlive-auth"));
const MSAError_1 = require("./MSAError");
const util_1 = require("./util");
const winston_1 = __importDefault(require("winston"));
const Sentry = __importStar(require("@sentry/node"));
const MC_XSTSRelyingParty = 'rp://api.minecraftservices.com/';
const XBOX_XSTSRelyingParty = 'http://xboxlive.com';
// manage app on portal.azure.com
class MicrosoftAuth {
    constructor(requestHandlers, redirectUri = process.env.MSA_REDIRECT_URI) {
        this.requestHandlers = requestHandlers;
        this.redirectUri = redirectUri;
    }
    async newOAuthRedirect(scopes, state, loginHint) {
        const scope = scopes.join("%20");
        return 'https://login.live.com/oauth20_authorize.srf?' +
            `client_id=${process.env.MSA_CLIENT_ID}` +
            '&response_type=code' +
            `&redirect_uri=${this.redirectUri}` +
            `&scope=${scope}` +
            `&state=${state}` +
            '&prompt=login&' +
            `login_hint=${loginHint}`;
    }
    async loginWithXboxCode(code) {
        MicrosoftAuth.logger.debug("loginWithXboxCode");
        const form = {
            "client_id": process.env.MSA_CLIENT_ID,
            "client_secret": process.env.MSA_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": this.redirectUri
        };
        return await this.authenticateXboxLiveWithFormData(form);
    }
    async exchangeRpsTicketForIdentities(rpsTicket) {
        MicrosoftAuth.logger.debug("exchangeRpsTicketForIdentities");
        if (!rpsTicket.startsWith("d=")) {
            // username+password login doesn't seem to need this prefix, code auth does
            rpsTicket = `d=${rpsTicket}`;
        }
        // https://user.auth.xboxlive.com/user/authenticate
        let userTokenResponse;
        try {
            userTokenResponse = await XboxLiveAuth.xbl.exchangeRpsTicketForUserToken(rpsTicket);
        }
        catch (e) {
            Sentry.captureException(e, {
                tags: {
                    stage: 'exchangeRpsTicketForIdentities'
                }
            });
            throw new MSAError_1.MSAError('exchangeRpsTicketForIdentities', e);
        }
        // console.log("exchangeRpsTicket")
        // console.log(JSON.stringify(userTokenResponse))
        return {
            token: userTokenResponse,
            mc: await this.getIdentityForRelyingParty(userTokenResponse, MC_XSTSRelyingParty),
            xbox: await this.getIdentityForRelyingParty(userTokenResponse, XBOX_XSTSRelyingParty)
        };
    }
    async getIdentityForRelyingParty(userTokenResponse, relyingParty) {
        MicrosoftAuth.logger.debug("getIdentityForRelyingParty");
        // https://xsts.auth.xboxlive.com/xsts/authorize
        const body = {
            RelyingParty: relyingParty,
            TokenType: "JWT",
            Properties: {
                SandboxId: "RETAIL",
                UserTokens: [userTokenResponse.Token]
            }
        };
        let authResponse;
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
        }
        catch (e) {
            Sentry.captureException(e, {
                tags: {
                    stage: 'getIdentityForRelyingParty'
                }
            });
            throw new MSAError_1.MSAError('getIdentityForRelyingParty', e);
        }
        return authResponse.data;
    }
    async authenticateXboxLiveWithFormData(form) {
        MicrosoftAuth.logger.debug("authenticateXboxLiveWithFormData");
        let refreshResponse;
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
        }
        catch (e) {
            Sentry.captureException(e, {
                tags: {
                    stage: 'authenticateXboxLiveWithFormData'
                }
            });
            throw new MSAError_1.MSAError('authenticateXboxWithFormData', e);
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
                    expires: (0, util_1.epochSeconds)() + parseInt(refreshBody["expires_in"]),
                    issued: (0, util_1.epochSeconds)(),
                    userId: refreshBody["user_id"]
                },
                userToken: {
                    token: identityResponses.token.Token,
                    expires: (0, util_1.toEpochSeconds)(Date.parse(identityResponses.token.NotAfter)),
                    issued: (0, util_1.toEpochSeconds)(Date.parse(identityResponses.token.IssueInstant)),
                    userHash: identityResponses.token.DisplayClaims.xui[0].uhs
                },
                identities: {
                    mc: {
                        token: mcIdentity.Token,
                        expires: (0, util_1.toEpochSeconds)(Date.parse(mcIdentity.NotAfter)),
                        issued: (0, util_1.toEpochSeconds)(Date.parse(mcIdentity.IssueInstant)),
                        claims: mcIdentity.DisplayClaims.xui[0]
                    },
                    xbox: {
                        token: xboxIdentity.Token,
                        expires: (0, util_1.toEpochSeconds)(Date.parse(xboxIdentity.NotAfter)),
                        issued: (0, util_1.toEpochSeconds)(Date.parse(xboxIdentity.IssueInstant)),
                        claims: xboxIdentity.DisplayClaims.xui[0]
                    }
                }
            }
        };
    }
    async loginToMinecraftWithXbox(userHash, xstsToken) {
        MicrosoftAuth.logger.debug("loginToMinecraftWithXbox");
        const body = {
            identityToken: `XBL3.0 x=${userHash};${xstsToken}`
        };
        let xboxLoginResponse;
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
        }
        catch (e) {
            Sentry.captureException(e, {
                tags: {
                    stage: 'loginToMinecraftWithXbox'
                }
            });
            throw new MSAError_1.MSAError('loginToMinecraftWithXbox', e);
        }
        const xboxLoginBody = xboxLoginResponse.data;
        // console.log("xboxLogin")
        // console.log(JSON.stringify(xboxLoginBody));
        return xboxLoginBody;
    }
    async refreshXboxAccessToken(xboxRefreshToken) {
        MicrosoftAuth.logger.debug("refreshXboxAccessToken");
        const form = {
            "client_id": process.env.MSA_CLIENT_ID,
            "client_secret": process.env.MSA_CLIENT_SECRET,
            "refresh_token": xboxRefreshToken,
            "grant_type": "refresh_token",
            "redirect_uri": this.redirectUri
        };
        return await this.authenticateXboxLiveWithFormData(form);
    }
}
exports.MicrosoftAuth = MicrosoftAuth;
MicrosoftAuth.logger = winston_1.default.createLogger();
//# sourceMappingURL=MicrosoftAuth.js.map