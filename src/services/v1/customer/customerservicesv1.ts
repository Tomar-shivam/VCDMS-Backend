import { ReqEncoderschemas } from "./../../../routes/v1/encoder/encoderschema";
import { CustomerLogin, customerLoginModel, ICustomerLogin } from "../../../models/customer/login.model";
import { CustomerDevice, customerDeviceModel, ICustomerDevice, } from "../../../models/ellvis/customerdevice.model";
import { encoderServicesV1 } from "../encoder/encoderservicesv1";
import { IRegion, Region, regionModel } from "../../../models/region/region.model";
import { ISystem, systemModel } from "../../../models/region/system.model";
import "process";
import { ContainersStreamStats, containerStreamStatsModel } from "../../../models/global/containerstreamstatsmodel";
import { ISMTP, SMTP, SMTPModel } from "../../../models/customer/smtpmodel";
import { commonUtil } from "../../../utils/commonUtil";
import { async } from "rxjs";
import { ellvisServicesV1 } from "../ellvis/ellvisservicesv1";
import { globalServicesV1 } from "../global/globalservices";
import { ISETTINGS, SETTINGS, SETTINGSModel } from "../../../models/customer/settingsmodel";
import { VERSIONS, VERSIONSModel } from "../../../models/customer/techversionmodel";
import { UserLoginReporting, userLoginReportingModel } from "../../../models/reporting/userlogins";
import { AlarmsReporting, alarmsReportingModel } from "../../../models/reporting/alarmsmodel";
import { IMAJORALARMS, MAJORALARMS, MAJORALARMSModel } from "../../../models/customer/majoralarmmodel";
import _ from "underscore";
import { DeviceReporting, deviceReportingModel, } from "../../../models/reporting/devicereportmodel";
import { liceseInfoModel } from "../../../models/global/licenseinfomodel";
import { encoderModel } from '../../../models/global/encodermodel';
import { validateLicense } from "../../../utils/responsehandlerutil";
import { TimeZone } from "../../../models/customer/timezonemodel";
import { CurrentTimeZones } from "../../../models/customer/currenttimezones";
import { secretUtil } from "../../../utils/secretutil";
import request from 'request';
import logging from "../../../logging";
import { HotbackupIpListModel } from "../../../models/backup/backupIpList";
const jwt = require('jsonwebtoken');

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
let EllvisModel = secretUtil.Ellvis;
class CustomerServicesV1 {
  public CreateCustomer = async (req: ICustomerLogin) => {
    if (req?.UserName?.trim() === '') return "Enter a valid username"
    try {
      if (req?._id !== null && req?._id !== undefined) {
        let model = {};
        var passwordupdate = await bcrypt.hash(req?.Password, 10);
        model["Username"] = req?.UserName?.trim();
        model["Password"] = passwordupdate;
        model["Role"] = req?.Role;
        model["Email"] = req?.Email?.trim();
        model["Phone"] = req?.Phone;
        model["Status"] = false;
        let x = await customerLoginModel.updateOne({ _id: req?._id }, model, {
          new: true,
        });
        commonUtil.updateUserReport(req, '');
        return "User has been updated Successfully.";
      }
      var customerLogin = await customerLoginModel.findOne({ Username: req?.UserName?.trim() }).collation({ locale: "en", strength: 2 })
      // await customerLoginModel.findOne({
      // $or: [
      //   { Username: req?.UserName?.toUpperCase() },
      //   { Username: req?.UserName?.toLowerCase() },
      // ],
      // });
      var msg = "";
      var password = "";
      var plaintextPass = req?.Password;

      if (customerLogin === null) {
        let model = new customerLoginModel();
        // generate salt to hash password
        const salt = await bcrypt.genSalt(10);
        // set user password to hashed password
        password = await bcrypt.hash(plaintextPass, salt);
        model.Username = req?.UserName?.trim();
        model.Password = password;
        model.Role = req?.Role;
        model.Email = req?.Email?.trim();
        model.Phone = req?.Phone;
        model.Status = false;
        model.save();
        commonUtil.updateUserReport(req, '');
        msg = "User has been created Successfully.";
      } else {
        msg = "User already Exist.";
      }
      return msg;
    } catch (error) {
      return "Error in user creation";
    }
  };

  public CustomerLogout = async (req: CustomerLogin) => {
    try {
      let username = req.Username;
      let userreporting = await userLoginReportingModel.findOne({
        Username: req.Username,
        LogoutTime: { $eq: undefined },
      });

      let blob: any = {
        $unset: {
          Session: 1,
        },
        multi: false,
      };
      let resp = "success";
      await customerLoginModel.updateOne(
        { Username: username },
        blob,
        { new: true },
        (err) => {
          if (err) resp = "failure";
        }
      );
      if (resp === "success") {
        if (userreporting) {
          let logout = new Date();
          let login: any = userreporting.LoginTime;
          let diff = logout.getTime() - login.getTime();
          let timeinterval = commonUtil.msToTime(diff);
          let loginBlob = {
            LoginInterval: timeinterval,
            LogoutTime: logout,
          };
          try {
            userLoginReportingModel.updateOne(
              { Username: req.Username, LogoutTime: { $eq: undefined } },
              { $set: loginBlob },
              { new: true },
              (err) => {
                if (err) return
                //in ellse Updated Login Reporting with logout time
              }
            );
          } catch (error) {
            return;
          }
        }
      }
      return {
        status: resp,
      };
    } catch (error) {
      return null;
    }
  };

  public GetCustomer = async (req?: CustomerLogin) => {
    var username: any = req?.Username;
    var plainpassword: any = req?.Password;
    var resobj = {};
    try {
      var customerLogin = await customerLoginModel.findOne({ Username: username });
      if (customerLogin == null) {
        resobj["ack"] = "0";
        resobj["msg"] = "Username not found.";
      } else {
        var validPassword = false;
        if (username == 'Superadmin') {
          //login with default password of super admin (macaddress)
          if (!validPassword && plainpassword == customerLogin.Default_password) {
            validPassword = true;
          } else { validPassword = await bcrypt.compare(plainpassword, customerLogin.Password); }
        }
        else {
          validPassword = await bcrypt.compare(plainpassword, customerLogin.Password);
        }
        if (validPassword) {
          if (customerLogin.Session === undefined || customerLogin === null) {
            resobj["ack"] = "1";
            resobj["msg"] = "success.";
            resobj["customerobj"] = customerLogin;
            let salt = await bcrypt.genSalt(10);
            resobj["session"] = await crypto.randomBytes(16).toString("base64");
            let blog = {
              Session: resobj["session"],
            };
            let jwtToken = await this.getAccessToken(username, resobj["session"])
            resobj['token'] = jwtToken;
            let model = new userLoginReportingModel();
            model.Username = username;
            model.UserID = customerLogin._id;
            model.Role = customerLogin.Role;
            model.LoginTime = new Date();
            model.save();
            let session = await new Promise((resolve, reject) => {
              customerLoginModel.updateOne({ Username: username }, blog, { new: true },
                (err) => {
                  if (err) return resolve("Error in Updation.");
                  return resolve("Updated Successfully");
                }
              );
            });
          } else {
            resobj["ack"] = "2";
            resobj["msg"] = `${username} is logged in somewhere.`;
          }
        } else {
          resobj["ack"] = "0";
          resobj["msg"] = "Incorrect Password.";
        }
      }
    } catch (ex: any) {
      resobj["ack"] = "0";
      resobj["msg"] = ex.message;
    }
    return resobj;
  };

  public getAccessToken(username: string, session: string) {
    const accessToken = jwt.sign({ username: username, session: session }, 'jwtAccessTokenSecret',
      { algorithm: "HS256", });
    return accessToken;
  }

  public GetAllDevices = async (req?: ICustomerDevice) => {
    try {
      var customerDevices = await customerDeviceModel.find({});
      return customerDevices;
    } catch (ex) {
      return null;
    }
  };
  public GetAllOnBoardDevices = async () => {
    try {
      let customerDevices: any = await customerDeviceModel.find({ Region: "OnBoardingRegion" });
      return customerDevices;
    } catch (ex) {
      return null;
    }
  };

  public GetAllEncoders = async (req?: ICustomerDevice) => {
    try {
      let allOnBoardingDevices: any = await customerDeviceModel.find({ Region: "OnBoardingRegion" });
      let ipArrOfAllOnBoardinDevices: any = [];
      for (let i = 0; i < allOnBoardingDevices.length; i++) {
        ipArrOfAllOnBoardinDevices.push(allOnBoardingDevices[i].IP);
      }
      var encoders = await encoderModel.find({ peerIP: { $nin: ipArrOfAllOnBoardinDevices } });
      return encoders;
    } catch (ex) {
      return null;
    }
  };

