import { NextFunction, Response, Request, request } from 'express';
import { BaseController } from '../../basecontroller';
import { deviceTypeServuceV1 } from '../../../services/v1/device/deviceTypeServicesV1';
import { encoderTemPool } from '../../../services/v1/encoder/encodertempool';

import { IDeviceType } from '../../../models/devicetypemodel';
import { IFilteredRequest } from "../../../interfaces";
import { ApiPath, SwaggerDefinitionConstant, ApiOperationPost } from "swagger-express-ts"
import _ from 'underscore';
@ApiPath({
    path: "/api/v1",
    name: "Encoder API Calls",
    security: { apiKeyHeader: [] },
})
class DeviceTypeControlleV1 extends BaseController {

    /**
     * @description Get currently set properties of encoder.
     */

    @ApiOperationPost({
        description: "Api to add devicetype",
        path: '/devicetype',
        summary: "Api to add devicetype",
        parameters: {
            body: {
                description: "Enter Device IP",
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

    public async add(req: IFilteredRequest<IDeviceType>, res: Response, next: NextFunction) {
        try {
            const requestResult = await deviceTypeServuceV1.add(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    public async getAll(req: IFilteredRequest<IDeviceType>, res: Response, next: NextFunction) {
        try {
            const requestResult = await deviceTypeServuceV1.getAll(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    public async delete(req: IFilteredRequest<IDeviceType>, res: Response, next: NextFunction) {
        try {
            const requestResult = await deviceTypeServuceV1.delete(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

    public async modify(req: IFilteredRequest<IDeviceType>, res: Response, next: NextFunction) {
        try {
            const requestResult = await deviceTypeServuceV1.modify(req.body);
            return res.send(requestResult);
        } catch (error) {
            return res.send(null);
        }
    }

}

export const deviceTypeControlleV1 = new DeviceTypeControlleV1();