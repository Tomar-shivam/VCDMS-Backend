import { NextFunction, Response } from 'express';
import { BaseController } from '../../basecontroller';
import { IFilteredRequest } from "../../../interfaces";
import { CustomerLogin, ICustomerLogin } from "../../../models/customer/login.model";
import { IRegion, Region } from "../../../models/region/region.model"
import { ISystem, System } from "../../../models/region/system.model"
import { customerServicesV1 } from "../../../services/v1/customer/customerservicesv1";
import { CustomerDevice, ICustomerDevice } from "../../../models/ellvis/customerdevice.model";
import { ApiPath, SwaggerDefinitionConstant, ApiOperationPost, ApiOperationPut } from "swagger-express-ts"
import { ISMTP, SMTP } from '../../../models/customer/smtpmodel';
import { ISETTINGS, SETTINGS } from "../../../models/customer/settingsmodel"
import { VERSIONS } from '../../../models/customer/techversionmodel';
import { AlarmsReporting } from '../../../models/reporting/alarmsmodel';
import { UserLoginReporting } from '../../../models/reporting/userlogins';
import { IMAJORALARMS } from '../../../models/customer/majoralarmmodel';
import { DeviceReporting } from '../../../models/reporting/devicereportmodel';
import logging from "../../../logging"
@ApiPath({
    path: "/api/v1",
    name: "Customer API Calls",
    security: { apiKeyHeader: [] },
})

class CustomerControllerV1 extends BaseController {

    /**
     * @description Save customer registration details.
     */

