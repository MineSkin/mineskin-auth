import { AxiosRequestConfig, AxiosResponse } from "axios";

export type RequestHandler = (config: AxiosRequestConfig) => Promise<AxiosResponse>;

export type RequestHandlers = {
    generic: RequestHandler;
    liveLogin: RequestHandler;
    minecraftServices: RequestHandler;

}