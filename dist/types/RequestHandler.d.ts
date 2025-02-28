import { AxiosRequestConfig, AxiosResponse } from "axios";
export type RequestHandler = (config: AxiosRequestConfig, requestServer?: string, breadcrumb?: string) => Promise<AxiosResponse>;
export type RequestHandlers<K extends string = never> = {
    [P in K]?: RequestHandler;
};
