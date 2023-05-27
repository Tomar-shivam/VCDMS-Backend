import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface ISMTP extends Document {
    _id: Types.ObjectId
    Service: string;
    Usermail: string;
    Password: string;
    Portnumber: number;
    Sendername: string;
    Tomail: String;
    Description: String;
    isSecure: string;
    ActionTime: Date;
    ActionType: string;
    Module: string;
    Target: string;
}

export class SMTP extends BaseModel {
    _id?: Types.ObjectId
    Service?: string;
    Usermail?: string;
    Password?: string;
    Portnumber?: number;
    Sendername?: string;
    Tomail?: string;
    Description?: string;
    isSecure?: string;
}

const SMTPSchema: Schema = new Schema({
    Service: {
        type: String
    },

    Usermail: {
        type: String
    },

    Password: {
        type: String
    },

    Portnumber: {
        type: Number
    },

    Sendername: {
        type: String
    },
    Tomail: {
        type: String
    },
    Description: {
        type: String
    },
    isSecure: {
        type: String
    },

}, { timestamps: true });

export const SMTPModel = model<SMTP>('smtpdetails', SMTPSchema)