  public CreateDevice = async (req: ICustomerDevice) => {
    try {
      var msg: any = {};

      let checkDeviceIsexist: any = await customerDeviceModel.findOne({ IP: req.IP });
      let oldDevice: any = await customerDeviceModel.findOne({ _id: req._id });
      let checkHotbackupIpIsexist: any = await HotbackupIpListModel.findOne({ SpareIp: req.IP });
      if (checkHotbackupIpIsexist) {
        msg = { ack: '2', message: "This IP is already exist as spare IP for  Hot backup" }
        return msg;
      }
      if (req.ManagementIP) {
        let checkDeviceExist: any = await customerDeviceModel.findOne({ IP: req.ManagementIP });
        let checkMgmtExist: any = await customerDeviceModel.findOne({ ManagementIP: req.ManagementIP });
        if (checkDeviceExist || checkMgmtExist) {
          msg["message"] = "Already Exist.";
          return msg;
        }
        if (req?._id == null) {
          msg = await this.SaveDevice(req);
          if (msg.ack !== "2" && msg.ack !== "0" && req.ManagementIP) {
            let datareq: any = await customerDeviceModel.findOne({ IP: req.IP });
            let data: any = { ...req };
            data._id = datareq?._id;
          }
        } else {
          if (!checkDeviceIsexist) {
            msg = await this.UpdateDevice(req);
          } else if (checkDeviceIsexist.IP === req.IP) {
            msg = await this.UpdateDevice(req);
          } else {
            msg["message"] = "Already Exist.";
          }
        }
      } else {
        if (req?._id == null) {
          msg = checkHotbackupIpIsexist ? { ack: '2', message: "This IP is already exist as spare IP for  Hot backup" } : await this.SaveDevice(req);
        } else {
          if (!checkDeviceIsexist) {
            msg = await this.UpdateDevice(req);
          } else if (checkDeviceIsexist.IP === req.IP) {
            msg = await this.UpdateDevice(req);
          } else {
            msg["message"] = "Already Exist.";
          }
        }
      }
      if (msg.ack === "1") {
        commonUtil.updateUserReport(req, oldDevice);
        if (req.ActionType === 'Add') {
          commonUtil.updateDeviceReport(req);
        }
      }
      return msg;
    } catch (error: any) {
      msg["ack"] = "0";
      msg["message"] = error.message;
      return msg;
    }
  };

  public saveManagementIP = async (req: any) => {
    try {
      var msg: any = {};
      let duplicatedevicedata = await customerDeviceModel.find({ $or: [{ IP: req.ManagementIP }, { ManagementIP: req.ManagementIP }] });
      if ((duplicatedevicedata.length === 0)) {
        if (req.ManagementIP) {
          let res: any = await encoderServicesV1.RequestLogin(req.Password, req.ManagementIP);
          if (res && req?._id !== null && res.status != "failure") {
            if (!res.hasOwnProperty("IsEncoderNeeded") && !res.hasOwnProperty("checkForEllvis") && !res.hasOwnProperty("addAsLegacy") && res.hasOwnProperty("status") && res.status !== "failure") {
              let dataprop: any = {
                ip: req.ManagementIP,
                session: res.session.id
              }
              let propertiesData: any = await encoderServicesV1.GetPropertiesEncoder(dataprop);
              if (propertiesData && propertiesData.device && propertiesData.device.ts_ip && propertiesData.device.ts_ip === req.IP) {
                await customerDeviceModel.updateOne({ IP: req.IP }, { IsPasswordNeeded: false });
                req["modified"] = "toVL4500";
                req["session"] = {
                  id: "---"
                };
                let model = new deviceReportingModel();
                var datetime = new Date();
                model.DeviceName = propertiesData.device.devicename;
                model.DeviceType = "VL4500";
                model.DeviceIP = req.IP.trim();
                model.Region = req?.Region;
                model.ActionType = `Update(${req.DeviceName} To ${propertiesData.device.devicename})`;
                model.TimeCreated = datetime;
                model.Username = "ellvis stream";
                await model.save();
                req.DeviceName = propertiesData.device.devicename;
                await deviceReportingModel.updateMany({ DeviceIP: req.IP }, { DeviceName: propertiesData.device.devicename })
                msg = await this.UpdateDevice(req);
              } else {
                await customerDeviceModel.updateOne({ _id: req._id }, { ManagementIP: req.ManagementIP });
                msg["ack"] = "1";
                msg["message"] = "Save Successfully, but ManagementIP dosen't match with TsIP";
                return msg;

              }
            }
            else if (res.hasOwnProperty("status") && res.status === "failure") {
              let response: any = await encoderServicesV1.RequestLogin(
                req.Password,
                req.ManagementIP.trim()
              );
              if (response) {
                if (response.status === "success") {
                  let dataprop: any = {
                    ip: req.ManagementIP,

                  }
                  let propertiesData: any = encoderServicesV1.GetPropertiesEncoder(dataprop);
                  if (propertiesData && propertiesData.device && propertiesData.device.ts_ip && propertiesData.device.ts_ip == req.ManagementIP) {
                    req["modified"] = "toVL4500";
                    req["checkAdded"] = true;
                    req["session"] = response.session;
                    msg = await this.UpdateDevice(req);
                  } else {
                    msg["ack"] = "1";
                    msg["message"] = "Management Ip doesn't match with TS IP"
                    return msg;
                  }
                }
                else {
                  msg["ack"] = '0';
                  msg["message"] = "Please Check Mgmt IP or Password";
                  return msg;
                }
              }
            }
          } else {
            msg["ack"] = '0';
            msg["message"] = "Please Check Mgmt IP or Password";
            return msg;
          }
        }
      } else {
        msg["ack"] = "0";
        msg["message"] = "Device Already Exist with this Management IP";
        return msg;
      }
      if (msg.ack === "1") {
        if (req["modified"] == "toVL4500") {
          msg["modified"] = true;
          let reportData = { ...req };
          reportData.DeviceIP = req.DeviceIP;
          reportData.ActionType = "Update (" + req.ManagementIP + ")";
          commonUtil.updateDeviceReport(reportData);
        } else {
          commonUtil.updateDeviceReport(req);
        }
        commonUtil.updateUserReport(req, '');
      }
      if (!msg.ack) {
        msg["ack"] = "0";
        msg["message"] = "Please check IP";
        return msg;
      }
      return msg;
    } catch (error: any) {
      msg["ack"] = "0";
      msg["message"] = error.message;
      return msg;
    }
  };

