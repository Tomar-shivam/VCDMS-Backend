import { BaseModel } from './basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"
import mongooseFieldEncryption from "mongoose-field-encryption"


export interface ILicenseCheck extends Document {
    _id: Types.ObjectId;
    Slug:string;
    SlugStatus: string;
    Msg:string;
    DueDate:string;
    StartDate: String;
    EndDate:String;
}

export class LicenseCheck extends BaseModel {
    _id?: Types.ObjectId;
    Slug?:string;
    SlugStatus?: string;
    Msg?: string;
    DueDate?: string;
    StartDate?: String ;
    EndDate?:String;
}

const LicenseCheckSchema: Schema = new Schema({
    Slug: { type: String },
    SlugStatus: { type: String },
    Msg: { type: String },
    DueDate: { type: String },
    StartDate: { type: String },
    EndDate:{ type: String },
}, { timestamps: true });
LicenseCheckSchema.plugin(mongooseFieldEncryption.fieldEncryption, { fields: ["Slug", "SlugStatus"], secret: "icanhazcheeseburger"})

export const licenseCheckModel = model<LicenseCheck>('Slugs', LicenseCheckSchema);