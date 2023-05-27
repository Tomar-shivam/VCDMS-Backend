import { globalServicesV1 } from "./services/v1/global/globalservices";
import express, { Request, Response, NextFunction } from "express";
import fileUpload from "express-fileupload";
import * as bodyParser from "body-parser";
import "reflect-metadata";
import * as swagger from "swagger-express-ts";
import { SwaggerDefinitionConstant } from "swagger-express-ts";
import { appAPI } from "./routes/apiroutes";
import mongoose from "mongoose";
import { secretUtil } from "./utils/secretutil";
import * as cron from "node-cron";
import { globalControllerV1 } from "./controllers/v1/global/globalcontroller";
import { CurrentTimeZones } from "./models/customer/currenttimezones";
import { customerServicesV1 } from "./services/v1/customer/customerservicesv1";
import { validateLicense } from "./utils/responsehandlerutil";
var CronJobManager = require("cron-job-manager");
import cors from 'cors';
import fs from 'fs'
import { licenseCheckModel } from "./models/licensemodel";
import { customerDeviceModel } from "./models/ellvis/customerdevice.model";
const key = 'RCClicence';
const { exec } = require("child_process");
const fsRead = require('fs/promises');
import crypto from 'crypto';
import {
  userLoginReportingModel,
} from "./models/reporting/userlogins";
/**
 * @description Express server application class.
 */
class App {
  public Manager = new CronJobManager();
  public server = express();

  private Scheduler: any = cron.schedule(`*/5 * * * * *`, function () {
    console.log("Initial cron");
  });

  private SaveHistory: any = cron.schedule(`*/5 * * * * *`, function () {
    console.log("Initial cron");
  });

  private logoutUser: any = cron.schedule(`59 59 23 * * * `, async function () {
    // function for logout all user after 24 hr
    let logoutUsers: any = await userLoginReportingModel.find({ LogoutTime: { $eq: undefined } })
    if (logoutUsers) {
      for (let i = 0; i < logoutUsers.length; i++) {
        let req: any = { Username: logoutUsers[i].Username }
        customerServicesV1.CustomerLogout(req)
      }
    }
  });

  private saveLicenseModel = async () => {
    // let keyValue: any = await validateLicense("check-key").catch(err => console.log(err));
    // let keyCount: any = await validateLicense("check-license").catch((err) => { console.log(err) });
    // let totalLicense: any = await licenseCheckModel.find({});
    this.checkLicence();
  }

