import { report } from 'node:process';
import * as nodemailer from 'nodemailer';
import { deviceReportingModel } from '../models/reporting/devicereportmodel';
import { userLoginReportingModel } from '../models/reporting/userlogins';


class CommonUtil {
    /**
         * send email to MI
         */
    public SendMail = async (fromEmail: any, password: any, port: any, service: any, content: any, subject: any, mailArray: any, sendername: any, securetick: any) => {
        let mailTransporter = nodemailer.createTransport({
            host: service,
            port: port,
            auth: {
                user: fromEmail,
                pass: password
            },
            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: securetick === "none" ? false : true
            },
            secure: false
        });

        let responses: any = [];
        for (var i = 0; i < mailArray.length; i++) {
            let mailDetails = {
                from: {
                    name: sendername,
                    address: fromEmail,
                },
                headers: {
                    "x-priority": "1",
                    "x-msmail-priority": "High",
                    importance: "high"
                },
                to: mailArray[i] as string,
                subject: subject[i],
                html: content
            };
            let resp = await new Promise((resolve, reject) => {
                mailTransporter.sendMail(mailDetails, function (err, data) {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve("Email sent successfully");
                    }
                });
            });
            responses.push(resp);
        }
        return responses;

    }

    public msToTime = (diff: any) => {
          diff = diff/1000;
          let mseconds = Math.floor(diff - Math.floor(diff/1000)*1000)
          let hours = Math.floor(diff/3600);
          diff = diff % 3600;
          let minutes =  Math.floor(diff/60);
          diff = diff %60;
          let seconds =  Math.floor(diff);
          
          let hoursformatted = hours.toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false
          })
          let secondsformatted = seconds.toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false
          })
          let msecondsformatted = mseconds.toLocaleString('en-US', {
            minimumIntegerDigits: 3,
            useGrouping: false
          })
          let minutesformatted = minutes.toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false
          })
        // var milliseconds = Math.floor((duration % 1000) / 100)
        // let seconds = Math.floor((duration / 1000) % 60)
        // let minutes = Math.floor((duration / (1000 * 60)) % 60)
        // let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

        // let hoursstr = hours < 10 ? "0" + hours : hours;
        // let minutesstr = minutes < 10 ? "0" + minutes : minutes;
        // let secondsstr = seconds < 10 ? "0" + seconds : seconds;

        return hoursformatted + ":" + minutesformatted + ":" + secondsformatted + ":" + msecondsformatted;
    }

    public updateUserReport = async (req: any,oldDevice:any) => {
        let report = await userLoginReportingModel.findOne({ Username: req.Username, LoginTime: { $lte: req.ActionTime }, LogoutTime: { $eq: undefined } })
        if (report) {
            let blob = {
                ActionType: req.ActionType,
                ActionTime: req.ActionTime,
                Module: req.Module,
                Target: (oldDevice && oldDevice.IP !== req.Target) ? `${oldDevice.IP} to ${req.Target}`: req.Target
            }
            let actions: any = [];
            if (report.Actions) {
                actions = report.Actions
            }
            actions.push(blob);
            userLoginReportingModel.updateOne({ _id: report._id }, { $set: { Actions: actions } }, { new: true }, (err) => {
                if (err) return;
            })
        }
    }

    public updateDeviceReport = async (req: any) => {
        let report = await deviceReportingModel.findOne({_id:req._id })
        if (report) {
            let blob = {
                DeviceName:req.DeviceName,
                DeviceType:req.DeviceType,
                DeviceIP:req.DeviceIP,
                Region:req.Region,
                ActionType: req.ActionType,
                TimeCreated:req.TimeCreated,
                Username:req.Username
            }
            deviceReportingModel.updateOne({ _id: report._id }, { $set: blob  }, { new: true }, (err) => {
                if (err) return;
            })
        }
        else{
            var msg=''
              let model = new deviceReportingModel();
              model.DeviceName = req?.DeviceName;
              model.DeviceType = req?.DeviceType;
              model.DeviceIP = req?.DeviceIP;
              model.Region = req?.Region;
              model.ActionType=req?.ActionType;
              model.TimeCreated=req?.TimeCreated;
              model.Username=req?.Username;
              model.save();
              msg = "Device report has been saved successfully";
            return msg;
        }
    }

    public GetDeviceTypeByModel = (model: any) => {

        var deviceType = "";

        if(model === "VL4510")
        {
          deviceType = "VL4510";
        }
        else if(model === "VL4510H")
        {
          deviceType = "VL4510H";
        }
        else if(model === "VL4522")
        {
          deviceType = "VL4522";
        }
        else if(model === "VL4522Q")
        {
          deviceType = "VL4522Q";
        }
        else if(model.includes("VL45"))
        {
          deviceType = "VL4500";
        }
        else if(model.includes("RM11"))
        {
          deviceType = "RM1100";
        }

        // if(model.includes("VL45"))
        // {
        //     deviceType = "VL4500"
        // }
        // else if(model.includes("RM11"))
        // {
        //     deviceType = "RM1100"
        // }

        return deviceType;
    }

}

export const commonUtil = new CommonUtil();
