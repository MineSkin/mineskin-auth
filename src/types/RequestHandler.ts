import { AxiosRequestConfig, AxiosResponse } from "axios";

export type RequestHandler = (config: AxiosRequestConfig) => Promise<AxiosResponse>;

export type RequestHandlers<K extends string = never> = {
    [P in K]?: RequestHandler;
};