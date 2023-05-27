import { backupmodel } from "../../../models/backup/backupmodel";
import { customerDeviceModel } from "../../../models/ellvis/customerdevice.model";
import { HotbackupIpListModel } from "../../../models/backup/backupIpList";
import path from "path";
import request from 'request';
const bcrypt = require("bcrypt");
import { exec } from 'child_process'
import { customerLoginModel } from "../../../models/customer/login.model";
import { SETTINGSModel } from "../../../models/customer/settingsmodel";
import { encoderModel } from '../../../models/global/encodermodel';
import fs from 'fs'
import { Client } from 'node-scp'
import { NodeSSH } from 'node-ssh'
import { secretUtil } from "../../../utils/secretutil";
import { BackupCronModel } from "../../../models/backup/backupcron";
import app from "../../../app"
import { zip } from 'zip-a-folder';
import extract from 'extract-zip'
import * as fse from 'fs-extra'
import { encoderServicesV1 } from "../encoder/encoderservicesv1";
import logging from "../../../logging";
import { alarmsReportingModel } from "../../../models/reporting/alarmsmodel";
import { commonUtil } from "../../../utils/commonUtil";
import { SMTPModel } from '../../../models/customer/smtpmodel';
import { customerServicesV1 } from '../customer/customerservicesv1';
import { regionModel } from '../../../models/region/region.model';
import { systemModel } from '../../../models/region/system.model';
const dbOptions = {
  host: secretUtil.MONGODB_SERVER,
  port: secretUtil.MONGODB_PORT,
  database: secretUtil.MONGODB_DBNAME,
  collections: [],
};
const ssh = new NodeSSH();
let EllvisModel = secretUtil.Ellvis;
class BackupServicesV1 {
  public ScheduledBackup = async (user: any, storage: any) => {
    try {
      let ack = { ack: '1', msg: "Backup Saved Successfully" };
      let backupLocation = await backupmodel.find({});
      let date = new Date();
      let curr_time =
        ("00" + (date.getMonth() + 1)).slice(-2) +
        ("00" + date.getDate()).slice(-2) +
        date.getFullYear() +
        ("00" + date.getHours()).slice(-2) +
        ("00" + date.getMinutes()).slice(-2) +
        ("00" + date.getSeconds()).slice(-2);
      let folderName = `DB_BACKUP_${curr_time}`;
      if (!fs.existsSync(path.join(process.cwd(), "dblocalbackup"))) {
        fs.mkdirSync(path.join(process.cwd(), "dblocalbackup"));
      }
      let src = path.join(process.cwd(), "dblocalbackup");
      let newBackupPath = path.join(process.cwd(), "dblocalbackup/" + folderName);
      let cmd =
        "mongodump --host " +
        dbOptions.host +
        " --port " +
        dbOptions.port +
        " --gzip" +
        " --db " +
        dbOptions.database +
        " --out " +
        newBackupPath;
      if (storage === 'remote' && backupLocation.length) {
        exec(cmd, async (err, stdout, stderr) => {
          const failed = []
          const successful = []
          if (this.empty(err)) {
            if (storage === 'remote' && backupLocation.length) {
              const client = await Client({
                host: backupLocation[0]?.host,
                password: backupLocation[0]?.password,
                username: backupLocation[0]?.username,
                port: backupLocation[0]?.port
              });
              const result = await client.list(String(backupLocation[0]?.location));
              const dbs = result.filter(r => r.name.includes('DB_BACKUP_'));
              dbs.sort((a, b) => (a.modifyTime < b.modifyTime) ? 1 : (a.modifyTime > b.modifyTime ? -1 : 0));
              let toBeDeleted = null;
              if (dbs.length >= 7) toBeDeleted = dbs[0].name;
              await ssh.connect({
                host: backupLocation[0]?.host,
                password: backupLocation[0]?.password,
                username: backupLocation[0]?.username,
                port: backupLocation[0]?.port,
              }).then(async function () {
                if (toBeDeleted) {
                  await ssh.execCommand(`rm -r ${toBeDeleted}`, { cwd: backupLocation[0]?.location }).then(result => console.log(result));
                  toBeDeleted = null;
                }
                await ssh.putDirectory(newBackupPath, backupLocation[0]?.location + '/' + folderName, {
                  recursive: true,
                  concurrency: 10, tick: function (localPath, remotePath, error) {
                    if (error) {
                      return;
                    } else {
                      console.log("Passed", remotePath)
                    }
                  }
                }).then(function (status) {
                  // console.log('the directory transfer was', status ? 'successful' : 'unsuccessful')
                  // console.log('failed transfers', failed.join(', '))
                  // console.log('successful transfers', successful.join(', '))
                })
              }).catch(err => {
                return { ack: '2', msg: "Could not connnect to remote" }
              })
              fs.rmdirSync(newBackupPath, { recursive: true });
            }
          } else {
            return;
          }
        });
      }
      else {

        exec(cmd, async (err, stdout, stderr) => {
          if (this.empty(err)) {
            ack['ack'] = '1';
            ack.msg = 'BAckup created on local location';
          }
        });
        this.deleteOldestlocal(src);
      }
      return ack;
    } catch (error) {
      return { ack: '2', msg: "Some Errror Occured" };
    }
  }

