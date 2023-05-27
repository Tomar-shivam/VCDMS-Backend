import { BaseModel } from "../basemodel";
import { Document, Schema, model, Types } from "mongoose";
export interface IBackup extends Document {
    _id: Types.ObjectId;
    user: string;
    dailyexpresion:string;
    dailystorage:string;
    weeklyexpression:string;
    weeklystorage:string;
}
export class BackupCron extends BaseModel {
    _id?: Types.ObjectId;
    user?: string;
    dailyexpression?: string;
    weeklyexpression?:string;
    dailystorage?:string;
    weeklystorage?:string;
}

const CronBackupSchema : Schema = new Schema(
    {
      user: {
        type: String,
      },
      dailyexpression: {
        type: String,
      },
      weeklyexpression :{
          type:String,
      },
      dailystorage:{
          type:String,
      },
      weeklystorage:{
        type:String,
      }
    },
    { timestamps: true }
  );

  export const BackupCronModel = model<BackupCron>("BackupCron", CronBackupSchema);