  public SaveDevice = async (req: ICustomerDevice) => {
    try {
      var customerDevices = await customerDeviceModel.findOne({ IP: req?.IP.trim() });
      var customerDevicesLegacyMgmt = await customerDeviceModel.findOne({ LegacyIP: req?.IP.trim() });
      var msg = "";
      let ack = "0";
      if ((customerDevices === null || customerDevices === undefined) && (customerDevicesLegacyMgmt === null || customerDevicesLegacyMgmt === undefined)) {
        var model = new customerDeviceModel();
        model.IP = req?.IP.trim();
        model.DeviceName = req?.DeviceName?.trim();
        model.DeviceType = req?.DeviceType;
        model.ManagementIP = req?.ManagementIP;
        model.RegionID = req?.RegionID;
        model.Region = req?.Region;
        model.SystemID = req?.SystemID;
        model.Password = req?.Password;
        let isVerified = true;
        if (
          model.DeviceType === EllvisModel &&
          model.Password &&
          model.Password !== ""
        ) {
          let response = await ellvisServicesV1.VerifyPassword(
            model.IP,
            model.Password
          );
          if (response) {
            if (response.accessToken) {
              isVerified = true;
              model.AuthToken = response.accessToken;
              model.IsCorrect = true;
              model.IsPasswordNeeded = false;
              req.AuthToken = response.accessToken;
              req.IsCorrect = true;
              req.IsPasswordNeeded = false;
              ack = "1";
            }
            else if (response.IsLegacy) {
              isVerified = true;
              ack = "1";
              model.DeviceType = "LEGACY"
            } else if (response.DonotAdd) {
              ack = "2"
              msg = "Unknown device, please check device type and IP address.";
              return { ack: ack, message: msg };
            }
            else if (response.Password === false) {
              isVerified = false;
              return { ack: "2", message: "Password is incorrect" }
            }
          }
        } else if (
          model.DeviceType !== "LEGACY"
        ) {
          let response: any = await encoderServicesV1.RequestLogin(
            model.Password,
            model.IP
          );
          if (response) {
            if (response.status === "success") {
              if (response.session.id === "---") {
                isVerified = true;
                model.IsCorrect = true;
                model.IsPasswordNeeded = false;
                req.IsCorrect = true;
                req.IsPasswordNeeded = false;
                ack = "1";
              } else {
                isVerified = true;
                model.IsCorrect = true;
                model.IsPasswordNeeded = false;
                model.AuthToken = response.session.id;
                req.IsCorrect = true;
                req.AuthToken = response.session.id;
                ack = "1";
              }
            }
            else if (response.status === "failure") {
              isVerified = true;
              model.IsCorrect = true;
              model.IsPasswordNeeded = true;
              model.AuthToken = "";
              req.IsCorrect = true;
              req.IsPasswordNeeded = true;
              req.AuthToken = "";
              ack = "1";
            }
            else if (response.addAsLegacy) {
              model.DeviceType = "LEGACY"
            } else if (response.checkForEllvis) {
              return { ack: "2", message: "Unknown device, please check device type and IP address." }
            } else {
              isVerified = false;
            }
          } else {
            isVerified = false;
          }
        }
        if (req.DeviceType === "LEGACY") {
          ack = "1";
        }
        if (isVerified) {
          let isExistDevice = await customerDeviceModel.findOne({ IP: req?.IP.trim() });
          if (!isExistDevice) {
            await model.save();
          }

          containerStreamStatsModel.updateMany(
            { peerIP: { $regex: model.IP } },
            {
              Password: req.Password,
              IsCorrect: true,
              IsPasswordNeeded: false,
              AuthToken: req.AuthToken,
            },
            { new: true },
            (err) => {
              if (err) console.log(err);
            }
          );
          ack = "1";
          msg = "Added Successfully";
        } else {
          msg = "Password is incorrect";
        }

        if (isVerified) {
          if (
            model.DeviceType !== EllvisModel &&
            model.DeviceType !== "LEGACY"
          ) {
            this.SaveStatusInDevices(req);
            globalServicesV1.SavePropertiesAndStatus(req.IP, '');
          } else if (model.DeviceType == "LEGACY") {
            globalServicesV1.RefreshLegacy(req.IP);
          } else {
            globalServicesV1.SaveContainersAndStatsByDeviceIP(req.IP, '');
          }
        }

      } else {
        msg = "Already Exist.";
      }
      console.log("message :" + msg);
      return {
        ack: ack,
        message: msg,
      };
    } catch (error) {
      return {
        ack: "0",
        message: "Something went wrong",
      };
    }
  };

  public SaveStatusInDevices = async (req: ICustomerDevice) => {
    try {
      let newreq: any = new ReqEncoderschemas();
      newreq.ip = req.IP;
      newreq.password = req.Password;
      newreq.session = req.AuthToken;
      let status = await encoderServicesV1.GetEncoderStatus(newreq, '');
      if (status) {
        if (status.status === "success") {
          let blob = {
            $set: { status: status.devicestatus },
          };
          customerDeviceModel.updateOne(
            { IP: req.IP },
            blob,
            { new: true },
            (err) => {
              if (err) return;
              // else console.log("Successfully added status");
            }
          );
        }
      }
    } catch (error) {
      return null;
    }
  };

  public UpdateDevice = async (req) => {
    try {
      if (req?.DeviceName?.trim() === '') return { ack: '0', msg: 'Enter a valid device name' }
      var customerDevices: any = await customerDeviceModel.find({ IP: req?.IP.trim() });
      let oldSystem: any, newSystem: any;
      if (customerDevices[0].SystemID !== req?.SystemID) {
        oldSystem = await systemModel.findOne({ _id: customerDevices[0]?.SystemID });
        newSystem = await systemModel.findOne({ _id: req?.SystemID });
      }
      if (customerDevices.length === 0 || (customerDevices.length == 1 && req?._id == customerDevices[0]._id)) {
        return new Promise(async (resolve, reject) => {
          var msg = "";
          let ack = "0";
          let isVerified = true;
          let legacyIP = "";
          let blog = {
            // <-- Here
            IP: req?.IP.trim(),
            DeviceName: req?.DeviceName?.trim(),
            DeviceType: req?.DeviceType,
            ManagementIP: req?.ManagementIP,
            Region: req?.Region,
            RegionID: req?.RegionID,
            SystemID: req?.SystemID,
            Password: req?.Password,
            DeviceFrom: req?.DeviceFrom,
            Modified: req["checkAdded"],
            LegacyIP: legacyIP,
          };

          if (
            req.DeviceType === EllvisModel &&
            req.Password &&
            req.Password !== ""
          ) {
            let response = await ellvisServicesV1.VerifyPassword(
              req.IP.trim(),
              req.Password
            );
            if (response) {
              if (response.accessToken) {
                isVerified = true;
                req.AuthToken = response.accessToken;
                req.IsCorrect = true;
                req.IsPasswordNeeded = false;
                req.AuthToken = response.accessToken;
                req.IsCorrect = true;
                ack = "1";
              }
              else if (response.IsLegacy) {
                isVerified = true;
                ack = "1";
                req.DeviceType = "LEGACY";
                blog["DeviceType"] = "LEGACY";
              } else if (response.DonotAdd) {
                ack = "2"
                msg = "Unknown device, please check device type and IP address.";
                return resolve({ ack: ack, message: msg });
              }
              else if (response.Password === false) {
                isVerified = false;
                return resolve({ ack: "2", message: "Password is incorrect" })
              }
            }
          } else if (
            req.DeviceType !== "LEGACY" && (customerDevices[0].Password !== req?.Password || customerDevices[0].IP !== req?.IP)
          ) {
            let response: any = await encoderServicesV1.RequestLogin(
              req.Password,
              req.IP.trim()
            );
            if (response) {
              if (response.status === "success") {
                if (response.session.id === "---") {
                  isVerified = true;
                  req.IsCorrect = true;
                  req.IsPasswordNeeded = false;
                  req.IsCorrect = true;
                  ack = "1";
                } else {
                  isVerified = true;
                  req.IsCorrect = true;
                  req.IsPasswordNeeded = false;
                  req.AuthToken = response.session.id;
                  req.IsCorrect = true;
                  req.AuthToken = response.session.id;
                  ack = "1";
                }
              }
              else if (response.status === "failure") {
                isVerified = true;
                req.IsCorrect = true;
                req.IsPasswordNeeded = true;
                req.AuthToken = "";
                req.IsCorrect = true;
                req.IsPasswordNeeded = true;
                req.AuthToken = "";
                ack = "1";
              }
              else if (response.addAsLegacy) {
                req.DeviceType = "LEGACY"
              } else if (response.checkForEllvis) {
                return resolve({ ack: "2", message: "Unknown device, please check device type and IP address." })
              } else {
                isVerified = false;
              }
            } else {
              isVerified = false;
            }
          }
          if (req.DeviceType === "LEGACY") {
            if (req["modified"] && req["modified"] === "toVL4500" && req.session) {
              if (req?.session.id === "---") {
                isVerified = true;
                req.IsCorrect = true;
                req.IsPasswordNeeded = false;
                req.IsCorrect = true;
                ack = "1";
              } else {
                isVerified = true;
                req.IsCorrect = true;
                req.IsPasswordNeeded = false;
                req.AuthToken = req?.session.id;
                req.IsCorrect = true;
                req.AuthToken = req?.session.id;
                ack = "1";
              }
            }
            ack = "1";
          }

          if (req.DeviceType !== EllvisModel && req.DeviceType !== "LEGACY" && (customerDevices[0].Password !== req?.Password || customerDevices[0].IP !== req?.IP)) {
            this.SaveStatusInDevices(req);
            globalServicesV1.SavePropertiesAndStatus(req.IP, '');
          } else if (req.DeviceType == "LEGACY") {
            if (req["modified"] && req["modified"] === "toVL4500") {
              legacyIP = req.IP;
              req.IP = req.ManagementIP;
              req.DeviceType = "VL4500";
              req["DeviceFrom"] = "";
              req["checkAdded"] = true;
              this.SaveStatusInDevices(req);
              globalServicesV1.SavePropertiesAndStatus(req.IP, '');
            } else {
              globalServicesV1.RefreshLegacy(req.IP);
            }
          } else {
            globalServicesV1.SaveContainersAndStatsByDeviceIP(req.IP, '');
          }
          blog = {
            // <-- Here
            IP: req?.IP.trim(),
            DeviceName: req?.DeviceName?.trim(),
            DeviceType: req?.DeviceType,
            ManagementIP: req?.ManagementIP,
            Region: req?.Region,
            RegionID: req?.RegionID,
            SystemID: req?.SystemID,
            Password: req?.Password,
            DeviceFrom: req?.DeviceFrom,
            Modified: req?.checkAdded,
            LegacyIP: legacyIP,
          };
          if (isVerified) {
            let OldDevice: any = await customerDeviceModel.findOne({ _id: req._id });
            await customerDeviceModel.updateOne(
              { _id: req?._id },
              blog,
              {
                new: true,
              },
              (err) => {
                if (err) return resolve("Error in Updation.");
                return resolve({ ack: "1", message: "Updated Successfully" });
              }
            );

            if (customerDevices.length !== 0 && OldDevice) {
              if (OldDevice.IP !== req?.IP) {
                let model = new deviceReportingModel();
                var datetime = new Date();
                model.DeviceName = req?.DeviceName?.trim();
                model.DeviceType = req?.DeviceType;
                model.DeviceIP = req.IP.trim();
                model.Region = req?.Region;
                model.ActionType = `Update(${OldDevice.IP} To ${req?.IP})`;
                model.TimeCreated = datetime;
                model.Username = req.Username;
                // model.System = system.System;
                await model.save();

                let model1 = new deviceReportingModel();
                model1.DeviceName = req?.DeviceName;
                model1.DeviceType = req?.DeviceType;
                model1.DeviceIP = OldDevice.IP.trim();
                model1.Region = req?.Region;
                model1.ActionType = `Update(${OldDevice.IP} To ${req?.IP})`;
                model1.TimeCreated = datetime;
                model1.Username = req.Username;
                // model.System = system.System;
                await model1.save();
              } else {
                let model = new deviceReportingModel();
                var action = '';
                var datetime = new Date();

                if (OldDevice.DeviceName !== req?.DeviceName) action += `'${OldDevice.DeviceName}' To '${req?.DeviceName}' `;
                if (OldDevice.Region !== req?.Region) action += `${action ? ', ' : ' '}'${OldDevice.Region}' To '${req?.Region}' `
                if (OldDevice.DeviceType !== req?.DeviceType) action += `${action ? ', ' : ' '}'${OldDevice.DeviceType}' To '${req?.DeviceType}'`;
                if (customerDevices[0].SystemID !== req?.SystemID) {
                  action += `${action ? ', ' : ' '}'${oldSystem?.System}' To '${newSystem?.System}' `;
                }
                model.DeviceName = req?.DeviceName;
                model.DeviceType = req?.DeviceType;
                model.DeviceIP = req.IP.trim();
                model.Region = req?.Region;
                model.ActionType = `Update(${action})`;
                model.TimeCreated = datetime;
                model.Username = req.Username;
                await model.save();
              }
              // await deviceReportingModel.updateMany({ DeviceIP: req.IP }, { DeviceName: req?.DeviceName })
            }
            ack = "1";
          } else {
            return resolve({ ack: ack, message: "Password is incorrect" });
          }
        });
      } else {
        return {
          ack: "0",
          message: "Already Exist",
        };
      }

    } catch (error) {
      return {
        ack: "0",
        message: error,
      };
    }
  };