  public empty = (mixedVar) => {
    let undef, key, i, len;
    const emptyValues = [undef, null, false, 0, "", "0"];
    for (i = 0, len = emptyValues.length; i < len; i++) {
      if (mixedVar === emptyValues[i]) {
        return true;
      }
    }
    if (typeof mixedVar === "object") {
      for (key in mixedVar) {
        return false;
      }
      return true;
    }
    return false;
  };
  public deleteOldestlocal = async (src) => {
    function getDirectories(p) {
      return fs.readdirSync(p).filter(function (file) {
        return fs.statSync(p + '/' + file).isDirectory();
      });
    }
    let backups = getDirectories(src);
    if (backups.length >= 7) {
      // fs.rmdirSync(path.join(src, backups[0]), {recursive:true});
      await fse.remove(path.join(src, backups[0]))
    }
    else return;
  }
  public saveBackupLocation = async (req: any) => {
    try {
      let user = await customerLoginModel.findOne({ Username: req.user });
      if (user?.Role === "Admin") {
        let oldbackup = await backupmodel.find({});
        if (oldbackup.length) {
          let username = req?.username;
          // let salt = await bcrypt.genSalt(10);
          let password = req?.password; //await bcrypt.hash(req?.password, salt);
          let location = req?.location;
          let host = req?.host;
          let port = req?.port;
          let model = {
            username: username,
            password: password,
            host: host,
            location: location,
            port: port
          };
          let newBackup = await backupmodel.updateOne(
            { user: "Admin" },
            { $set: model }
          );
          if (newBackup)
            return { msg: "Backup Location has been updated succesfully" };
        }
        let model = new backupmodel();
        // const salt = await bcrypt.genSalt(10);
        // let password = await bcrypt.hash(req.password, salt);
        model.user = "Admin"
        model.host = req?.host;
        model.username = req?.username;
        model.location = req?.location;
        model.password = req?.password;
        model.port = req?.port;
        await model.save();
        return { msg: "Remote location has been set successfully;" };
      } else {
        return { msg: "Not Authorized" };
      }
    } catch (error) {
      return null;
    }
  };
  public getBackupLocation = async (req: any) => {
    try {
      let backupLocation = await backupmodel.find({});
      if (backupLocation) {
        return { IP: backupLocation[0].host, location: backupLocation[0].location };
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };
  public uploadBackupNow = async (req: any) => {
    try {
      let ack = { ack: '1', msg: "Backup Saved Successfully" };
      let user = await customerLoginModel.findOne({ Username: req?.user })
      if (user?.Role !== 'Admin') return { ack: '0', msg: "only Admins can do database Backup" };
      let backupLocation = await backupmodel.find({});
      let date = new Date();
      let curr_time =
        ("00" + (date.getMonth() + 1)).slice(-2) +
        ("00" + date.getDate()).slice(-2) +
        date.getFullYear() +
        ("00" + date.getHours()).slice(-2) +
        ("00" + date.getMinutes()).slice(-2) +
        ("00" + date.getSeconds()).slice(-2);
      let folderName = `DB_BACKUP_${curr_time}`;
      if (!fs.existsSync(path.join(process.cwd(), "dblocalbackup"))) {
        fs.mkdirSync(path.join(process.cwd(), "dblocalbackup"));
      }
      let src = path.join(process.cwd(), "dblocalbackup");
      let newBackupPath = path.join(process.cwd(), "dblocalbackup/" + folderName);
      let cmd =
        "mongodump --host " +
        dbOptions.host +
        " --port " +
        dbOptions.port +
        " --gzip" +
        " --db " +
        dbOptions.database +
        " --out " +
        newBackupPath;
      if (req.storage === 'remote' && backupLocation.length) {
        exec(cmd, async (err, stdout, stderr) => {
          const failed = []
          const successful = []
          if (this.empty(err)) {
            if (req.storage === 'remote' && backupLocation.length) {
              const client = await Client({
                host: backupLocation[0]?.host,
                password: backupLocation[0]?.password,
                username: backupLocation[0]?.username,
                port: backupLocation[0]?.port
              });
              const result = await client.list(String(backupLocation[0]?.location));
              const dbs = result.filter(r => r.name.includes('DB_BACKUP_'));
              dbs.sort((a, b) => (a.modifyTime < b.modifyTime) ? 1 : (a.modifyTime > b.modifyTime ? -1 : 0));
              let toBeDeleted = null;
              if (dbs.length >= 7) toBeDeleted = dbs[0].name;
              await ssh.connect({
                host: backupLocation[0]?.host,
                password: backupLocation[0]?.password,
                username: backupLocation[0]?.username,
                port: backupLocation[0]?.port,
              }).then(async function () {
                if (toBeDeleted) {
                  await ssh.execCommand(`rm -r ${toBeDeleted}`, { cwd: backupLocation[0]?.location }).then(result => console.log(result));
                  toBeDeleted = null;
                }
                await ssh.putDirectory(newBackupPath, backupLocation[0]?.location + '/' + folderName, {
                  recursive: true,
                  concurrency: 10, tick: function (localPath, remotePath, error) {
                    if (error) {
                      // console.log("failed", localPath)
                    } else {
                      console.log("Passed", remotePath)
                    }
                  }
                }).then(function (status) {
                  // console.log('the directory transfer was', status ? 'successful' : 'unsuccessful')
                  // console.log('failed transfers', failed.join(', '))
                  // console.log('successful transfers', successful.join(', '))
                })
              }).catch(err => {
                return { ack: '2', msg: "Could not connnect to remote" }
              })
              fs.rmdirSync(newBackupPath, { recursive: true });
            }
          } else {
            return;
          }
        });
      }
      else {
        this.deleteOldestlocal(src);
        exec(cmd, async (err, stdout, stderr) => {
          if (this.empty(err)) {
            ack['ack'] = '1';
            ack.msg = 'BAckup created on local location';
          }
        })
      }
      return ack;
    } catch (error) {
      return { ack: '2', msg: "Some Errror Occured" };
    }
  };
  public listAllBackups = async (req: any) => {
    async function test() {
      try {
        let backupLocation = await backupmodel.find({});
        if (backupLocation) {

          const client = await Client({
            host: backupLocation[0]?.host,
            password: backupLocation[0]?.password,
            username: backupLocation[0]?.username,
            port: backupLocation[0]?.port
          })
          let location = String(backupLocation[0]?.location);
          const result = await client.list(location);
          const dbs = result.filter(r => r.name.includes('DB_BACKUP_'));
          dbs.sort((a, b) => (a.modifyTime < b.modifyTime) ? 1 : (a.modifyTime > b.modifyTime ? -1 : 0));
          client.close();
          return dbs;
        }
      }
      catch (e) {
        return;
      }
    }
    return test();
  }
  public restoreLocal = async (req: any) => {
    try {
      let user = await customerLoginModel.findOne({ Username: req.user });
      if (user?.Role === "Admin") {
        let restoreBackupPath = path.join(process.cwd(), "dblocalbackup/" + req.foldername);
        let cmd =
          "mongorestore --host " +
          dbOptions.host +
          " --port " +
          dbOptions.port +
          " --db " +
          dbOptions.database +
          " " + restoreBackupPath + '/' + dbOptions.database + " --gzip "
          +
          "--drop"
        exec(cmd, (error, stdout, stderr) => {
          if (this.empty(error)) {
            return { ack: "1", msg: "Restored" };
          }
          return { ack: "0", msg: "Restore failed" };
        });
        return { ack: '1', msg: "Database Restored" };
      }
      else return { ack: '2', msg: "Only admins can restore database" }
    } catch (error) {
      return null;
    }
  }
  public restoreRemote = async (req: any) => {
    try {
      let user = await customerLoginModel.findOne({ Username: req.user });
      if (user?.Role === "Admin") {
        let oldbackup = await backupmodel.find();
        if (oldbackup.length) {
          const failed = []
          const successful = []
          await ssh.connect({
            host: oldbackup[0]?.host,
            password: oldbackup[0]?.password,
            username: oldbackup[0]?.username,
            port: oldbackup[0]?.port
          }).then(async function () {
            let localDir = path.join(process.cwd(), "dblocalbackup");
            await ssh.getDirectory(localDir, `${oldbackup[0]?.location}/${req.foldername}`, {
              recursive: true, concurrency: 10, tick: function (localPath, remotePath, error) {
                if (error) {
                  // console.log("failed", localPath)
                } else {
                  console.log("Passed", remotePath)
                }
              }
            }).then(function (status) {
              // console.log('the directory transfer was', status ? 'successful' : 'unsuccessful')
              // console.log('failed transfers', failed.join(', '))
              // console.log('successful transfers', successful.join(', '))
            })
          })
          let restoreBackupPath = path.join(process.cwd(), "dblocalbackup");
          let cmd =
            "mongorestore --host " +
            dbOptions.host +
            " --port " +
            dbOptions.port +
            " --db " +
            dbOptions.database +
            " " + restoreBackupPath + '/' + dbOptions.database + " --gzip "
            +
            "--drop"
          exec(cmd, (error, stdout, stderr) => {
            if (this.empty(error)) {
              fs.rmdirSync(restoreBackupPath + '/' + dbOptions.database, { recursive: true });
              return { ack: "1", msg: "Restored" };
            }
            return { ack: "0", msg: "Restore failed" };
          });
          return { ack: '1', msg: "Database Restored" }
        }
      } else return { ack: '2', msg: "Only admins can restore database" }
    } catch (error) {
      return null;
    }
    return { ack: '0', msg: "Error" };
  }
  public listLocalBackups = async (req: any) => {
    let source = path.join(process.cwd(), "dblocalbackup");
    function getDirectories(p) {
      return fs.readdirSync(p).filter(function (file) {
        return fs.statSync(p + '/' + file).isDirectory();
      });
    }
    return getDirectories(source);
  }
  public downloadBackup = async (req, foldername, res: any) => {
    try {
      let pathurl = req.path;
      let sourceBackupPath = path.join(process.cwd(), `dblocalbackup/${foldername}`);
      await zip(sourceBackupPath, foldername + '.zip');
      let cd = path.join(process.cwd(), `${foldername}.zip`);
      if (pathurl !== '/') {
        const response = res.download(cd, `${foldername}.zip`, err => {
          if (err) return err;
          fs.unlinkSync(cd);
        });
        return response;
      }
    } catch (error) {
      return { err: error };
    }
  };
  public savedailycron = async (req: any) => {
    try {
      let user = await customerLoginModel.findOne({ Username: req?.user })
      if (user?.Role !== 'Admin') return { msg: "only admins can reschedule database Backup" };
      let cron = await BackupCronModel.find({});
      if (cron.length) {
        let model = {
          user: "Admin",
          dailyexpression: req?.expression,
          dailystorage: req?.storage
        };
        let newCron = await BackupCronModel.updateOne(
          { user: "Admin" },
          { $set: model }
        );
        if (app.Manager.exists('dbdaily')) {
          app.Manager.update("dbdaily", req?.expression, () => {
            this.ScheduledBackup(req?.user, req?.storage);
          });
        }
        else {
          app.Manager.add('dbdaily', req?.expression, () => {
            this.ScheduledBackup(req?.user, req?.storage);
          }, {
            start: true,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        }
        if (newCron)
          return { msg: "Backup Schedule has been updated succesfully" };
      }
      let model = new BackupCronModel();
      model.user = "Admin";
      model.dailyexpression = req?.expression;
      model.dailystorage = req?.storage;
      await model.save();
      if (app.Manager.exists('dbdaily')) {
        app.Manager.update("dbdaily", req?.expression, () => {
          this.ScheduledBackup(req?.user, req?.storage);
        });
      }
      else {
        app.Manager.add('dbdaily', req?.expression, () => {
          this.ScheduledBackup(req?.user, req?.storage);
        }, {
          start: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      }
      return { msg: "Backup Schedule has been updated succesfully" };
    } catch (error) {
      return { msg: error };
    }
  };
  public saveWeeklyCron = async (req: any) => {
    try {
      let user = await customerLoginModel.findOne({ Username: req?.user })
      if (user?.Role !== 'Admin') return { msg: "Only Admins can do database Backup" };
      let cron = await BackupCronModel.find({});
      if (cron.length) {
        let model = {
          user: "Admin",
          weeklyexpression: req?.expression,
          weeklystorage: req?.storage
        };
        let newCron = await BackupCronModel.updateOne(
          { user: "Admin" },
          { $set: model }
        );
        if (app.Manager.exists('dbweekly')) {
          app.Manager.update("dbweekly", req?.expression, () => {
            this.ScheduledBackup(req?.user, req?.storage);
          });
        }
        else {
          app.Manager.add('dbweekly', req?.expression, () => {
            this.ScheduledBackup(req?.user, req?.storage);
          }, {
            start: true,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        }
        if (newCron)
          return { msg: "Backup Schedule has been updated succesfully" };
      }
      let model = new BackupCronModel();
      model.user = "Admin";
      model.weeklyexpression = req?.expression;
      model.weeklystorage = req?.storage;
      await model.save();
      if (app.Manager.exists('dbweekly')) {
        app.Manager.update("dbweekly", req?.expression, () => {
          this.ScheduledBackup(req?.user, req?.storage);
        });
      }
      else {
        app.Manager.add('dbweekly', req?.expression, () => {
          this.ScheduledBackup(req?.user, req?.storage);
        }, {
          start: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      }
    } catch (error) {
      return null;
    }
  };
  public uploadBackupFiles = async (req) => {
    try {
      if (!req.files) return { ack: "0", msg: "Please select a file" }
      let user = await customerLoginModel.findOne({ Username: req.body.user });
      if (user?.Role !== 'Admin') return { ack: "0", msg: "Only admins can upload backups" };
      let file = req.files.file;
      if (!file.name.startsWith('DB_BACKUP_')) return { ack: "0", msg: "Please upload files with correct name" };
      let newFile = req.files.file.name.split('.')[0];
      if (fs.existsSync(path.join(process.cwd(), `dblocalbackup/${newFile}`))) return { ack: "0", msg: "Backup file already exists" }
      file.mv(path.join(process.cwd(), `${req.files.file.name}`))
      let src = path.join(process.cwd(), `${req.files.file.name}`);
      let dst = path.join(process.cwd(), `dblocalbackup/${req.files.file.name.split('.')[0]}`);
      await extract(src, { dir: dst })
      fs.unlinkSync(src);
      return { ack: "1", msg: "Database Backup Uploaded" };
    } catch (error) {
      return { ack: "0", msg: error }
    }
  }

  public Ellvis_login = async (req) => {
    try {
      let ssl: any = await SETTINGSModel.find({})
      if (ssl.length > 0) {
        ssl = ssl[0].HttpHttps
      }
      else {
        ssl = "http"
      }
      let _url = ssl + "://" + req.ip + secretUtil.ELLVIS_LOGIN;
      if (secretUtil.ENABLE_DEBUG_LOG) {
        logging.logger.info({ url: _url }, `login ellviss, ${req.ip}`);
      }
      let options = {
        method: "POST",
        url: _url,
        headers: {
          "Content-Type": "application/json"
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

      if (secretUtil.ENABLE_DEBUG_LOG) {
        logging.logger.info({ status: "success" }, `logout ellviss successfully, ${req.ip}`);
      }
      return resData;
    } catch (error) {
      if (secretUtil.ENABLE_DEBUG_LOG) {
        logging.logger.info({ exception: error }, `exception in ellviss login, ${req.ip}`);
      }
      return null;
    }
  }
  public IsInOnBoardingDevice =async (ip:any)=>{
    if(ip){
      let device:any = await customerDeviceModel.findOne({IP:ip});
      if(device) return true;
    }
    return false;
  }
  public saveBackupIpList = async (req) => {
    try {
      const allIp: any = await HotbackupIpListModel.findOne({ SpareIp: req.Ip });
      const isExist: any = await customerDeviceModel.findOne({ IP: req.Ip });
      let session: any = '';
      if (allIp || isExist) {
        return { ack: "0", msg: "This IP is already exist in device list" }
      } else {
        let ipIsExixt: any = await encoderModel.findOne({ spareIp: req.Ip });
        let IsOnBoardingDevice =await this.IsInOnBoardingDevice(req.Ip);
        if (ipIsExixt && !IsOnBoardingDevice) {
          return { ack: "0", msg: `This Ip already added as a backup device for Encoder(${ipIsExixt.peerIP})` }
        }
        if (req.deviceType === EllvisModel && !IsOnBoardingDevice) {
          let data = {
            ip: req.Ip,
            username: req.username,
            password: req.password
          }
          let res: any = await this.Ellvis_login(data);
          if (res.accessToken) {
            session = res.accessToken;
          }
          else {
            return { ack: '0', msg: "Unkonwn Device Please Check IP and Password" }
          }
        } else if(!IsOnBoardingDevice) {
          if (req.password) {
            let res: any = await encoderServicesV1.RequestLogin(req.password, req.Ip);
            if (res.status !== "success") {
              return { ack: '0', msg: "please check ip or password" }
            }
            session = res.session.id;
          } else {
            let res: any = await encoderServicesV1.RequestLoginWithoutPassword(req.Ip);
            if (res.status !== "success") {
              return { ack: '0', msg: "please check ip or password" }
            }
            session = res.session.id;
          }
        }
        let model = new HotbackupIpListModel();
        model.SpareIp = req.Ip;
        model.DeviceType = req.deviceType;
        model.Username = req.username;
        model.Password = req.password;
        model.Session = session;
        model.save();


        // all critical mails are cleared here, for no device available
        let allCriticalReports: any = await alarmsReportingModel.find({ StreamID: "No Device Available For Hot Backup", TimeCleared: undefined });
        for (let i = 0; i < allCriticalReports.length; i++) {
          let created: any = allCriticalReports[i]?.TimeCreated;
          let cleared = new Date();
          let diff = cleared.getTime() - created.getTime();
          let timeinterval = commonUtil.msToTime(diff);
          let blob = {
            TimeInterval: timeinterval,
            TimeCleared: cleared
          }
          await alarmsReportingModel.updateOne({ _id: allCriticalReports[i]?._id }, { $set: blob }, { new: true }, (err) => { if (err) return; });
        } //end


        // sending mail for (Cleared : No device available for hot backup)
        let timezone2: any = await customerServicesV1.gettimezone();
        let timezone = timezone2.offset;
        let str = new Date(new Date().getTime() + timezone * 3600000).toUTCString();
        let date = str.substring(0, 16)
        let time = str.substring(16, 25)
        let smtp: any = await SMTPModel.find({});
        let subject: any = [];
        let criticalMailarray: any = [];
        let getAllSystems: any = await systemModel.find({});
        let getAllRegions: any = await regionModel.find({});


        for (let i = 0; i < getAllRegions.length; i++) {
          let regionmails = getAllRegions[i].Email.split(",")
          for (let j = 0; j < regionmails.length; j++) {
            criticalMailarray.push(regionmails[j]);
            subject.push("Critical Alert: Device available for Hot Backup");
          }
        }
        for (let i = 0; i < getAllSystems.length; i++) {
          let systemCriticalMails = getAllSystems[i].Contact.split(",");
          for (let j = 0; j < systemCriticalMails.length; j++) {
            criticalMailarray.push(systemCriticalMails[j])
            subject.push("Critical Alert: Device available for Hot Backup");
          }
        }
        let content = `
                        <h3 style="color:green;">Critical Mail Cleared</h3><br>
                        <p>Device available for hot backup</p><br>
                        Time : ${time}<br>
                        Date: ${date}<br>
                        `
        if (smtp.length !== 0) {
          commonUtil.SendMail(smtp[0].Usermail, smtp[0].Password, smtp[0].Portnumber, smtp[0].Service, content, subject, criticalMailarray, smtp[0].Sendername, smtp[0].isSecure)
        }



        return { ack: "1", msg: "ip inserted successfully" }
      }
    } catch (error) {
      return { ack: "0", msg: error }
    }
  }
  public deleteBackupIpList = async (req) => {
    try {
      await HotbackupIpListModel.remove({ SpareIp: req.Ip })
      return { ack: "1", msg: "ip deleted successfully" }
    } catch (error) {
      return { ack: "0", msg: error }
    }
  }


  public getAllHotBackupIpList = async (req) => {
    try {
      let deviceType: any = await customerDeviceModel.findOne({ IP: req.peerIP });
      if (deviceType) {
        deviceType = deviceType.DeviceType;
      }
      const response = await HotbackupIpListModel.find({ $and: [{ DeviceType: deviceType }, { inUse: { $ne: true } }] });
      return response;
    } catch (error) {
      return { ack: "0", msg: error }
    }
  }
  public getAllHotbackupIpForSetting = async (req) => {
    try {
      let allDataByDeviceType: any = {
        "ELLVIS9000V3": [],
        "LEGACY": [],
        "RM1121HD/CXF": [],
        "RM1121XD": [],
        "VL4500": [],
        "VL4510": [],
        "VL4510C": [],
        "VL4510H": [],
        "VL4522": [],
        "VL4522Q": [],
      }
      const response: any = await HotbackupIpListModel.find({});
      for (let i = 0; i < response.length; i++) {
        if (!response[i].inUse) {
          allDataByDeviceType[response[i].DeviceType].push(response[i]);
        }
      }
      return allDataByDeviceType;
    } catch (error) {
      return { ack: "0", msg: error }
    }
  }
  public getAllAvailableHotBackupIp = async (req) => {
    try {
      let allDeviceTypes = ["Ellvis9000", "RM1100", "VL4500", "VL4510", "VL4510C", "VL4510H", "VL4522", "VL4522Q"];
      let Ellvis9000: any = await customerDeviceModel.find({$and: [{ DeviceType: { $regex: "Ellvis9000" }}, {Region :{$ne: "OnBoardingRegion"}}] });
      let RM1121HD_CXF: any = await customerDeviceModel.find({$and: [{ DeviceType: { $regex: "RM1121HD/CXF" }}, {Region :{$ne: "OnBoardingRegion"}}] });
      let RM1121XD: any = await customerDeviceModel.find({$and: [{ DeviceType: { $regex: "RM1121XD" }}, {Region :{$ne: "OnBoardingRegion"}}] });
      let VL4500: any = await customerDeviceModel.find({$and: [{ DeviceType: { $regex: "VL4500" }}, {Region :{$ne: "OnBoardingRegion"}}] });
      let VL4510: any = await customerDeviceModel.find({$and: [{ DeviceType: { $regex: "VL4510" }}, {Region :{$ne: "OnBoardingRegion"}}] });
      let VL4510C: any = await customerDeviceModel.find({$and: [{ DeviceType: { $regex: "VL4510C" }}, {Region :{$ne: "OnBoardingRegion"}}] });
      let VL4510H: any = await customerDeviceModel.find({$and: [{ DeviceType: { $regex: "VL4510H" }}, {Region :{$ne: "OnBoardingRegion"}}] });
      let VL4522: any = await customerDeviceModel.find({$and: [{ DeviceType: { $regex: "VL4522" }}, {Region :{$ne: "OnBoardingRegion"}}] });
      let VL4522Q: any = await customerDeviceModel.find({$and: [{ DeviceType: { $regex: "VL4522Q" }}, {Region :{$ne: "OnBoardingRegion"}}] });
      let allDataByDeviceType: any = {
        "Ellvis9000": [],
        "RM1121HD/CXF": [],
        "RM1121XD": [],
        "VL4500": [],
        "VL4510": [],
        "VL4510C": [],
        "VL4510H": [],
        "VL4522": [],
        "VL4522Q": [],
      }

      // if(Ellvis9000.length > 0){
      //   let ellvisBackupDeviceIPs = await customerDeviceModel.
      // }

      if (RM1121HD_CXF.length > 0) {
        for (let i = 0; i < RM1121HD_CXF.length; i++) {
          let RM1100Device = await encoderModel.findOne({ $and: [{ peerIP: RM1121HD_CXF[i].IP }, { spareIp: { $ne: '' } }, { spareIp: { $ne: undefined } }] });
          if (RM1100Device) {
            allDataByDeviceType["RM1121HD/CXF"].push(RM1100Device);
          }
        }
      }
      if (RM1121XD.length > 0) {
        for (let i = 0; i < RM1121XD.length; i++) {
          let RM1121XD_Device = await encoderModel.findOne({ $and: [{ peerIP: RM1121XD[i].IP }, { spareIp: { $ne: '' } }, { spareIp: { $ne: undefined } }] });
          if (RM1121XD_Device) {
            allDataByDeviceType["RM1121XD"].push(RM1121XD_Device);
          }
        }
      }
      if (VL4500.length > 0) {
        for (let i = 0; i < VL4500.length; i++) {
          let VL4500Device = await encoderModel.findOne({ $and: [{ peerIP: VL4500[i].IP }, { spareIp: { $ne: '' } }, { spareIp: { $ne: undefined } }] });
          if (VL4500Device) {
            allDataByDeviceType["VL4500"].push(VL4500Device);
          }
        }
      }
      if (VL4510.length > 0) {
        for (let i = 0; i < VL4510.length; i++) {
          let VL4510Device = await encoderModel.findOne({ $and: [{ peerIP: VL4510[i].IP }, { spareIp: { $ne: '' } }, { spareIp: { $ne: undefined } }] });
          if (VL4510Device) {
            allDataByDeviceType["VL4510"].push(VL4510Device);
          }
        }
      }
      if (VL4510C.length > 0) {
        for (let i = 0; i < VL4510C.length; i++) {
          let VL4510CDevice = await encoderModel.findOne({ $and: [{ peerIP: VL4510C[i].IP }, { spareIp: { $ne: '' } }, { spareIp: { $ne: undefined } }] });
          if (VL4510CDevice) {
            allDataByDeviceType["VL4510C"].push(VL4510CDevice);
          }
        }
      }
      if (VL4510H.length > 0) {
        for (let i = 0; i < VL4510H.length; i++) {
          let VL4510HDevice = await encoderModel.findOne({ $and: [{ peerIP: VL4510H[i].IP }, { spareIp: { $ne: '' } }, { spareIp: { $ne: undefined } }] });
          if (VL4510HDevice) {
            allDataByDeviceType["VL4510H"].push(VL4510HDevice);
          }
        }
      }
      if (VL4522.length > 0) {
        for (let i = 0; i < VL4522.length; i++) {
          let VL4522Device = await encoderModel.findOne({ $and: [{ peerIP: VL4522[i].IP }, { spareIp: { $ne: '' } }, { spareIp: { $ne: undefined } }] });
          if (VL4522Device) {
            allDataByDeviceType["VL4522"].push(VL4522Device);
          }
        }
      }
      if (VL4522Q.length > 0) {
        for (let i = 0; i < VL4522Q.length; i++) {
          let VL4522QDevice = await encoderModel.findOne({ $and: [{ peerIP: VL4522Q[i].IP }, { spareIp: { $ne: '' } }, { spareIp: { $ne: undefined } }] });
          if (VL4522QDevice) {
            allDataByDeviceType["VL4522Q"].push(VL4522QDevice);
          }
        }
      }
      return allDataByDeviceType;
    } catch (error) {
      return { ack: "0", msg: error }
    }
  }
}

export const backupServicesV1 = new BackupServicesV1();
