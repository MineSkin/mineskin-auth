interface Expiring {
    expires: number;
    issued: number;
}
export interface XboxInfo {
    mcAccessToken?: string;
    msa?: MicrosoftAuthInfo;
}
export interface MicrosoftAuthInfo {
    auth: MicrosoftAuthResponse;
    userToken: UserTokenResponse;
    identities: {
        mc: IdentityResponse;
        xbox: IdentityResponse;
    };
}
export interface MicrosoftAuthResponse extends Expiring {
    accessToken: string;
    refreshToken: string;
    userId: string;
}
export interface UserTokenResponse extends Expiring {
    token: string;
    userHash: string;
}
export interface IdentityResponse extends Expiring {
    token: string;
    claims: {
        [claim: string]: any;
    };
}
export interface XboxLoginResponse {
    username: string;
    access_token: string;
    expires_in: number;
}
export interface XSTSResponse {
    IssueInstant: string;
    NotAfter: string;
    Token: string;
    DisplayClaims: {
        xui: [
            {
                uhs: string;
                [claim: string]: any;
            }
        ];
    };
}
export interface MicrosoftIdentities {
    xbox: XSTSResponse;
    mc: XSTSResponse;
}
export interface MicrosoftOauthResult {
    user: string;
    email: string;
    microsoftInfo: XboxInfo;
}
export interface SessionMicrosoftInfo {
    account: {
        user: string;
        email: string;
    };
    auth: {
        microsoftInfo: XboxInfo;
        tokenHash: string;
        msaHash: string;
    };
}
export {};
