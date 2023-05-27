import { Response } from "express";
import { IResponseMessage } from "../interfaces/endresponseinterface";
import { handleError, sendResponse } from "../utils/responsehandlerutil";

export class BaseController {
    protected handleError(res: Response, err: Error, customeErr?: string, data: any = {}): Response {
        return handleError(res, err, data);
    }

    protected sendResponse(res: Response, respMessage: IResponseMessage, data: any = {}): Response {
        return sendResponse(res, respMessage, data);
    }
}