  private checkLicence = async () => {
    try {
      let filePath = `/home/${await this.getCurrentUser()}/radiantlicense/VCDMS-license.txt`
      let checkFirmwareFile = fs.existsSync(filePath)
      if (!checkFirmwareFile) {
        await licenseCheckModel.deleteMany({})
        let saveLicence = new licenseCheckModel();
        saveLicence.Slug = "0"
        saveLicence.SlugStatus = "0"
        saveLicence.Msg = "LicenseNotFound"
        await saveLicence.save()
        return;
      }
      const licenceData = await fsRead.readFile(filePath, { encoding: 'utf8' });
      let dec = await this.DecryptingID(licenceData.split("\n")[0])
      let decryptedData = dec.split("_")
      let vmUniqueId = await fsRead.readFile("/etc/machine-id", { encoding: 'utf8' });

      let cmd = 'echo $(cat /sys/class/net/en*/address) | head -1'
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          this.checkMacAddress('', decryptedData, vmUniqueId.split('\n')[0])
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          this.checkMacAddress('', decryptedData, vmUniqueId.split('\n')[0])
          return;
        }
        this.checkMacAddress(stdout.slice(0, 17), decryptedData, vmUniqueId.split('\n')[0])
        // call function for checking mac address
      });
    } catch (error) {
      console.log(error);
    }
  }

  public getCurrentUser = async () => {
    let currentUser = process.env.USER;
    console.log("user=:" + currentUser);

    if (currentUser == 'root') {
      currentUser = process.env.SUDO_USER;
      console.log("SUDO user=:" + currentUser);
    }
    return currentUser;
  }

  public checkMacAddress = async (macAddress, data, vmUniqueId) => {
    try {
      let saveLicence = new licenseCheckModel();
      if (macAddress.trim() == data[0].trim() || data[0].trim() == vmUniqueId.trim()) {
        // check expiry date
        const currentDate = new Date().toISOString().slice(0, 10)
        if (currentDate > data[3]) {
          //licence expire
          await licenseCheckModel.deleteMany({})
          saveLicence.Slug = '0'
          saveLicence.SlugStatus = '0'
          saveLicence.Msg = 'licenseExpire'
          await saveLicence.save()
        } else {
          // licence working
          let checkLicence = await licenseCheckModel.find({})
          let deviceList = await customerDeviceModel.find({});
          if (checkLicence.length > 0) {
            // update
            await licenseCheckModel.deleteMany({})
            saveLicence.Slug = data[1]
            saveLicence.SlugStatus = data[1]
            saveLicence.StartDate = data[2]
            saveLicence.EndDate = data[3]
            if (deviceList.length > parseInt(data[1]))
              saveLicence.DueDate = checkLicence[0].DueDate ? checkLicence[0].DueDate : (new Date()).getDate().toString();
            await saveLicence.save()
          }
          else {
            saveLicence.Slug = data[1]
            saveLicence.SlugStatus = data[1]
            saveLicence.StartDate = data[2]
            saveLicence.EndDate = data[3]
            if (deviceList.length > parseInt(data[1]))
              saveLicence.DueDate = (new Date()).getDate().toString();
            await saveLicence.save()
          }
        }
      } else {
        // invalid licence file
        await licenseCheckModel.deleteMany({})
        saveLicence.Slug = "0"
        saveLicence.SlugStatus = '0'
        saveLicence.Msg = 'invalidMacAddress'
        await saveLicence.save()
      }
    } catch (error) {
      console.log(error);
    }
  }

  public DecryptingID = async (id) => {
    var decipher = crypto.createDecipher('aes256', key);
    var decrypted = decipher.update(id, 'hex', 'utf8') + decipher.final('utf8');
    return decrypted;
  }
  
  public TimeZoneSave = async () => {
    // console.log("Daily Timezone cron");
    let daylight = {
      EDT: {
        offset: -4,
        label: "Eastern Time",
      },
      CDT: {
        offset: -5,
        label: "Central Time",
      },
      MDT: {
        offset: -6,
        label: "Mountain Time",
      },
      PDT: {
        offset: -7,
        label: "Pacific Time",
      },
      AKDT: {
        offset: -8,
        label: "Alaska Time",
      },
      HDT: {
        offset: -10,
        label: "Hawaii Time",
      },
    };
    let standard = {
      EST: {
        offset: -5,
        label: "Eastern Time",
      },
      CST: {
        offset: -6,
        label: "Central Time",
      },
      MST: {
        offset: -7,
        label: "Mountain Time",
      },
      PST: {
        offset: -8,
        label: "Pacific Time",
      },
      AKST: {
        offset: -9,
        label: "Alaska Time",
      },
      HST: {
        offset: -10,
        label: "Hawaii Time",
      },
    };

    // let datetoday = new Date();
    let datetoday = new Date();
    var strmar = "2021/3/14";
    var strnov = "2021/11/7";

    let marDate = new Date(strmar);
    let novDate = new Date(strnov);

    let marmonth = marDate.getMonth();
    let novmonth = novDate.getMonth();
    let todaymonth = datetoday.getMonth();
    let marDay = marDate.getDate();
    let novDay = novDate.getDate();
    let todayDay = datetoday.getDate();

    var timezonedefault = await CurrentTimeZones.find({});
    if (timezonedefault.length === 0) {
      let model = new CurrentTimeZones();
      if (marmonth < todaymonth && novmonth > todaymonth) {
        model.Timezone = daylight;
      } else if (marmonth === todaymonth) {
        if (todayDay < marDay) {
          model.Timezone = standard;
        } else {
          model.Timezone = daylight;
        }
      } else if (novmonth === todaymonth) {
        if (todayDay > novDay) {
          model.Timezone = standard;
        } else {
          model.Timezone = daylight;
        }
      } else {
        model.Timezone = standard;
      }
      model.save();
    } else {
      if (marmonth < todaymonth && novmonth > todaymonth) {
        var Report = await CurrentTimeZones.updateMany(
          {},
          { Timezone: daylight }
        );
      } else if (marmonth === todaymonth) {
        if (todayDay < marDay) {
          var Report = await CurrentTimeZones.updateMany(
            {},
            { Timezone: standard }
          );
        } else {
          var Report = await CurrentTimeZones.updateMany(
            {},
            { Timezone: daylight }
          );
        }
      } else if (novmonth === todaymonth) {
        if (todayDay > novDay) {
          var Report = await CurrentTimeZones.updateMany(
            {},
            { Timezone: standard }
          );
        } else {
          var Report = await CurrentTimeZones.updateMany(
            {},
            { Timezone: daylight }
          );
        }
      } else {
        var Report = await CurrentTimeZones.updateMany(
          {},
          { Timezone: standard }
        );
      }
      return Report;
    }
  }

  constructor() {
    // Schedule tasks to be run on the server.
    try {
      this.initMiddlewares();
      this.defineRoutes();
      this.MongoosConnect();
      this.saveLicenseModel();
      cron.schedule(`*/20 * * * * *`, () => {
        // console.log(`Running send mail in every 20 seconds`);
        globalServicesV1.SendMailToAll();
      });
      cron.schedule(`*/120 * * * * *`, () => {
        // console.log(`Running save time zone daily`);
        this.TimeZoneSave();
      });

      cron.schedule(`*/1 * * * *`, async () => {
        this.saveLicenseModel();
      });
    } catch (error) {
      return
    }
  }
  private initMiddlewares(): void {
    try {
      this.server.use(cors())
      this.server.use(fileUpload());

      this.server.use("/api-docs/swagger", express.static("swagger"));
      this.server.use(
        "/api-docs/swagger/assets",
        express.static("node_modules/swagger-ui-dist")
      );
      this.server.use(bodyParser.json({ limit: "10mb" }));
      this.server.use(
        swagger.express({
          definition: {
            info: {
              title: "VCDMS APIs",
              version: "1.0",
            },
            securityDefinitions: {
              apiKeyHeader: {
                type: SwaggerDefinitionConstant.Security.Type.API_KEY,
                in: SwaggerDefinitionConstant.Security.In.HEADER,
                name: "Authorization",
              },
            },
          },
        })
      );
      this.server.use(appAPI.appPath, appAPI.routerinstance);
    } catch (error) {
      return;
    }
  }

  public StartCron(time: any) {
    this.Scheduler.stop();
    this.SaveHistory.stop();
    globalControllerV1.RunProcessCron();
    this.Scheduler = cron.schedule(`*/${time.CronTime} * * * *`, function () {
      globalControllerV1.RunProcessCron();
    });

    globalServicesV1.SaveHistoryCron();
    this.SaveHistory = cron.schedule(`*/${time.SaveHistory} * * * *`, () => {
      globalServicesV1.SaveHistoryCron();
    });
  }

  private MongoosConnect() {
    try {
      var ip = secretUtil.MONGODB_SERVER;
      var dbName = secretUtil.MONGODB_DBNAME as string;
      //var user_name = secretUtil.MONGODB_USERNAME as string;
      //var pass = secretUtil.MONGODB_PASSWORD as string;

      // var conn =
      //   "mongodb://" +
      //   ip +
      //   ":27017/" +
      //   dbName +
      //   "?username=" +
      //   user_name +
      //   "&password=" +
      //   pass;

      var conn =
        "mongodb://" +
        ip +
        ":27017/" +
        dbName;

      mongoose
        .connect(conn, { useNewUrlParser: true, useUnifiedTopology: true }) // if error it will throw async error
        .then(async () => {
          // if all is ok we will be here
          let useDb = mongoose.connection.useDb(dbName);
          while (useDb.readyState !== 1) {
            continue;
          }
          console.log("> MongoDB connected - " + ip);

          let requestResult = await globalServicesV1.GetCron();
          if (requestResult) {
            if (requestResult.Cron)
              this.StartCron(requestResult.Cron);
            else {
              this.StartCron({ CronTime: "5", SendMail: "10", SaveHistory: "10" });
            }
          }
          let timezone = await customerServicesV1.getcurrenttimezone();
          let backupSchedule = await globalServicesV1.StartBackupCron();

          // loggerUtil.error('> MongoDB connected - '+ip);
        })
        .catch((err) => {
          // we will not be here...
          console.error(
            "> MongoDB connection error........." + " " + ip + " " + err.stack
          );
          // loggerUtil.error('> MongoDB connection error.........'+err.stack);
          process.exit(1);
        });
    } catch (error) {
      return;
    }
  }

  private defineRoutes(): void {
    try {
      // API Base path
      this.server.use(bodyParser.urlencoded({ extended: false }));
      this.server.use(bodyParser.json());
      this.server.use(appAPI.path, appAPI.routerinstance);

      // fallback invalid route
      this.server.use((req: Request, res: Response, next: NextFunction) => {
        res.status(404).json({
          success: false,
          message: "Invalid route",
          result: {},
          statusCode: 404,
        });
      });
    } catch (error) {
      return;
    }
  }
}

// initialize server app
const app = new App();

// export the default "App" class object "server" property
export default app;

