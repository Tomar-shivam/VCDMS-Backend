import { INTERNAL_SERVER_ERROR } from "../constants";
import { Response } from "express";
import { IResponseMessage } from "../interfaces/endresponseinterface";
import { exec } from "child_process";
import fs from 'fs'
import path from "path";



function execute(cmd: string) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (!stdout) {
                if (stderr) {
                    resolve({ output: "" });
                }
                if (err) {
                    resolve({ output: "" });
                }
            }
            resolve({ output: stdout });
        });
    })
}
export function handleError(res: Response, err: Error, customeErr?: string, data: any = {}): Response {
    return res.status(INTERNAL_SERVER_ERROR.headerCode).json({
        messages: customeErr || INTERNAL_SERVER_ERROR.message,
        statusCode: INTERNAL_SERVER_ERROR.statusCode,
        data
    })
}

export function sendResponse(res: Response, respMessage: IResponseMessage, data: any = {}): Response {
    return res.status(respMessage.headerCode).json({
        message: respMessage.message,
        statusCode: respMessage.statusCode,
        data
    })
}
export async function validateLicense(cmd: string) {

    if (!fs.existsSync(process.cwd() + "/upload")) {
        fs.mkdirSync(process.cwd() + "/upload", { recursive: true })
    }

    let check_dongle = path.join(process.cwd(), "upload", "dongle_check.txt")
    try {
            if (fs.existsSync(process.cwd() + "/upload/dongle_check.txt")) {
                const stats = fs.statSync(check_dongle);
                // size in byte
                if (stats && stats.size > 500000) {
                    // 50000 byte== 50kbstats 
                    fs.truncate(check_dongle, 0, function () { })
                }
            }

    } catch (err) {
        return
    }
    // if(cmd ==='check-key')p =  path.join(process.cwd(), "upload","license_valid.txt"); else p = path.join(process.cwd(), 'upload', "license_count.txt");
    try {

        return new Promise((resolve, reject) => {
            execute(`./license kV8s$^HcQ-QV+nHr^eUuJr8puB7Lg6zz ${cmd}`).then((status: any) => {
                if (cmd == 'check-key' && status["output"] == "1") {
                    if (fs.existsSync(check_dongle)) fs.appendFileSync(check_dongle, "License Check Suceess :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + "," + "\r\n")
                    else {
                        let stream = fs.createWriteStream(check_dongle);
                        stream.once('open', () => {
                            stream.write("License Check Suceess :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + ", " + "\r\n");
                            stream.end();
                        })
                    }
                    // file write with success output
                    // continue vcdms
                }
                else if (cmd == 'check-key' && status["output"] == "0") {
                    if (fs.existsSync(check_dongle)) fs.appendFileSync(check_dongle, "License Expired :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + "," + "\r\n")
                    else {
                        let stream = fs.createWriteStream(check_dongle);
                        stream.once('open', () => {
                            stream.write("License Expired :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + ", " + "\r\n");
                            stream.end();
                        })
                    }

                    // file write with validation expired output
                    // dis-continue vcdms
                    // msg: 
                }
                else if (cmd == 'check-license' && status["output"] != "0") {
                    if (fs.existsSync(check_dongle)) fs.appendFileSync(check_dongle, "License Count :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + "," + "\r\n")
                    else {
                        let stream = fs.createWriteStream(check_dongle);
                        stream.once('open', () => {
                            stream.write("License Count :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + ", " + "\r\n");
                            stream.end();
                        })
                    }
                }
                else if (cmd == 'check-license' && status["output"] == "0") {
                    if (fs.existsSync(check_dongle)) fs.appendFileSync(check_dongle, "License Count :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + "," + "\r\n")
                    else {
                        let stream = fs.createWriteStream(check_dongle);
                        stream.once('open', () => {
                            stream.write("License Count :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + ", " + "\r\n");
                            stream.end();
                        })
                    }
                }
                else {
                    if (fs.existsSync(check_dongle)) fs.appendFileSync(check_dongle, "Dongle not inserted :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + "," + "\r\n")
                    else {
                        let stream = fs.createWriteStream(check_dongle);
                        stream.once('open', () => {
                            stream.write("Dongle Not Inserted :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + ", " + "\r\n");
                            stream.end();
                        })
                    }
                    // file write with dongle not inserted output
                    // dis-continue vcdms
                    // msg: 
                }

                resolve(status);
            }).catch(err => {

                var errorjson = { "error": err }
                if (fs.existsSync(check_dongle)) {
                    fs.appendFileSync(check_dongle, JSON.stringify(errorjson) + " : " + new Date().toLocaleString() + "," + "\r\n")
                } else {
                    let stream = fs.createWriteStream(check_dongle);
                    stream.once('open', () => {
                        stream.write(JSON.stringify(errorjson) + " : " + new Date().toLocaleString() + "," + "\r\n");
                        stream.end();
                    })
                }
            })
        })
    } catch (error) {
        var errorjson = { "promiseerror": error }
        if (fs.existsSync(check_dongle)) {
            fs.appendFileSync(check_dongle, JSON.stringify(errorjson) + " : " + new Date().toLocaleString() + "," + "\r\n")
        } else {
            let stream = fs.createWriteStream(check_dongle);
            stream.once('open', () => {
                stream.write(JSON.stringify(errorjson) + " : " + new Date().toLocaleString() + "," + "\r\n");
                stream.end();
            })
        }
    }
}

export async function validateLicensetest(cmd: string) {

    if (!fs.existsSync(process.cwd() + "/uploadtest")) {
        fs.mkdirSync(process.cwd() + "/uploadtest", { recursive: true })
    }
    let check_dongle = path.join(process.cwd(), "uploadtest", "dongle_check.txt")
    // if(cmd ==='check-key')p =  path.join(process.cwd(), "upload","license_valid.txt"); else p = path.join(process.cwd(), 'upload', "license_count.txt");
    try {

        return new Promise((resolve, reject) => {
            execute(`./license kV8s$^HcQ-QV+nHr^eUuJr8puB7Lg6zz ${cmd}`).then((status: any) => {
                if (status["output"] == "1") {
                    if (fs.existsSync(check_dongle)) fs.appendFileSync(check_dongle, "License Check Suceess :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + "," + "\r\n")
                    else {
                        let stream = fs.createWriteStream(check_dongle);
                        stream.once('open', () => {
                            stream.write("License Check Suceess :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + ", " + "\r\n");
                            stream.end();
                        })
                    }
                    // file write with success output
                    // continue vcdms
                }
                else if (status["output"] == "0") {
                    if (fs.existsSync(check_dongle)) fs.appendFileSync(check_dongle, "License Expired :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + "," + "\r\n")
                    else {
                        let stream = fs.createWriteStream(check_dongle);
                        stream.once('open', () => {
                            stream.write("License Expired :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + ", " + "\r\n");
                            stream.end();
                        })
                    }

                    // file write with validation expired output
                    // dis-continue vcdms
                    // msg: 
                }
                else if (cmd == 'check-license' && status["output"] != "0") {
                    if (fs.existsSync(check_dongle)) fs.appendFileSync(check_dongle, "License Count :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + "," + "\r\n")
                    else {
                        let stream = fs.createWriteStream(check_dongle);
                        stream.once('open', () => {
                            stream.write("License Count :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + ", " + "\r\n");
                            stream.end();
                        })
                    }
                }
                else {
                    if (fs.existsSync(check_dongle)) fs.appendFileSync(check_dongle, "Dongle not inserted :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + "," + "\r\n")
                    else {
                        let stream = fs.createWriteStream(check_dongle);
                        stream.once('open', () => {
                            stream.write("Dongle Not Inserted :" + JSON.stringify(status) + " : " + new Date().toLocaleString() + ", " + "\r\n");
                            stream.end();
                        })
                    }
                    // file write with dongle not inserted output
                    // dis-continue vcdms
                    // msg: 
                }

                resolve(status);
            }).catch(err => {

                var errorjson = { "error": err }
                if (fs.existsSync(check_dongle)) {
                    fs.appendFileSync(check_dongle, JSON.stringify(errorjson) + " : " + new Date().toLocaleString() + "," + "\r\n")
                } else {
                    let stream = fs.createWriteStream(check_dongle);
                    stream.once('open', () => {
                        stream.write(JSON.stringify(errorjson) + " : " + new Date().toLocaleString() + "," + "\r\n");
                        stream.end();
                    })
                }
            })
        })
    } catch (error) {
        var errorjson = { "promiseerror": error }
        if (fs.existsSync(check_dongle)) {
            fs.appendFileSync(check_dongle, JSON.stringify(errorjson) + " : " + new Date().toLocaleString() + "," + "\r\n")
        } else {
            let stream = fs.createWriteStream(check_dongle);
            stream.once('open', () => {
                stream.write(JSON.stringify(errorjson) + " : " + new Date().toLocaleString() + "," + "\r\n");
                stream.end();
            })
        }
    }
}
