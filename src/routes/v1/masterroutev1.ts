import { globalControllerV1 } from "./../../controllers/v1/global/globalcontroller";
import express, { NextFunction, request, Request, Response } from "express";
import { BaseRoutes } from "../baseroutes";
import { encoderControllerV1 } from "../../controllers/v1/encoder/encodercontrollerv1";
import { ellvisControllerV1 } from "../../controllers/v1/ellvis/ellviscontrollerv1";
import { customerControllerV1 } from "../../controllers/v1/customer/customercontrollerv1";
import cores from "cors";
import path from "path";
import { backupControllerV1 } from "../../controllers/v1/backup/backupcontorllerv1";

import { deviceTypeControlleV1 } from "../../controllers/v1/device/deviceType";
import { validateLicense, validateLicensetest } from "../../utils/responsehandlerutil";
import { AutomatedWorkFlowForOnBoardingDevice } from "../../services/v1/global/automatedWorkflowForOnboardingDevice";
import { ResponseType } from "axios";
import { customerLoginModel } from "../../models/customer/login.model";

const jwt = require('jsonwebtoken');
class MasterRouteV1 extends BaseRoutes {
  public path = "/";

  constructor() {
    super();
    this._configure();
  }

  /**
   * @description Connect routes to their matching controller endpoints.
   */
  private _configure() {
    this.router.use(cores());
    // this.router.get('/run-process',
    // (req: Request, res: Response, next: NextFunction) => {
    //   this._controller.RunProcess(req, res, next);
    // });
    // this.router.get("/", (req: Request, res: Response, next: NextFunction) => {
    //   res.send("server running");
    // });

    this.router.use(express.static(path.join(__dirname, "../../../build")));
    this.router.use(this.verifyToken)

    this.router.get('/', (req, res, next) => {
      res.sendFile(path.join(__dirname, "../../../build", "index.html"))
    })

    this.router.get("/runprocess", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.RunProcess(req, res, next);
    });

