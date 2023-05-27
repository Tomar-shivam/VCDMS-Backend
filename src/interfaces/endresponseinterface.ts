export interface IEndResponse<T> extends IResponseMessage {
    result: T;
    error?: Object
}

export interface IResponseMessage {
    statusCode: number;
    headerCode: number;
    message: string;
}