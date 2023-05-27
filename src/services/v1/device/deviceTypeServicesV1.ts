import { deviceTypeModel } from "../../../models/devicetypemodel";
class DeviceTypeServuceV1 {
    public add = async (req?: any) => {
        var resObj = {};
        var deviceType: any = await deviceTypeModel.findOne({ DeviceType : req.DeviceType });
        if(!deviceType){
            try {
                let model = new deviceTypeModel();
                model.DeviceType = req?.DeviceType;
                model.save();
                resObj["ack"] = "1";
                resObj["msg"] = "DeviceType Inserted Successfully";
    
            } catch (err) {
                resObj["ack"] = "0";
                resObj["msg"] = err;
            }
            
        }else{
            resObj["ack"] = "0";
            resObj["msg"] = "DeviceType already exist";
        }
        return resObj;
    };

    public getAll = async (req?: any) => {
        var resObj = {};
        try {
            var deviceType: any = await deviceTypeModel.find({});
            if (deviceType.length > 0) {
                resObj["ack"] = "1";
                resObj["Data"] = deviceType;
            } else {
                resObj["ack"] = "0";
                resObj["Data"] = "No data found.";
            }
        } catch (err) {
            resObj["ack"] = "0";
            resObj["msg"] = err;
        }
        return resObj;
    }

    public delete = async (req?: any) => {
        var resObj = {};
        try {
            var deviceType: any = await deviceTypeModel.deleteOne({ _id: req.id });
            if (deviceType) {
                resObj["ack"] = "1";
                resObj["msg"] = "DeviceType Deleted Successfully";
            }
        } catch (err) {
            resObj["ack"] = "0";
            resObj["msg"] = err;
        }
        return resObj;
    }

    public modify = async (req?: any) => {
        var resObj = {};
        let updatedDate = {
            "$set": {
                "DeviceType": req?.DeviceType,
            }
        }
        try {
            var deviceType: any = await deviceTypeModel.updateOne({ _id: req.id }, updatedDate);
            if (deviceType) {
                resObj["ack"] = "1";
                resObj["msg"] = "DeviceType Updated Successfully";
            }
        } catch (err) {
            resObj["ack"] = "0";
            resObj["msg"] = err;
        }
        return resObj;
    }
    
}

export const deviceTypeServuceV1 = new DeviceTypeServuceV1();