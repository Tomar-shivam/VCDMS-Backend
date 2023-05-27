import { BaseModel } from '../basemodel'
import { Document, Schema, Model, model, Types } from "mongoose"

export interface IVERSIONS extends Document {
    _id:Types.ObjectId
    VCDMSVersion:String;
    NPMVersion:String;
    ReactVersion:String;
    NodeVersion:String;
    MongoVersion:String;
}

export class VERSIONS extends BaseModel{
    _id?:Types.ObjectId
    VCDMSVersion?:String;
    NPMVersion?:String;
    ReactVersion?:String;
    NodeVersion?:String;
    MongoVersion?:String;
}

const VERSIONSSchema:Schema = new Schema({
    VCDMSVersion:{
        type:String
    },
   NPMVersion:{
       type:String
   },
   ReactVersion:{
    type:String
},
   NodeVersion:{
    type:String
},
   MongoVersion:{
    type:String
},
},{ timestamps: true });

export const VERSIONSModel= model<VERSIONS>('techversions',VERSIONSSchema)