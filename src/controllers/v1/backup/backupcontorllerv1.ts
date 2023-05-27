import { NextFunction } from "express";
import {
  ApiPath,
  SwaggerDefinitionConstant,
  ApiOperationPost,
} from "swagger-express-ts";
import { IFilteredRequest } from "../../../interfaces";
import { IBackup } from "../../../models/backup/backupmodel";
import { backupServicesV1 } from "../../../services/v1/backup/backupservicesv1";
import { BaseController } from "../../basecontroller";
@ApiPath({
  path: "/api/v1",
  name: "Database Backup API Calls",
  security: { apiKeyHeader: [] },
})
class BackupControllerV1 extends BaseController {
  public async saveBackupLocation(
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {
    try {
      const requestResult = await backupServicesV1.saveBackupLocation(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async getBackupLocation(
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {
    try {
      const requestResult = await backupServicesV1.getBackupLocation(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async uploadBackupNow(
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {
    try {
      const requestResult = await backupServicesV1.uploadBackupNow(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async listAllBackups(
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {
    try {
      const requestResult = await backupServicesV1.listAllBackups(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async restoreLocal(
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {
    try {
      const requestResult = await backupServicesV1.restoreLocal(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async restoreRemote(
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {
    try {
      const requestResult = await backupServicesV1.restoreRemote(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async listLocalBackups(
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {
    try {
      const requestResult = await backupServicesV1.listLocalBackups(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async downloadBackup(
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {

    try {
     return await backupServicesV1.downloadBackup(req, req.params.foldername,res);
    } catch (error) {
      return res.send(null);
    }
  }
  public async savedailycron(
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {
    try {
      const requestResult = await backupServicesV1.savedailycron(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async saveWeeklyCron  (
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {
    try {
      const requestResult = await backupServicesV1.saveWeeklyCron(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async uploadBackupFiles  (
    req: IFilteredRequest<IBackup>,
    res: any,
    next: NextFunction
  ) {
    try {
      const requestResult = await backupServicesV1.uploadBackupFiles(req);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async saveacBkupIpList(req:any,res: any,next: NextFunction){
    try {
      const requestResult = await backupServicesV1.saveBackupIpList(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async deleteBkupIpList(req:any,res: any,next: NextFunction){
    try {
      const requestResult = await backupServicesV1.deleteBackupIpList(req.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  
  public async getAllHotbackupIp(req: IFilteredRequest<IBackup>,res: any,next: NextFunction){
    try {
      const requestResult = await backupServicesV1.getAllHotBackupIpList(req?.body);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async getAllHotbackupIpForSetting(req: IFilteredRequest<IBackup>,res: any,next: NextFunction){
    try {
      const requestResult = await backupServicesV1.getAllHotbackupIpForSetting(req);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
  public async getAllAvailableHotBackupIp(req: IFilteredRequest<IBackup>,res: any,next: NextFunction){
    try {
      const requestResult = await backupServicesV1.getAllAvailableHotBackupIp(req);
      return res.send(requestResult);
    } catch (error) {
      return res.send(null);
    }
  }
}
export const backupControllerV1 = new BackupControllerV1();