    @ApiOperationPost({
        description: "Api to register a customer",
        path: '/saveregistration',
        summary: "Api to register a customer",
        parameters: {
            body: {
                description: "Enter body",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async CustomerRegistration(req: IFilteredRequest<ICustomerLogin>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.CreateCustomer(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to login a VCDMS customer",
        path: '/logincustomer',
        summary: "Api to login a VCDMS customer",
        parameters: {
            body: {
                description: "Enter body",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async CustomerLogin(req: IFilteredRequest<CustomerLogin>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetCustomer(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    /**
     * @description Save customer registration details.
     */

    @ApiOperationPost({
        description: "Api to get all devices of customer",
        path: '/getalldevices',
        summary: "Api to get all devices of customer",
        parameters: {
            body: {
                description: "Enter customerid",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async GetAllDevices(req: IFilteredRequest<CustomerLogin>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetAllDevices(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to get all devices of customer",
        path: '/getallonboardingdevices',
        summary: "Api to get all devices of customer",
        parameters: {
            body: {
                description: "Enter customerid",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async GetAllOnBoardDevices(req: IFilteredRequest<CustomerLogin>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetAllOnBoardDevices();
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to get all encoders",
        path: '/getallencoders',
        summary: "Api to get all encoders",
        parameters: {
            body: {
                description: "Enter customerid",
                required: false,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async GetAllEncoders(req: IFilteredRequest<CustomerLogin>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetAllEncoders(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to delete a device by _id",
        path: '/deletedevice',
        summary: "Api to delete a device",
        parameters: {
            body: {
                description: "Enter _id",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async DeleteDevice(req: IFilteredRequest<ICustomerDevice>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.DeleteDevice(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }
    @ApiOperationPost({
        description: "Api to delete multiple device ",
        path: '/checkSystemForDevices',
        summary: "Api to delete multiple device",
        parameters: {
            body: {
                description: "Enter _id",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async DeleteMultipleDevice(req: IFilteredRequest<ICustomerDevice>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.DeleteMultipleDevice(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }
    /**
     * @description Get all users.
     */

    @ApiOperationPost({
        description: "Api to get all users",
        path: '/getallusers',
        summary: "Api to get all users",
        parameters: {
            body: {

            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async GetAllUsers(req: IFilteredRequest<CustomerLogin>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetAllUsers();
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to get smtp details",
        path: '/getsmtpdetails',
        summary: "Api to get smtp details",
        parameters: {
            body: {

            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async GetSMTPDetails(req: IFilteredRequest<SMTP>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetSMTPDetails(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to save smtp details",
        path: '/getsmtpdetails',
        summary: "Api to save smtp details",
        parameters: {
            body: {

            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async SaveSMTPDetails(req: IFilteredRequest<ISMTP>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.SaveSMTPDetails(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to check smtp details",
        path: '/checksmtpsession',
        summary: "Api to check smtp details",
        parameters: {
            body: {

            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async CheckSMTPDetails(req: IFilteredRequest<SMTP>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.CheckSMTPDetails(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to save setting http details",
        path: '/getsettingdetails',
        summary: "Api to save setting http details",
        parameters: {
            body: {

            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async SaveSettingDetails(req: IFilteredRequest<ISETTINGS>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.SaveSettingDetails(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    public async CheckSettingDetails(req: IFilteredRequest<SETTINGS>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.CheckSettingDetails(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to get customer data by username",
        path: "/getuserdatabyusername",
        summary: "Api to get user data",
        parameters: {
            body: {
                description: "Enter Username",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Not found",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async GetUserDatabyUsername(req: IFilteredRequest<ICustomerLogin>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetUserData(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.status(400).send(null);
        }
    }
    @ApiOperationPut({
        description: "Api for updating user data",
        path: "/updateuserdata",
        summary: "Api to update user data",
        parameters: {
            body: {
                description: "Enter user data",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Not Found the user",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
        }
    })
    public async UpdateUserData(req: IFilteredRequest<ICustomerLogin>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.UpdateUserData(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }
    public async UpdateProfilePhoto(req: IFilteredRequest<ICustomerLogin>, res: Response, next: NextFunction) {
        try {
            res.header("Access-Control-Allow-Origin", "*");
            const requestResult = await customerServicesV1.UpdateProfilePhoto(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPut({
        description: "Api to update password",
        path: "/changepassword",
        summary: "Change password",
        parameters: {
            body: {
                description: "Enter new password",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            },
            400: {
                description: "Could not chnage password",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT
            }
        }
    })

    public async verifyPassword(req: IFilteredRequest<ICustomerLogin>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.verifyPassword(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to save version",
        path: '/getversion',
        summary: "Api to save version",
        parameters: {
            body: {

            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async SaveVersions(req: IFilteredRequest<VERSIONS>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.SaveVersions(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }



    public async CheckVersions(req: IFilteredRequest<VERSIONS>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.CheckVersions(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to send a test mail",
        path: '/testmail',
        summary: "Api to send a test mail",
        parameters: {
            body: {

            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async TestMail(req: IFilteredRequest<SMTP>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.TestMail(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to delete a user",
        path: '/deleteuser',
        summary: "Api to delete a user",
        parameters: {
            body: {

            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async DeleteUser(req: IFilteredRequest<ICustomerLogin>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.DeleteUser(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    /**
    * @description save device.
    */

    @ApiOperationPost({
        description: "Api to create new device",
        path: '/createdevice',
        summary: "Api to create new device",
        parameters: {
            body: {
                description: "Enter body",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async CreateDevice(req: IFilteredRequest<CustomerDevice>, res: Response, next: NextFunction) {
        const requestResult = await customerServicesV1.CreateDevice(req.body);
        return res.send(requestResult);
    }

    public async saveManagementIP(req: IFilteredRequest<CustomerDevice>, res: Response, next: NextFunction) {
        const requestResult = await customerServicesV1.saveManagementIP(req.body);
        return res.send(requestResult);
    }

    @ApiOperationPost({
        description: "Api to create new region",
        path: '/createregion',
        summary: "Api to create new region",
        parameters: {
            body: {
                description: "Enter body",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async CreateRegion(req: IFilteredRequest<Region>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.CreateRegion(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message);
        }
    }

    @ApiOperationPost({
        description: "Api to get all regions of customer",
        path: '/getalldevices',
        summary: "Api to get all regions of customer",
        parameters: {
            body: {
                description: "Enter customerid",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async GetAllRegion(req: IFilteredRequest<Region>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.GetAllRegions(req.body)

            res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message);
        }
    }

    @ApiOperationPost({
        description: "Api to delete a region by _id",
        path: '/deleteregion',
        summary: "Api to delete a region",
        parameters: {
            body: {
                description: "Enter _id",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async DeleteRegion(req: IFilteredRequest<IRegion>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.DeleteRegion(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to create new system",
        path: '/createsystem',
        summary: "Api to create new system",
        parameters: {
            body: {
                description: "Enter body",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async CreateSystem(req: IFilteredRequest<System>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.CreateSystem(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message);
        }
    }

    @ApiOperationPost({
        description: "Api to get all systems of customer",
        path: '/getallsystems',
        summary: "Api to get all systems of customer",
        parameters: {
            body: {
                description: "Enter customerid",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async GetAllSystems(req: IFilteredRequest<System>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.GetAllSystems(req.body)
            res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message);
        }
    }

    @ApiOperationPost({
        description: "Api to get alarm report",
        path: '/getalarmreport',
        summary: "Api to get alarm report",
        parameters: {
            body: {
                description: "Enter AlarmID",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async GetAlarmReport(req: IFilteredRequest<AlarmsReporting>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetAlarmReport(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    public async GetSearchDetails(req: IFilteredRequest<AlarmsReporting>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetSearchDetails(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }



    @ApiOperationPost({
        description: "Api to get user report",
        path: '/getalarmreport',
        summary: "Api to get user report",
        parameters: {
            body: {
                description: "Enter customerID",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })
    public async GetUserReport(req: IFilteredRequest<UserLoginReporting>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetUserReport(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    public async GetUserReportExport(req: IFilteredRequest<UserLoginReporting>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetUserReportExport(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    public async GetDeviceReport(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetDeviceReport(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    public async GetUserSearchDetails(req: IFilteredRequest<UserLoginReporting>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetUserSearchDetails(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    public async GetDeviceReportSearchDetails(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.GetDeviceReportSearchDetails(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to save major alarm details",
        path: '/savemajoralarm',
        summary: "Api to save major alarm details",
        parameters: {
            body: {
                description: "Enter _id",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async SaveMajorAlarm(req: IFilteredRequest<IMAJORALARMS>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.SaveMajorAlarm(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    public async CheckMajorAlarm(req: IFilteredRequest<IMAJORALARMS>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.CheckMajorAlarm(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to delete a system by _id",
        path: '/deletesystem',
        summary: "Api to delete a system",
        parameters: {
            body: {
                description: "Enter _id",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async DeleteSystem(req: IFilteredRequest<ISystem>, res: Response, next: NextFunction) {
        try {
            const requestResult = await customerServicesV1.DeleteSystem(req.body);
            return res.send(requestResult);
        } catch (error:any) {
            return res.send(null);
        }
    }

    @ApiOperationPost({
        description: "Api to check session",
        path: '/checksession',
        summary: "Api to check session",
        parameters: {
            body: {
                description: "Enter _id",
                required: true,
            }
        },
        responses: {
            200: {
                description: "Success",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            },
            404: {
                description: "Fail",
                type: SwaggerDefinitionConstant.Response.Type.OBJECT,
            }
        },
    })

    public async CheckSession(req: IFilteredRequest<CustomerLogin>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.CheckSession(req?.body);
            if (requestResult.ack === "1") {
                return res.send(requestResult.customer)
            }
            if (requestResult.ack === "2") {
                return res.send('not found')
            }
            return res.status(404).send(null);
        } catch (error:any) {
            return res.status(404).send(error.message)
        }
    }

    public async CustomerLogout(req: IFilteredRequest<CustomerLogin>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.CustomerLogout(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }


    public async CheckLicenseNumber(req: IFilteredRequest<any>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.CheckLicenseNumber(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }

    public async GetDeviceCSV(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.GetDeviceCSV(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }
    public async purgeData(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.purgeData(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }
    public async purgeDataUser(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.purgeDataUser(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }
    public async purgeDataAlarm(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.purgeDataAlarm(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }
    public async purgeDataAlarmCleared(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.purgeDataAlarmCleared(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }
    public async purgeDataUserLogout(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.purgeDataUserLogout(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }
    public async settimezone(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.settimezone(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }
    public async gettimezone(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.gettimezone(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }
    public async getcurrenttimezone(req: IFilteredRequest<DeviceReporting>, res: Response, next: NextFunction) {
        try {
            let requestResult = await customerServicesV1.getcurrenttimezone(req.body)
            return res.send(requestResult)
        } catch (error:any) {
            return res.send(error.message)
        }
    }

}

export const customerControllerV1 = new CustomerControllerV1();