    this.router.get("/sendmailtoall", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.SendMailToAll(req, res, next);
    });

    this.router.get("/getdeviceobject", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.getdeviceobject(req, res, next);
    });

    this.router.get("/getbackendversion", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.getbackendversion(req, res, next);
    });

    this.router.post("/testmail", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.TestMail(req, res, next);
    });

    this.router.post("/getencoderproperties", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.GetEncoderProperties(req, res, next);
    });

    this.router.post("/getencoderstatus", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.GetEncoderStatus(req, res, next);
    });

    this.router.post("/updatefirmwaremultiple", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.UpdateFirmware(req, res, next);
    });
    this.router.post("/updatePresetFileOnDeviceIP", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.updatePresetFileOnDeviceIP(req, res, next);
    });

    this.router.post("/updatefirmwarebyuploadedfile", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.UpdateFirmwareByUploadedFile(req, res, next);
    });
    this.router.post("/updatejsonPresetbyuploadedfile", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.UpdateJsonAsPresetByUploadedFile(req, res, next);
    });

    this.router.post("/savefirmwarefilebydevicetype", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.SaveFirmwareFile(req, res, next);
    });
    this.router.post("/savePresetfilebydevicetype", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.SavePresetFile(req, res, next);
    });
    this.router.post("/updatefirmareforsingleip", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.UpdateSingleDeviceByIp(req, res, next);
    });

    this.router.post("/getfirmwarefilesbydevicetype", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.GetFirmwareFilesByDeviceType(req, res, next);
    });
    this.router.post("/getPresetfilesbydevicetype", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.GetPresetFilesByDeviceType(req, res, next);
    });

    this.router.post("/onbordingdevice", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.StoreEncoderInTemPool(req.connection.remoteAddress, req, res, next);
    });

    this.router.post('/getuserdatabyusername', (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetUserDatabyUsername(req, res, next);
    });

    this.router.put('/updateuserdata', (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.UpdateUserData(req, res, next)
    });

    this.router.post('/UpdateProfilePhoto', (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.UpdateProfilePhoto(req, res, next)
    });

    this.router.post('/verifyPassword', (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.verifyPassword(req, res, next)
    });

    this.router.post("/linkeffandlostpackets", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.GetLinkEfficiencyAndDropPercentage(req, res, next);
    });

    this.router.post("/refreshellvis", async (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.SaveContainersAndStatsByDeviceIP(req, res, next);
    });

    this.router.post("/refreshstream", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.SavePropertiesAndStatus(req, res, next);
    });

    this.router.post("/setellvispassword", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.SetEllvisPassword(req, res, next);
    });

    this.router.post("/setencoderpassword", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.SetEncoderPassword(req, res, next);
    });

    this.router.post("/setstreampassword", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.SetStreamPassword(req, res, next);
    });

    this.router.post("/startencoding", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.StartEncoding(req, res, next);
    });

    this.router.post("/startencodingmultiple", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.StartEncodingMultiple(req, res, next);
    });

    this.router.post("/stopencoding", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.StopEncoding(req, res, next);
    });

    this.router.post("/stopencodingmultiple", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.StopEncodingMultiple(req, res, next);
    });

    this.router.post("/setdevicename", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.SetDeviceName(req, res, next);
    });

    this.router.post("/loadpreset", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.LoadPreset(req, res, next);
    });

    this.router.post("/updatepresets", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.UpdatePreset(req, res, next);
    });

    this.router.post("/requestlogin", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.RequestLogin(req, res, next);
    });

    this.router.post("/setloginproperties", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.SetLoginProperties(req, res, next);
    });

    this.router.post("/setlcdloginproperties", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.SetLcdLoginProperties(req, res, next);
    });

    this.router.post("/requestlogout", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.RequestLogout(req, res, next);
    });

    this.router.post("/devicereboot", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.RebootDevice(req, res, next);
    });

    this.router.post("/savesession", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.SaveSession(req, res, next);
    });

    this.router.post("/checkPort", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.checkPort(req, res, next);
    });

    this.router.post("/checkIRcode", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.checkIRcode(req, res, next);
    });

    this.router.post("/savemultiplesession", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.SaveMultipleSession(
        req,
        req.body.ipArray,
        res,
        next
      );
    }
    );

    this.router.post("/changeipaddresses", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.ChangeIpAddresses(req, res, next);
    });

    this.router.post("/refreshstreambyid", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.GetStreamStatsbyId(req, res, next);
    });

    this.router.post("/getdevicesbysystem", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.GetDevicesBySystem(req, res, next);
    });

    this.router.post("/getdevices", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.GetDevicesByCustomerID(req, res, next);
    });

    this.router.post("/login", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.Login(req, res, next);
    });

    this.router.post("/getversionlicensing", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.GetVersionLicensingInfo(req, res, next);
    });

    this.router.post("/getnetworksettings", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.GetNetworkSettings(req, res, next);
    });

    this.router.post("/changepassword", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.EllvisChangePassword(req, res, next);
    });

    this.router.post("/getallcontainers", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.GetAllContainers(req, res, next);
    });

    this.router.post("/createcontainer", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.CreateContainer(req, res, next);
    });

    this.router.post("/deletecontainer", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.DeleteContainer(req, res, next);
    });

    this.router.post("/startcontainer", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.StartContainer(req, res, next);
    });

    this.router.post("/stopcontainer", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.StopContainer(req, res, next);
    });

    this.router.post("/exportpresets", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.ExportPresets(req, res, next);
    });

    this.router.post("/importpresets", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.ImportPresets(req, res, next);
    });

    this.router.post("/uploadpresetstbd", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.UploadPresetsTBD(req, res, next);
    });

    this.router.post("/downloadpresetstbd", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.DownloadPresetsTBD(req, res, next);
    });

    this.router.post("/clearpresetstbd", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.ClearPresetsTBD(req, res, next);
    });

    this.router.post("/shutdownsystem", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.ShutdownSystem(req, res, next);
    });

    this.router.post("/rebootsystem", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.RebootSystem(req, res, next);
    });

    this.router.post("/updatesystemtbd", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.UpdateSystemTBD(req, res, next);
    });

    this.router.post("/updatessltbd", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.UpdateSSLTBD(req, res, next);
    });

    this.router.post("/resetsystem", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.ResetSystem(req, res, next);
    });

    this.router.post("/enabledisablessh", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.EnableDisableSSH(req, res, next);
    });

    this.router.post("/getdevicestreamstats", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.GetConnectedDeviceStreamStats(req, res, next);
    });

    this.router.post("/getalarmlist", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.GetAlarmList(req, res, next);
    });

    this.router.post("/setHotBackupForEllvis", (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.SetHotBackupForEllvis(req, res, next);
    });

    this.router.get("/getcron", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.GetCron(req, res, next);
    });

    this.router.post("/savecron", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.SaveCron(req, res, next);
    });

    this.router.get("/getSnmpDetails", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.getSnmpDetails(req, res, next);
    });

    this.router.post("/saveSnmpDetails", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.saveSnmpDetails(req, res, next);
    });

    this.router.get("/sendDefaultSNMPTrap", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.sendDefaultSNMPTrap(req, res, next);
    });

    this.router.get("/downloadMIBFile", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.downloadMIBFile(req, res, next);
    });

    // Customer Routes
    this.router.post("/saveregistration", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CustomerRegistration(req, res, next);
    });

    this.router.post("/logincustomer", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CustomerLogin(req, res, next);
    });

    this.router.post("/getgraphdata", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.GetGraphData(req, res, next);
    });

    this.router.post("/logoutcustomer", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CustomerLogout(req, res, next);
    });

    this.router.post("/refreshlegacy", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.RefreshLegacy(req, res, next);
    });

    this.router.post("/createdevice", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CreateDevice(req, res, next);
    });

    this.router.post("/saveManagementIP", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.saveManagementIP(req, res, next);
    });

    this.router.post("/getalldevices", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetAllDevices(req, res, next);
    });

    this.router.get("/getallonboardingdevices", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetAllOnBoardDevices(req, res, next);
    });

    this.router.post("/getallencoders", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetAllEncoders(req, res, next);
    });

    this.router.post("/getallusers", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetAllUsers(req, res, next);
    });

    this.router.post("/deleteuser", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.DeleteUser(req, res, next);
    });

    this.router.post("/deletedevice", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.DeleteDevice(req, res, next);
    });

    this.router.post("/checkSystemForDevices", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.DeleteMultipleDevice(req, res, next);
    });

    // Region Routes
    this.router.post("/createregion", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CreateRegion(req, res, next);
    });

    this.router.post("/getallregions", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetAllRegion(req, res, next);
    });

    this.router.post("/deleteregion", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.DeleteRegion(req, res, next);
    });

    // System Routes
    this.router.post("/createsystem", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CreateSystem(req, res, next);
    });

    this.router.post("/getallsystems", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetAllSystems(req, res, next);
    });

    this.router.post("/checksession", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CheckSession(req, res, next);
    });

    this.router.post("/deletesystem", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.DeleteSystem(req, res, next);
    });

    //SMTP Details
    this.router.post("/getsmtpdetails", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetSMTPDetails(req, res, next);
    });

    this.router.post("/savesmtpdetails", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.SaveSMTPDetails(req, res, next);
    });

    this.router.post("/gettimezone", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.gettimezone(req, res, next);
    });

    this.router.post("/settimezone", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.settimezone(req, res, next);
    });

    this.router.post("/getcurrenttimezone", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.getcurrenttimezone(req, res, next);
    });

    this.router.post("/checksmtpdetails", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CheckSMTPDetails(req, res, next);
    });

    //HttpHttps Details
    this.router.post("/savesettingdetails", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.SaveSettingDetails(req, res, next);
    });

    this.router.post("/checksettingdetails", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CheckSettingDetails(req, res, next);
    });

    //techversions
    this.router.post("/saveversions", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.SaveVersions(req, res, next);
    });

    this.router.post("/checkversions", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CheckVersions(req, res, next);
    });

    this.router.post("/savehistory", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.SaveHistory(req, res, next);
    });

    this.router.get("/savehistorycron", (req: Request, res: Response, next: NextFunction) => {
      globalControllerV1.SaveHistoryCron(req, res, next);
    });

    this.router.post("/getalarmreport", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetAlarmReport(req, res, next);
    });

    this.router.post("/getuserreport", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetUserReport(req, res, next);
    });

    this.router.post("/getuserreportexport", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetUserReportExport(req, res, next);
    });

    this.router.post("/getdevicereport", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetDeviceReport(req, res, next);
    });

    this.router.post("/getsearchdetails", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetSearchDetails(req, res, next);
    });

    this.router.post("/getusersearchdetails", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetUserSearchDetails(req, res, next);
    });

    this.router.post("/getdevicereportsearchdetails", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetDeviceReportSearchDetails(req, res, next);
    });

    //majoralarm
    this.router.post("/savemajoralarm", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.SaveMajorAlarm(req, res, next);
    });

    this.router.post("/checkmajoralarm", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CheckMajorAlarm(req, res, next);
    });

    this.router.post("/checklicensenumber", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.CheckLicenseNumber(req, res, next);
    });

    this.router.post("/getdevicecsv", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.GetDeviceCSV(req, res, next);
    });

    this.router.post("/purgeData", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.purgeData(req, res, next);
    });

    this.router.post("/purgeDataUser", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.purgeDataUser(req, res, next);
    });

    this.router.post("/purgeDataUserLogout", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.purgeDataUserLogout(req, res, next);
    });

    this.router.post("/purgeDataAlarm", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.purgeDataAlarm(req, res, next);
    });

    this.router.post("/purgeDataAlarmCleared", (req: Request, res: Response, next: NextFunction) => {
      customerControllerV1.purgeDataAlarmCleared(req, res, next);
    });

    this.router.post('/getfirmwarefilesbydevicename', (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.GetFirmwareFilesByDeviceName(req, res, next);
    });

    this.router.post("/updatefirmwareforsingledevice", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.updatefirmwareforsingledevice(req, res, next);
    });

    this.router.post("/deletefirmwarefilebydevicetype", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.deleteFirmwareFileBydeviceType(req, res, next);
    });

    this.router.post("/deletePresetfilebydevicetype", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.deletePresetfilebydevicetype(req, res, next);
    });

    this.router.post("/savebackuplocation", (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.saveBackupLocation(req, res, next);
    });

    this.router.post("/getbackuplocation", (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.getBackupLocation(req, res, next);
    });

    this.router.post("/savebackupnow", (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.uploadBackupNow(req, res, next);
    });

    this.router.post("/listallbackups", (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.listAllBackups(req, res, next);
    });

    this.router.post('/restore', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.restoreLocal(req, res, next);
    })

    this.router.post('/restoreremote', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.restoreRemote(req, res, next);
    })

    this.router.post('/listlocalbackups', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.listLocalBackups(req, res, next);

    })

    this.router.get('/downloadbackup/:foldername', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.downloadBackup(req, res, next);
    })

    this.router.post('/savedailycron', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.savedailycron(req, res, next);
    })

    this.router.post('/saveweeklycron', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.saveWeeklyCron(req, res, next);
    })

    this.router.post('/uploadbackup', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.uploadBackupFiles(req, res, next);
    })

    this.router.post('/bacupIpList', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.saveacBkupIpList(req, res, next);

    })
    this.router.post('/deleteAvailableIp', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.deleteBkupIpList(req, res, next);
    })

    this.router.post('/getAllHotBackupIp', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.getAllHotbackupIp(req, res, next);
    })

    this.router.get('/getAllHotBackupIp', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.getAllHotbackupIpForSetting(req, res, next);
    })

    this.router.get('/getAllAvailableHotBackupIp', (req: Request, res: Response, next: NextFunction) => {
      backupControllerV1.getAllAvailableHotBackupIp(req, res, next);
    })

    this.router.get('/getlicenses', (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.getLicenses(req, res, next);
    })

    this.router.get('/checkkeylok', (req: Request, res: Response, next: NextFunction) => {
      ellvisControllerV1.chekKeylok(req, res, next);
    })

    this.router.post('/setautomatedworkflow', (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.setautomatedworkflow(req, res, next);
    })

    this.router.post('/sethotbackup', (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.setHotBackup(req, res, next);
    })

    this.router.post('/deleteWarningMessages', (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.deleteWarningMessage(req, res, next);
    })

    this.router.post('/svaeSpareUnitIpForEnc', (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.saveSpareUnitIp(req, res, next);
    })

    this.router.post('/editSpareIpForEnc', (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.editSpareIpForEnc(req, res, next);
    })

    this.router.post('/deleteSpareIp', (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.deleteSpareIp(req, res, next);
    })

    this.router.post('/deleteSpareIpForSettings', (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.deleteSpareIpForSettings(req, res, next);
    })

    this.router.post('/devicetype', (req: Request, res: Response, next: NextFunction) => {
      deviceTypeControlleV1.add(req, res, next);
    })

    this.router.get('/devicetype', (req: Request, res: Response, next: NextFunction) => {
      deviceTypeControlleV1.getAll(req, res, next);
    })

    this.router.put('/devicetype', (req: Request, res: Response, next: NextFunction) => {
      deviceTypeControlleV1.modify(req, res, next);
    })

    this.router.post('/devicetypedelete', (req: Request, res: Response, next: NextFunction) => {
      deviceTypeControlleV1.delete(req, res, next);
    })

    this.router.post('/createupdaterules', (req: Request, res: Response) => {
      AutomatedWorkFlowForOnBoardingDevice.createUpdateRules(req, res);
    })

    this.router.post('/getautouploadjsonrules', (req: Request, res: Response) => {
      AutomatedWorkFlowForOnBoardingDevice.getAutoUploadJSONrules(req, res);
    })

    this.router.get('/getallselectedrules', (req: Request, res: Response) => {
      AutomatedWorkFlowForOnBoardingDevice.getAllSelectRules(req, res);
    })

    this.router.post('/deleteselectrules', (req: Request, res: Response) => {
      AutomatedWorkFlowForOnBoardingDevice.deleteSelectRules(req, res);
    })

    this.router.post("/upgrade_status/:id", (req: Request, res: Response) => {
      encoderControllerV1.FirmwareUpgradeStatus(req, res);
    });

    this.router.get("/filelocation/:id", (req: Request, res: Response) => {
      encoderControllerV1.firmwareFileLocation(req, res);
    });

    this.router.get("/getfirmwareupgradestatus", (req: Request, res: Response) => {
      encoderControllerV1.GetFirmwareUpgradeStatus(req, res);
    });
    
    this.router.post("/savelicensefile", (req: Request, res: Response, next: NextFunction) => {
      encoderControllerV1.SaveLicenseFile(req, res, next);
    });

  }

  private async verifyToken(req: any, res: any, next: NextFunction) {
    try {
      // let routes = ["/", "/logincustomer", "/logoutcustomer", "/api/v1/logincustomer", "/api/v1/logoutcustomer", "/checkkeylok", "/api/v1/checkkeylok", "/favicon.ico"]
      // if (routes.includes(req.path) || req.path.includes("/api-docs/swagger")) {
      //   return next();
      // }
      if (req.path == '/' || req.path == '/logincustomer' || req.path == '/logoutcustomer' ||
        req.path == '/api/v1/logincustomer' || req.path == '/api/v1/logoutcustomer' ||
        req.path == "/checkkeylok" || req.path == "/api/v1/checkkeylok" || req.path.includes('upgrade_status')
        || req.path.includes('filelocation')
      ) { return next(); }

      let token = req.headers.authorization.split(' ')[0] === 'Bearer' ? req.headers.authorization.split(' ')[1] : req.headers.authorization;
      if (token) {
        let isValid = await jwt.verify(token, 'jwtAccessTokenSecret', async function (err: any, decode: any) {
          if (!err) {
            let validateUserSession = await customerLoginModel.findOne({ Username: decode?.username, Session: decode?.session })
            return validateUserSession && validateUserSession.Session;
          }
          return err ? false : true
        })
        if (isValid) return next();
        else return res.status(401).send({ ack: 5, msg: "Session expired, please login again" })
      }
      return res.status(401).send({ ack: 5, msg: "Session expired, please login again" })
    }
    catch (err) {
      return res.status(401).send({ ack: 5, msg: "Session expired, please login again" })
    }
  }
}

export const masterRouteV1 = new MasterRouteV1();