  public EllvisLogout = async (req) => {

    try {
      let currEllvis = await customerDeviceModel.findOne({ IP: req?.ip });
      let authToken = currEllvis ? currEllvis.AuthToken : '';
      let ssl: any = await SETTINGSModel.find({})
      if (ssl.length > 0) {
        ssl = ssl[0].HttpHttps
      }
      else {
        ssl = "http"
      }
      let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_LOGOUT;
      if (secretUtil.ENABLE_DEBUG_LOG) {
        logging.logger.info({ url: _url }, `logout ellviss, ${req.ip}`);
      }
      let options = {
        method: "POST",
        url: _url,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + authToken
        },
        strictSSL: false,
        body: JSON.stringify(req),
        timeout: 5000
      }
      let resData: any = await new Promise((resolve, reject) => {
        request(options, (err, res) => {
          if (err) return resolve(null);
          try {
            resolve(JSON.parse(res.body));
          } catch (err) {
            resolve({ message: "Internal Server Error" });
          }
        });
      });
      if (resData == 'success') {
        if (secretUtil.ENABLE_DEBUG_LOG) {
          logging.logger.info({ status: 'success' }, `Ellvis Deleted Successfully, ${req.ip}`);
        }
        // console.log("Ellvis Deleted Successfully");    
      }
    } catch (error) {
      if (secretUtil.ENABLE_DEBUG_LOG) {
        logging.logger.info({ exception: error }, `exception in logout ellviss for, ${req.ip}`);
      }
      return;
    }
  }

  public DeleteDevice = async (req: ICustomerDevice) => {
    try {

      let device = await customerDeviceModel.findOne({ _id: req?._id });
      if (device) {
        if (device.DeviceType === EllvisModel) {
          let data = {
            ip: device.IP,
            username: secretUtil.ELLVIS_USERNAME,
            password: device.Password
          }
          this.EllvisLogout(data);
          await containerStreamStatsModel.deleteMany({ deviceip: device.IP });
        }
        else {
          let encoder: any = await encoderModel.findOne({ peerIP: device.IP });
          if (encoder) {
            await HotbackupIpListModel.updateOne({ SpareIp: encoder.spareIp }, { $set: { inUse: false } });
          }
          await encoderModel.deleteOne({ peerIP: device.IP });
        }
      }
      let response = await customerDeviceModel.deleteOne({ _id: req?._id });

      commonUtil.updateUserReport(req, '');
      commonUtil.updateDeviceReport(req);
      return response;
    } catch (error) {
      return null;
    }
  };

  public DeleteMultipleDevice = async (req: ICustomerDevice) => {
    try {

      let devices: any = await customerDeviceModel.find({ Region: { $ne: "OnBoardingRegion" } });
      for (let i = 0; i < devices.length; i++) {
        let system = await systemModel.find({ _id: devices[i].SystemID });
        if (!system) {
          await customerDeviceModel.deleteMany({ IP: devices[i].IP });
        }
      }

    } catch (error) {
      return null;
    }
  };

  public CreateRegion = async (req: IRegion) => {
    try {
      var msg: any = {};
      if (req?._id == null) {
        msg = await this.SaveRegion(req);
      } else {
        msg = await this.UpdateRegion(req);
      }

      if (msg.ack === "1") {
        commonUtil.updateUserReport(req, '');
      }
      return msg.msg;
    } catch (error) {
      return "Something went wrong! Please try again";
    }
  };

  public SaveRegion = async (req: IRegion) => {
    try {
      if (req?.Region?.trim() === '') return { ack: '0', msg: "Enter a valid Region Name" }
      var customerRegion = await regionModel.findOne({ Region: req?.Region?.trim() }).collation({ locale: "en", strength: 2 })
      // var customerRegion = await regionModel.findOne({ Region: { $regex: req?.Region, $options: "i" } });
      var msg = "";
      let ack = "0";
      if (customerRegion == null) {
        var model = new regionModel();
        model.Email = req?.Email?.trim();
        model.Region = req?.Region?.trim();
        model.Contact = req?.Contact?.trim();
        model.save();
        msg = "Added Successfully";
        ack = "1";
      } else {
        msg = "Already Exist.";
      }
      return {
        msg: msg,
        ack: ack,
      };
    } catch (error) {
      return { ack: "0", msg: "Something went wrong! Please try again" };
    }
  };

  public UpdateRegion = async (req: IRegion) => {
    try {
      if (req?.Region?.trim() === '') return { ack: '0', msg: "Enter a valid Region Name" }
      // var result = await regionModel.findOne({ Region: { $regex: req?.Region, $options: "i" } });
      var result = await regionModel.findOne({ Region: req?.Region?.trim() }).collation({ locale: "en", strength: 2 })
      if (result?._id == req?._id || !result)
        return await new Promise((resolve, reject) => {
          const blog = {
            // <-- Herest
            Region: req?.Region?.trim(),
            Contact: req?.Contact?.trim(),
            Email: req?.Email?.trim(),
          };
          regionModel.updateOne(
            { _id: req?._id },
            blog,
            {
              new: true,
            },
            (err) => {
              if (err) return resolve({ ack: "0", msg: "Error in Updation." });
              return resolve({ ack: "1", msg: "Updated Successfully" });
            }
          );
        });
      else return {
        ack: '0',
        msg: 'Already Exist.'
      }
    } catch (error) {
      return { ack: "0", msg: "Something went wrong! Please try again" };
    }
  };

  public GetAllRegions = async (req?: Region) => {
    try {
      var customerDevices = await regionModel.find();
      customerDevices?.sort((a: any, b: any) => {
        return a.Region.localeCompare(b.Region);
      });
      return customerDevices;
    } catch (ex) {
      return null;
    }
  };

  public DeleteRegion = async (req: any) => {
    try {
      let response = await regionModel.deleteOne({ _id: req?._id });
      await systemModel.deleteMany({ RegionID: req?._id });
      let allData: any = await customerDeviceModel.find({ $and: [{ RegionID: req?._id }, { DeviceType: { $regex: EllvisModel } }] });
      for (let val = 0; val < allData.length; val++) {
        let req = {
          ip: allData[val].IP,
          password: allData[val].Password,
          username: secretUtil.ELLVIS_USERNAME,
        }
        ellvisServicesV1.EllvisLogout(req);
      }
      let allDevices: any = await customerDeviceModel.find({ RegionID: req?._id });
      for (let i = 0; i < allDevices.length; i++) {
        let encoder: any = await encoderModel.findOne({ peerIP: allDevices[i].IP.trim() });
        if (encoder.spareIp) {
          await HotbackupIpListModel.updateOne({ SpareIp: encoder.spareIp }, { $set: { inUse: false } });
        }
        let model = new deviceReportingModel();
        var datetime = new Date();
        model.DeviceName = allDevices[i].DeviceName;
        model.DeviceType = allDevices[i].DeviceType;
        model.DeviceIP = allDevices[i].IP.trim();
        model.Region = allDevices[i].Region;
        model.ActionType = `Delete`;
        model.TimeCreated = datetime;
        model.Username = req.Username;
        await model.save();
      }
      await customerDeviceModel.deleteMany({ RegionID: req?._id });
      await containerStreamStatsModel.deleteMany({ RegionID: req?._id });
      commonUtil.updateUserReport(req, '');
      return response;
    } catch (error) {
      return null;
    }
  };

  public CreateSystem = async (req: ISystem) => {
    try {
      var msg: any = {};
      if (req?._id == null) {
        msg = await this.SaveSystem(req);
      } else {
        msg = await this.UpdateSystem(req);
      }
      if (msg.ack === "1") {
        commonUtil.updateUserReport(req, '');
      }
      return msg.msg;
    } catch (error) {
      return "Something went wrong! Please try again";
    }
  };

  public SaveSystem = async (req: ISystem) => {
    try {
      if (req?.System?.trim() === '') return { ack: '0', msg: "Enter a valid System Name" }
      var customerRegion = await regionModel.findOne({ System: req?.System?.trim() }).collation({ locale: "en", strength: 2 })
      // var customerRegion = await systemModel.findOne({ System: { $regex: req?.System, $options: "i" } });
      var msg = "";
      let ack = "0";
      if (customerRegion == null) {
        var model = new systemModel();
        model.Email = req?.Email?.trim();
        model.Contact = req?.Contact?.trim();
        model.System = req?.System?.trim();
        model.Location = req?.Location;
        model.RegionID = req?.RegionID;
        model.save();
        msg = "Added Successfully";
        ack = "1";
      } else {
        msg = "Already Exist.";
      }
      return { msg: msg, ack: ack };
    } catch (error) {
      return { ack: "0", msg: "Something went wrong! Please try again" };
    }
  };

  public UpdateSystem = async (req: ISystem) => {
    try {
      if (req?.System?.trim() === '') return { ack: '0', msg: "Enter a valid System Name" }
      var result = await regionModel.findOne({ System: req?.System?.trim() }).collation({ locale: "en", strength: 2 })
      // var result = await systemModel.findOne({ System: { $regex: req?.System, $options: "i" } });
      if (result?._id == req?._id || !result)
        return await new Promise((resolve, reject) => {
          const blog = {
            Contact: req?.Contact?.trim(),
            Email: req?.Email?.trim(),
            RegionID: req?.RegionID,
            Location: req?.Location,
            System: req?.System?.trim(),
          };
          systemModel.updateOne(
            { _id: req?._id },
            blog,
            {
              new: true,
            },
            (err) => {
              if (err) return resolve({ ack: "0", msg: "Error in Updation." });
              return resolve({ ack: "1", msg: "Updated Successfully" });
            }
          );
        });
      else return {
        ack: '0',
        msg: 'Already Exist.'
      }
    } catch (error) {
      return { ack: "0", msg: "Something went wrong! Please try again" };
    }
  };

  public GetAllSystems = async (req?: Region) => {
    try {
      var customerDevices = await systemModel.find();
      customerDevices?.sort((a: any, b: any) => {
        return a.System.localeCompare(b.System);
      });
      return customerDevices;
    } catch (ex) {
      return null;
    }
  };

  public DeleteSystem = async (req?: any) => {
    try {
      let response = await systemModel.deleteOne({ _id: req?._id });
      let allData: any = await customerDeviceModel.find({ $and: [{ SystemID: req?._id }, { DeviceType: { $regex: EllvisModel } }] });
      for (let val = 0; val < allData.length; val++) {
        let req = {
          ip: allData[val].IP,
          password: allData[val].Password,
          username: secretUtil.ELLVIS_USERNAME,
        }
        ellvisServicesV1.EllvisLogout(req);
      }
      let allDevices: any = await customerDeviceModel.find({ SystemID: req?._id });
      for (let i = 0; i < allDevices.length; i++) {
        let encoder: any = await encoderModel.findOne({ peerIP: allDevices[i].IP.trim() });
        if (encoder.spareIp) {
          await HotbackupIpListModel.updateOne({ SpareIp: encoder.spareIp }, { $set: { inUse: false } });
        }
        let model = new deviceReportingModel();
        var datetime = new Date();
        model.DeviceName = allDevices[i].DeviceName;
        model.DeviceType = allDevices[i].DeviceType;
        model.DeviceIP = allDevices[i].IP.trim();
        model.Region = allDevices[i].Region;
        model.ActionType = `Delete`;
        model.TimeCreated = datetime;
        model.Username = req.Username;
        await model.save();
      }
      await customerDeviceModel.deleteMany({ SystemID: req?._id });
      await containerStreamStatsModel.deleteMany({ SystemID: req?._id });
      commonUtil.updateUserReport(req, '');
      return response;
    } catch (error) {
      return null;
    }
  };

  public GetAllUsers = async () => {
    try {
      var users = await customerLoginModel.find();
      return users;
    } catch (ex) {
      return null;
    }
  };

  public GetSMTPDetails = async (req?: SMTP) => {
    try {
      var smtp = await SMTPModel.find();

      return smtp;
    } catch (ex) {
      return null;
    }
  };

  public GetAlarmReport = async (req) => {
    try {
      var alarmReport: any = await alarmsReportingModel.find({});
      if (alarmReport) {
        if (alarmReport.length > 0) {
          for (let i = 0; i < alarmReport.length; i++) {
            alarmReport[i].TimeCreated = new Date(alarmReport[i].TimeCreated ? alarmReport[i].TimeCreated.getTime() + req.Timezone * 3600000 : '');
            if (alarmReport[i].TimeCleared) {
              alarmReport[i].TimeCleared = new Date(alarmReport[i].TimeCleared.getTime() + req.Timezone * 3600000);
            }
          }

        }
      }
      return alarmReport;
    } catch (ex) {
      return null;
    }
  };

  public GetUserReport = async (req) => {
    try {
      var userReport: any = await userLoginReportingModel.find({});
      if (userReport) {
        if (userReport.length > 0) {
          for (let i = 0; i < userReport.length; i++) {
            userReport[i].LoginTime = new Date(userReport[i].LoginTime.getTime() + req.Timezone * 3600000);
            if (userReport[i].LogoutTime) {
              userReport[i].LogoutTime = new Date(userReport[i].LogoutTime.getTime() + req.Timezone * 3600000);
            }
          }

        }
      }
      return userReport;
    } catch (ex) {
      return null;
    }
  };

  public GetUserReportExport = async (req) => {
    try {
      var userReport: any = await userLoginReportingModel.find({});
      let userreportarray: any = [];

      for (let i = 0; i < userReport.length; i++) {
        if (userReport[i].Actions != null && userReport[i].Actions.length > 0) {
          for (let j = 0; j < userReport[i].Actions.length; j++) {
            let userreportobj = {};
            userreportobj["Username"] = userReport[i]["Username"];
            userreportobj["Role"] = userReport[i]["Role"];
            userreportobj["LoginTime"] = new Date(new Date(userReport[i]["LoginTime"]).getTime() + req.Timezone * 3600000);
            userreportobj["LogoutTime"] = new Date(new Date(userReport[i]["LogoutTime"]).getTime() + req.Timezone * 3600000);
            userreportobj["LoginInterval"] = userReport[i]["LoginInterval"];
            userreportobj["ActionType"] = userReport[i]["Actions"][j]["ActionType"];
            userreportobj["ActionTime"] = new Date(new Date(userReport[i]["Actions"][j]["ActionTime"]).getTime() + req.Timezone * 3600000);
            userreportobj["Module"] = userReport[i]["Actions"][j]["Module"];
            userreportobj["Target"] = userReport[i]["Actions"][j]["Target"];
            userreportarray.push(userreportobj);
          }
        }
        else {
          let userreportobj = {};
          userreportobj["Username"] = userReport[i]["Username"];
          userreportobj["Role"] = userReport[i]["Role"];
          userreportobj["LoginTime"] = new Date(new Date(userReport[i]["LoginTime"]).getTime() + req.Timezone * 3600000);
          userreportobj["LogoutTime"] = new Date(new Date(userReport[i]["LogoutTime"]).getTime() + req.Timezone * 3600000);
          userreportobj["LoginInterval"] = userReport[i]["LoginInterval"];
          userreportobj["ActionType"] = "";
          userreportobj["ActionTime"] = "";
          userreportobj["Module"] = "";
          userreportobj["Target"] = "";
          userreportarray.push(userreportobj);
        }
      }


      return userreportarray;
    } catch (ex) {
      return null;
    }
  };

  public GetDeviceReport = async (req) => {
    try {
      var deviceReport: any[] = await deviceReportingModel.find({});
      var item;
      let resp = {
        Obj: {},
        Array: new Array(),
      };
      let set = new Set();
      if (deviceReport) {
        if (deviceReport.length > 0) {
          for (let i = 0; i < deviceReport.length; i++) {
            set.add(deviceReport[i].DeviceIP);
            deviceReport[i].TimeCreated = new Date(deviceReport[i].TimeCreated.getTime() + req.Timezone * 3600000);
            if (deviceReport[i].DeviceIP in resp.Obj) {
              resp.Obj[deviceReport[i].DeviceIP].push(deviceReport[i]);
            } else {
              let temp: any[] = [];
              temp.push(deviceReport[i]);
              resp.Obj[deviceReport[i].DeviceIP] = temp;
            }
          }
          let arr: any = [];
          for (item of set.values()) {
            let itm = await deviceReportingModel.findOne({ DeviceIP: item });
            if (itm) arr.push(itm);
          }
          let x: any = [];
          for (let i = 0; i < arr.length; i++) {
            x.push(`${arr[i].DeviceName} (${arr[i].DeviceIP})`)
          }
          for (let i = 0; i < x.length; i++) {
            resp.Array.push({ DeviceName: x[i] });
          }
        }
      }
      return resp;
    } catch (ex) {
      return {
        Obj: {},
        Array: new Array(),
      };
    }
  };

  public GetSearchDetails = async (req: any) => {
    try {
      let timecreatedfrom = new Date(req.TimeCreatedFrom);
      timecreatedfrom.setHours(0, 0, 0, 0);
      let timecreatedto = new Date(req.TimeCreatedTo);
      timecreatedto.setHours(23, 59, 59, 999);
      let timeclearedfrom = new Date(req.TimeClearedFrom);
      timeclearedfrom.setHours(0, 0, 0, 0);
      let timeclearedto = new Date(req.TimeClearedTo);
      timeclearedto.setHours(23, 59, 59, 999);
      let timecreatedfilter = {};
      let timeclearedfilter = {};
      let localOffset = timecreatedfrom.getTimezoneOffset() / 60;
      let localOffsetcleared = timeclearedfrom.getTimezoneOffset() / 60;
      if (!isNaN(timecreatedto.getTime())) {
        timecreatedfilter["$lte"] = new Date(timecreatedto.getTime() - (req.Timezone + localOffset) * 3600000);
      }
      if (!isNaN(timecreatedfrom.getTime())) {
        timecreatedfilter["$gte"] = new Date(timecreatedfrom.getTime() - (req.Timezone + localOffset) * 3600000);
      }
      if (!isNaN(timeclearedto.getTime())) {
        timeclearedfilter["$lte"] = new Date(timeclearedto.getTime() - (req.Timezone + localOffsetcleared) * 3600000);
      }
      if (!isNaN(timeclearedfrom.getTime())) {
        timeclearedfilter["$gte"] = new Date(timeclearedfrom.getTime() - (req.Timezone + localOffsetcleared) * 3600000);
      }
      let filter = {};
      let createdKeys = _.keys(timecreatedfilter);
      let clearedKeys = _.keys(timeclearedfilter);
      if (createdKeys.length != 0) {
        filter["TimeCreated"] = timecreatedfilter;
      }
      if (clearedKeys.length != 0) {
        filter["TimeCleared"] = timeclearedfilter;
      }
      if (req.AlarmType != "") {
        filter["AlarmType"] = req.AlarmType;
      }
      if (req.MailInformed != "") {
        filter["MailInformed"] = { $regex: req.MailInformed };
      }
      var searchDetail: any = await alarmsReportingModel.find(filter);
      if (searchDetail) {
        if (searchDetail.length > 0) {
          for (let i = 0; i < searchDetail.length; i++) {
            searchDetail[i].TimeCreated = new Date(searchDetail[i].TimeCreated.getTime() + req.Timezone * 3600000);
            if (searchDetail[i].TimeCleared) {
              searchDetail[i].TimeCleared = new Date(searchDetail[i].TimeCleared.getTime() + req.Timezone * 3600000);
            }
          }
        }
      }
      return searchDetail;

    } catch (ex) {
      return null;
    }
  };

  public GetUserSearchDetails = async (req: any) => {
    try {
      let timeloginfrom = new Date(req.TimeLoginFrom);
      timeloginfrom.setHours(0, 0, 0, 0);
      let timeloginto = new Date(req.TimeLoginTo);
      timeloginto.setHours(23, 59, 59, 999);
      let timelogoutfrom = new Date(req.TimeLogoutFrom);
      timelogoutfrom.setHours(0, 0, 0, 0);
      let timelogoutto = new Date(req.TimeLogoutTo);
      timelogoutto.setHours(23, 59, 59, 999);
      let timeloginfilter = {};
      let timelogoutfilter = {};
      let localOffset = timeloginto.getTimezoneOffset() / 60;
      let localOffsetlogout = timelogoutfrom.getTimezoneOffset() / 60;
      if (!isNaN(timeloginto.getTime())) {
        timeloginfilter["$lte"] = new Date(timeloginto.getTime() - (req.Timezone + localOffset) * 3600000);
      }
      if (!isNaN(timeloginfrom.getTime())) {
        timeloginfilter["$gte"] = new Date(timeloginfrom.getTime() - (req.Timezone + localOffset) * 3600000);
      }
      if (!isNaN(timelogoutto.getTime())) {
        timelogoutfilter["$lte"] = new Date(timelogoutto.getTime() - (req.Timezone + localOffsetlogout) * 3600000);
      }
      if (!isNaN(timelogoutfrom.getTime())) {
        timelogoutfilter["$gte"] = new Date(timelogoutfrom.getTime() - (req.Timezone + localOffsetlogout) * 3600000);;
      }
      let filter = {};
      let loginKeys = _.keys(timeloginfilter);
      let logoutKeys = _.keys(timelogoutfilter);
      if (loginKeys.length != 0) {
        filter["LoginTime"] = timeloginfilter;
      }
      if (logoutKeys.length != 0) {
        filter["LogoutTime"] = timelogoutfilter;
      }
      if (req.Role != "") {
        filter["Role"] = req.Role;
      }
      if (req.Username != "") {
        filter["Username"] = req.Username;
      }
      if (req.Actions != "") {
        filter["Actions.ActionType"] = { $regex: req.Actions };
      }
      var searchDetail: any = await userLoginReportingModel.find(filter);
      if (searchDetail) {
        if (searchDetail.length > 0) {
          for (let i = 0; i < searchDetail.length; i++) {
            searchDetail[i].LoginTime = new Date(searchDetail[i].LoginTime.getTime() + req.Timezone * 3600000);
            if (searchDetail[i].LogoutTime) {
              searchDetail[i].LogoutTime = new Date(searchDetail[i].LogoutTime.getTime() + req.Timezone * 3600000);
            }
          }

        }

      }
      return searchDetail;

    } catch (ex) {
      return null;
    }
  };

  public GetDeviceReportSearchDetails = async (req: any) => {
    try {
      let timecreatedfrom = new Date(req.TimeCreatedFrom);
      timecreatedfrom.setHours(0, 0, 0, 0);
      let timecreatedto = new Date(req.TimeCreatedTo);
      timecreatedto.setHours(23, 59, 59, 999);
      let timecreatedfilter = {};
      let localOffset = timecreatedfrom.getTimezoneOffset() / 60;
      if (!isNaN(timecreatedto.getTime())) {
        timecreatedfilter["$lte"] = new Date(timecreatedto.getTime() - (req.Timezone + localOffset) * 3600000);
      }
      if (!isNaN(timecreatedfrom.getTime())) {
        timecreatedfilter["$gte"] = new Date(timecreatedfrom.getTime() - (req.Timezone + localOffset) * 3600000);
      }
      let filter = {};
      let createdKeys = _.keys(timecreatedfilter);
      //   let clearedKeys = _.keys(timeclearedfilter);
      if (createdKeys.length != 0) {
        filter["TimeCreated"] = timecreatedfilter;
      }
      //   if (clearedKeys.length != 0) {
      //     filter["TimeCleared"] = timeclearedfilter;
      //   }
      //   if (req.DeviceType != "") {
      //     filter["DeviceType"] = {
      //         $in:[{$eq:req.DeviceType},{ $nin: [req.DeviceType] } ]
      //     };
      //   }
      if (req.DeviceType !== "") {
        filter["DeviceType"] = { $regex: req.DeviceType };
      }
      if (req.ActionType != "") {
        filter["ActionType"] = req.ActionType;
      }
      if (req.Username != "") {
        filter["Username"] = req.Username;
      }
      if (req.DeviceIP != "") {
        filter["DeviceIP"] = req.DeviceIP;
      }
      var searchDetail: any[] = await deviceReportingModel.find(filter);
      let resp = {
        Obj: {},
        Array: new Array(),
      };
      if (searchDetail) {
        if (searchDetail.length > 0) {
          for (let i = 0; i < searchDetail.length; i++) {
            searchDetail[i].TimeCreated = new Date(searchDetail[i].TimeCreated.getTime() + req.Timezone * 3600000);
            if (searchDetail[i].DeviceName in resp.Obj) {
              // resp.Obj[searchDetail[i].DeviceName].push(searchDetail[i]);
              resp.Obj[searchDetail[i].DeviceIP].push(searchDetail[i]);
            } else {
              let temp: any[] = [];
              temp.push(searchDetail[i]);
              // resp.Obj[searchDetail[i].DeviceName] = temp;
              resp.Obj[searchDetail[i].DeviceIP] = temp;
            }
          }
          let x = _.keys(resp.Obj);
          for (let i = 0; i < x.length; i++) {
            resp.Array.push({ DeviceName: `${resp.Obj[x[i]][0].DeviceName} (${x[i]})` });
            // resp.Array.push({ DeviceName: x[i] });
          }
        }
      }
      return resp;
    } catch (ex) {
      return {
        Obj: {},
        Array: new Array(),
      };
    }
  };

  public CheckSMTPDetails = async (req?: SMTP) => {
    try {
      var customer = await SMTPModel.find({});
      return customer;
    } catch (error) {
      return null;
    }
  };

  public CheckSettingDetails = async (req?: SETTINGS) => {
    try {
      var customer = await SETTINGSModel.find({});
      return customer;
    } catch (error) {
      return null;
    }
  };

  public SaveVersions = async (req?: VERSIONS) => {
    try {
      if (req?._id !== null && req?._id !== undefined) {
        let model = {};
        // model["VCDMSVersion"] = req?.NPMVersion;
        model["NPMVersion"] = req?.NPMVersion;
        model["ReactVersion"] = req?.ReactVersion;
        model["NodeVersion"] = req?.NodeVersion;
        model["MongoVersion"] = req?.MongoVersion;
        let x = await VERSIONSModel.updateOne({ _id: req?._id }, model, {
          new: true,
        });
        return "Version has been updated Successfully.";
      }
      var customerSettings = await VERSIONSModel.findOne({ _id: req?._id });
      var msg = "";
      if (customerSettings === null) {
        let model = new VERSIONSModel();

        model.NPMVersion = req?.NPMVersion;
        model.ReactVersion = req?.ReactVersion;
        model.NodeVersion = req?.NodeVersion;
        model.MongoVersion = req?.MongoVersion;
        model.save();
        msg = "Versions have been saved successfully";
      } else {
        msg = "Already Exist";
      }
      return msg;
    } catch (error) {
      return null;
    }
  };

  public CheckVersions = async (req?: VERSIONS) => {
    try {
      var customer = await VERSIONSModel.find({});
      return customer;
    } catch (error) {
      return null;
    }
  };

  public TestMail = async (req?: SMTP) => {
    try {
      let smtp = req?.Usermail;
      let password = req?.Password;
      let content = "This is a test mail from VCDMS.";
      let mail = [req?.Tomail];
      let port = req?.Portnumber;
      let service = req?.Service;
      let sendername = req?.Sendername;
      let securetick = req?.isSecure;
      let responses: any = await commonUtil.SendMail(
        smtp,
        password,
        port,
        service,
        content,
        ["test mail"],
        mail,
        sendername,
        securetick
      );
      let message = "";
      if (responses) {
        if (responses.length > 0) {
          if (responses[0] === "Email sent successfully") {
            message = "Mail Sent";
          } else {
            message = "Something went wrong please try again";
          }
        }
      } else {
        message = "Something went wrong please try again";
      }
      return message;
    } catch (error) {
      return error;
    }
  };

  public CheckSession = async (req?: CustomerLogin) => {
    try {
      var customer = await customerLoginModel.findOne({
        Session: req?.Session,
      });
      //   return { ack: "1", customer: customer };
      if (customer) {
        return { ack: "1", customer: customer };
      }
      else {
        return { ack: "2" };
      }
    } catch (error) {
      return { ack: "1", customer: null };
    }
  };

  public SaveSMTPDetails = async (req?: ISMTP) => {
    try {
      if (req?._id !== null && req?._id !== undefined) {
        let model = {};
        model["Service"] = req?.Service;
        model["Usermail"] = req?.Usermail;
        model["Password"] = req?.Password;
        model["Portnumber"] = req?.Portnumber;
        model["Sendername"] = req?.Sendername;
        model["isSecure"] = req?.isSecure;
        let x = await SMTPModel.updateOne({ _id: req?._id }, model, {
          new: true,
        });
        commonUtil.updateUserReport(req, '');
        return "SMTP has been updated Successfully.";
      }
      var smtpdetails = await SMTPModel.findOne({ Usermail: req?.Usermail });
      var msg = "";
      // var password: any = "";
      // var plaintextPass = req?.Password;

      if (smtpdetails === null) {
        let model = new SMTPModel();
        // const salt = await bcrypt.genSalt(10);
        // password = plaintextPass
        model.Service = req?.Service;
        model.Usermail = req?.Usermail;
        model.Password = req?.Password;
        model.Portnumber = req?.Portnumber;
        model.Sendername = req?.Sendername;
        model.isSecure = req?.isSecure;
        model.save();
        commonUtil.updateUserReport(req, '');
        msg = "SMTP has been created Successfully.";
      } else {
        msg = "SMTP already Exist.";
      }
      return msg;
    } catch (error) {
      return null;
    }
  };

  public SaveSettingDetails = async (req?: ISETTINGS) => {
    try {
      if (req?._id !== null && req?._id !== undefined) {
        let model = {};
        model["HttpHttps"] = req?.HttpHttps;
        let x = await SETTINGSModel.updateOne({ _id: req?._id }, model, {
          new: true,
        });
        commonUtil.updateUserReport(req, '');
        return "Http/Https has been updated Successfully.";
      }
      var customerSettings = await SETTINGSModel.findOne({
        HttpHttps: req?.HttpHttps,
      });
      var msg = "";
      if (customerSettings === null) {
        let model = new SETTINGSModel();
        model.HttpHttps = req?.HttpHttps;
        model.save();
        commonUtil.updateUserReport(req, '');
        msg = "Http/Https have been saved successfully";
      } else {
        msg = "Already Exist";
      }
      return msg;
    } catch (error) {
      return null;
    }
  };

  public SaveMajorAlarm = async (req?: IMAJORALARMS) => {
    try {
      if (req?._id !== null && req?._id !== undefined) {
        let model = {};
        model["Type"] = req?.Type;
        model["Value"] = req?.Value;
        let x = await MAJORALARMSModel.updateOne({ _id: req?._id }, model, {
          new: true,
        });
        commonUtil.updateUserReport(req, '');
        return "Major Alarm Details have been updated Successfully.";
      }
      var majorAlarm = await MAJORALARMSModel.findOne({
        _id: req?._id,
      });
      var msg = "";
      if (majorAlarm === null) {
        let model = new MAJORALARMSModel();
        model.Type = req?.Type;
        model.Value = req?.Value;
        model.save();
        commonUtil.updateUserReport(req, '');
        msg = "Major Alarm Details have been saved successfully";
      } else {
        msg = "Already Exist";
      }
      return msg;
    } catch (error) {
      return null;
    }
  };

  public CheckMajorAlarm = async (req?: MAJORALARMS) => {
    try {
      var customer = await MAJORALARMSModel.find({});
      return customer;
    } catch (error) {
      return null;
    }
  };

  public DeleteUser = async (req: ICustomerLogin) => {
    try {
      let response = await customerLoginModel.deleteOne({ _id: req?._id });
      commonUtil.updateUserReport(req, '');
      return { status: "success", message: "User has been deleted" };
    } catch (error) {
      return null;
    }
  };

  public CheckLicenseNumber = async (req: any) => {
    try {
      const licenceinfos: any = await liceseInfoModel.findOne({
        deviceip: req.IP,
      });
      if (!licenceinfos) {
        return {};
      }
      return licenceinfos;
      // let containers: ContainersStreamStats[] =
      //   await containerStreamStatsModel.find({ deviceip: req.IP });
      // let sourceSRT = 0;
      // let sourceUDP = 0;
      // let destSRT = 0;
      // let destUDP = 0;
      // let destHLSAndDash = 0;
      // let destRTMP = 0;

      // for (let i = 0; i < containers.length; i++) {
      //   if (containers[i].sourceProtocol === "SRT") {
      //     sourceSRT++;
      //   } else if (containers[i].sourceProtocol === "UDP") {
      //     sourceUDP++;
      //   }
      // }
      // for (let i = 0; i < containers.length; i++) {
      //   if (containers[i].destProtocol === "SRT") {
      //     destSRT++;
      //   } else if (containers[i].destProtocol === "UDP") {
      //     destUDP++;
      //   } else if (
      //     containers[i].destProtocol === "HLS" ||
      //     containers[i].destProtocol === "DASH"
      //   ) {
      //     destHLSAndDash++;
      //   } else if (containers[i].destProtocol === "RTMP") {
      //     destRTMP++;
      //   }
      // }

      // if (licenceinfos) {
      //   if (licenceinfos.licenses) {
      //     sourceSRT = licenceinfos.licenses.inputSRT - sourceSRT;
      //     sourceUDP = licenceinfos.licenses.inputUDP - sourceUDP;
      //     destSRT = licenceinfos.licenses.outputSRT - destSRT;
      //     destUDP = licenceinfos.licenses.outputUDP - destUDP;
      //     destHLSAndDash =
      //       licenceinfos.licenses.outputHLSAndDASH - destHLSAndDash;
      //     destRTMP = licenceinfos.licenses.outputRTMP - destRTMP;
      //   }
      // }
      // return {
      //   sourceSRT: sourceSRT,
      //   sourceUDP: sourceUDP,
      //   destSRT: destSRT,
      //   destUDP: destUDP,
      //   destHLSAndDash: destHLSAndDash,
      //   destRTMP: destRTMP,
      // };
    } catch (ex) {
      return {};
    }
  };

  public GetUserData = async (req?: CustomerLogin) => {
    try {
      var userData = await customerLoginModel.findOne({ Username: req?.Username });
      return userData;
    } catch (ex) {
      return null;
    }
  }

  public UpdateUserData = async (req?: CustomerLogin) => {
    try {
      if (req?.Username !== null && req?.Username !== undefined) {
        let model = {};

        model["Phone"] = req?.Phone;
        model["Email"] = req?.Email;
        model["Firstname"] = req?.Firstname;
        model["Lastname"] = req?.Lastname;
        model["Username"] = req?.Username;
        let x = await customerLoginModel.updateOne({ Username: req?.Username }, model, { new: true });
        var userData = await customerLoginModel.findOne({ Username: req?.Username });

        commonUtil.updateUserReport(req, '');
        return { msg: "user data has been updated succesfully", data: userData }
      }
    } catch (ex) {
      return null;
    }
  }



  public UpdateProfilePhoto = async (req) => {
    try {
      if (req?.Username !== null && req?.Username !== undefined) {
        let model = {};
        model["Username"] = req?.Username;
        model["Photo"] = req?.Photo;
        let x = await customerLoginModel.updateOne({ Username: req?.Username }, model, { new: true });
        var userData = await customerLoginModel.findOne({ Username: req?.Username });
        return { msg: "user image has been updated succesfully", data: userData }
      }
    } catch (ex) {
      return null;
    }
  }



  public verifyPassword = async (req) => {
    try {
      if (req?.Username !== null && req?.Username !== undefined) {
        let model = {};
        let x: any = await customerLoginModel.findOne({ Username: req?.Username });
        const verPassword = await bcrypt.compare(req.givenPassword, x.Password);
        if (verPassword) {
          const salt = await bcrypt.genSalt(10);
          model["Password"] = await bcrypt.hash(req.NewPassword, salt);
          let userData = await customerLoginModel.updateOne({ Username: req?.Username }, model, { new: true });
          return { msg: "Password has been updated succesfully" }
        } else {
          return { msg: "Password not updated" }
        }
      }
    } catch (ex) {
      return null;
    }
  }

  public GetDeviceCSV = async (req) => {
    try {
      var deviceReport: any = await deviceReportingModel.find({});
      if (deviceReport) {
        if (deviceReport.length > 0) {
          for (let i = 0; i < deviceReport.length; i++) {
            deviceReport[i].TimeCreated = new Date(deviceReport[i].TimeCreated.getTime() + req.Timezone * 3600000);
          }

        }
      }
      return deviceReport;
    } catch (ex) {
      return null;
    }
  };
  public purgeData = async (req?: any) => {
    try {
      var deviceReport = await deviceReportingModel.findOneAndDelete({ TimeCreated: { $gte: new Date(new Date(req?.TimeCreated).getTime() - req.Timezone * 3600000) } });
      return deviceReport;
    } catch (ex) {
      return null;
    }
  };
  public purgeDataUser = async (req?: any) => {
    try {
      var deviceReport = await userLoginReportingModel.findOneAndDelete({ LoginTime: { $gte: new Date(new Date(req?.LoginTime).getTime() - req.Timezone * 3600000) } });
      return deviceReport;
    } catch (ex) {
      return null;
    }
  };
  public purgeDataUserLogout = async (req?: any) => {
    try {
      var Report = await userLoginReportingModel.findOneAndDelete({ LogoutTime: { $gte: new Date(new Date(req?.LogoutTime).getTime() - req.Timezone * 3600000) } });
      return Report;
    } catch (ex) {
      return null;
    }
  };
  public purgeDataAlarm = async (req?: any) => {
    try {
      var deviceReport = await alarmsReportingModel.findOneAndDelete({ TimeCreated: { $gte: new Date(new Date(req?.TimeCreated).getTime() - req.Timezone * 3600000) } });
      return deviceReport;
    } catch (ex) {
      return null;
    }
  };
  public purgeDataAlarmCleared = async (req?: any) => {
    try {
      var Report = await alarmsReportingModel.findOneAndDelete({ TimeCleared: { $gte: new Date(new Date(req?.TimeCleared).getTime() - req.Timezone * 3600000) } });
      return Report;
    } catch (ex) {
      return null;
    }
  };
  public gettimezone = async (req?: any) => {
    try {
      var timez = await TimeZone.find({});
      if (timez.length === 0) {
        let model = new TimeZone();
        model.Timezone = {
          offset: -5,
          label: "Eastern Time"
        };
        model.save();

      }
      var Report = await TimeZone.find({});
      return Report[0].Timezone;
    } catch (ex) {
      return null;
    }
  };
  public settimezone = async (req?: any) => {
    try {
      var timez = await TimeZone.find({});
      if (timez.length === 0) {
        let model = new TimeZone();
        model.Timezone = {
          offset: -4,
          label: "Eastern Time"
        };
        model.save();

      } else {
        var Report = await TimeZone.updateMany({}, { Timezone: req });
        return Report;
      }

    } catch (ex) {
      return null;
    }
  };
  public getcurrenttimezone = async (req?: any) => {
    try {
      var timezonedefault = await CurrentTimeZones.find({});
      let daylight = {
        "EDT": {
          offset: -4,
          label: "Eastern Time"
        },
        "CDT": {
          offset: -5,
          label: "Central Time"
        },
        "MDT": {
          offset: -6,
          label: "Mountain Time"
        },
        "PDT": {
          offset: -7,
          label: "Pacific Time"
        },
        "AKDT": {
          offset: -8,
          label: "Alaska Time"
        },
        "HDT": {
          offset: -10,
          label: "Hawaii Time"
        }
      };
      if (timezonedefault.length === 0) {
        let model = new CurrentTimeZones();
        model.Timezone = daylight;
        model.save();
      } else {
        var Report = await CurrentTimeZones.findOne({});
        return Report;
      }

    } catch (ex) {
      return null;
    }
  };
}

export const customerServicesV1 = new CustomerServicesV1();