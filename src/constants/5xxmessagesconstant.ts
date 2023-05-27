import { IResponseMessage } from "../interfaces/endresponseinterface";

const code500 = 500;
const code501 = 501;
const code503 = 503;

const INTERNAL_SERVER_MESSAGE = 'Internal Server Error';
const SERVICE_UNAVILABLE_MESSAGE = `Service unavailable due to server`;

export const INTERNAL_SERVER_ERROR: IResponseMessage = {
    statusCode: code500,
    message: INTERNAL_SERVER_MESSAGE,
    headerCode: code500
}

export const SERVICE_UNAVILABLE_ERROR: IResponseMessage = {
    statusCode: code503,
    message: SERVICE_UNAVILABLE_MESSAGE,
    headerCode: code503
}