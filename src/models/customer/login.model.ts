
import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface ICustomerLogin extends Document {
    _id: Types.ObjectId;
    Firstname: string;
    Lastname: string;
    UserName: string;
    Password: string;
    Role: string;
    Email: string;
    Phone: number;
    Status: boolean;
    Session: string;
    ActionTime: Date;
    ActionType: string;
    Module: string;
    Target: string;
    Username: string;
    Photo: Object;
}

export class CustomerLogin extends BaseModel {
    _id?: Types.ObjectId;
    Firstname?: string;
    Lastname?: string;
    Username?: string;
    Password?: string;
    Role?: string;
    Email?: string;
    Phone?: number;
    Status?: boolean;
    Session?: string;
    Photo?: Object;
    Default_password?: string;
}

const CustomerLoginSchema: Schema = new Schema({
    Firstname: {
        type: String
    },
    Lastname: {
        type: String
    },
    Username: {
        type: String
    },

    Password: {
        type: String
    },
    Role: {
        type: String
    },

    Email: {
        type: String
    },

    Phone: {
        type: Number
    },
    Status: {
        type: Boolean
    },

    Session: {
        type: String
    },
    Photo: {
        type: Object
    },
    Default_password: {
        type: String
    }

}, { timestamps: true });

export const customerLoginModel = model<CustomerLogin>('userlogins', CustomerLoginSchema);