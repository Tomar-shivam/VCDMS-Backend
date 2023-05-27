import { Request } from "express";

export interface IFilteredRequest<T={}> extends Request {
    data?: T
}