import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface IUserLoginReporting extends Document {
    _id: Types.ObjectId;
    LoginTime: Date;
    LogoutTime: Date;
    Username: string;
    UserID: Types.ObjectId;
    LoginInterval: string;
    Role: string;
    Actions: any[];
}

export class UserLoginReporting extends BaseModel {
    _id?: Types.ObjectId;
    LoginTime?: Date;
    LogoutTime?: Date;
    Username?: string;
    Role?: string;
    LoginInterval?: string;
    UserID?: Types.ObjectId;
    Actions?: any[];
}

const UserLoginReportingSchema: Schema = new Schema({
    LoginTime: { type: Date },
    LogoutTime: { type: Date },
    Username: { type: String },
    Role: { type: String },
    LoginInterval: { type: String },
    UserID: { type: Types.ObjectId },
    Actions: { type: Array },
}, { timestamps: true });

export const userLoginReportingModel = model<UserLoginReporting>('userloginreportings', UserLoginReportingSchema);