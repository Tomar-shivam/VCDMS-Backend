import { settings } from '../settings'
import dotenv from 'dotenv';

dotenv.config = settings.GetEnvironmentConfig();

class SecretUtil {

    //Define the node environment
    public PORT = "3001";
    public HOST = "localhost";
    public CHECK_KEYLOK = false;
    public ENABLE_DEBUG_LOG = true;
    //Define MongoDB Server
    public MONGODB_SERVER = "localhost";
    // public MONGODB_USERNAME = "radiant";
    // public MONGODB_PASSWORD = "rccfiber";
    public MONGODB_DBNAME = "rccfiber";
    public MONGODB_PORT = "27017";

    //device type
    public Ellvis = "ELLVIS9000V3";

    // Define the Encoder API Keys 
    public ENCODER_DEVICE_PROPERTIES_PATH = "/api/device";
    public ENCODER_DEVICE_STATUS_PATH = "/api/device/status";
    public ENCODER_DEVICE_START_PATH = "/api/device/start";
    public ENCODER_DEVICE_STOP_PATH = "/api/device/stop";

    public ENCODER_DEVICE_RTSP_START_PATH = "/api/device/startrtsp";
    public ENCODER_DEVICE_RTSP_STOP_PATH = "/api/device/stoprtsp";

    public ENCODER_SET_DEVICENAME_PATH = "/api/device/setname";
    public ENCODER_LOAD_PRESET = "/api/device/loadpreset";
    public ENCODER_UPDATE_PRESET = "/api/device/updatepresets";
    public ENCODER_REQUEST_LOGIN = "/api/device/login";
    public ENCODER_REQUEST_LOGOUT = "/api/device/logout";
    public ENCODER_SET_LOGIN_PROPERTIES = "/api/device/setlogin";
    public ENCODER_SET_LCD_LOGIN_PROPERTIES = "/api/device/setlcdlogin";
    public ENCODER_DEVICE_REBOOT = "/api/device/reboot";
    public ENCODER_SAVESESSION = "/api/device/savesession";
    public CALL_WITH_SESSION = false;
    public ENCODER_UPDATEFIRMWARE = "/api/device/uploadfirmware";
    public ENCODER_FIRMWAREAVAILABLE = "/api/device/firmwareavailable";
    public ENCODER_SWITCHPORT = "/api/device/switchport";
    public ENCODER_SEND_IRCODE = "/api/device/sendircode";


    // Define the Ellvis API End Points 
    public ELLVIS_ACTIVE_CONNECTIONS = "/api/stream/stats";
    public ELLVIS_LOGIN = "/api/auth/login";
    public ELLVIS_LOGOUT = "/api/auth/logout";
    public ELLVIS_CREATE_CONTAINER = "/api/stream";
    public ELLVIS_CHANGE_PASSWORD = "/auth/reset";
    public ELLVIS_EXPORT_PRESET = "/api/stream/export";
    public ELLVIS_IMPORT_PRESET = "/api/stream/import";
    public ELLVIS_CLEAR_PRESET = "/api/stream/backups/clear";
    public ELLVIS_SYSTEM_ACTION = "/api/server";
    public ELLVIS_DELETE_CONTAINER = "/api/stream/";
    public ELLVIS_START_CONTAINER = "/api/stream/start/";
    public ELLVIS_STOP_CONTAINER = "/api/stream/stop/";
    public ELLVIS_UPLOAD_TBD = "/api/stream/backups/upload";
    public ELLVIS_DOWNLOAD_TBD = "/api/stream/backups/download";
    public ELLVIS_ENABLE_DISABLE_SSH = "/api/server/ssh";
    public ELLVIS_VERSION_LICENSING = "/api/about/version";
    public ELLVIS_NETWORK_SETTINGS = "/api/network/nic";
    public ELLVIS_ALL_CONTAINERS = "/api/stream/getcontainers/all";
    public ELLVIS_ALL_CONTAINERS_RUNNING = "/api/stream/getcontainers/running";

    public ELLVIS_USERNAME = "apiuser";

    // //Define the node environment
    // public PORT = process.env.NODE_PORT;
    // public HOST = process.env.NODE_HOST;

    // //Define MongoDB Server
    // public MONGODB_SERVER = process.env.MONGODB_SERVER;
    // public MONGODB_USERNAME = process.env.MONGODB_USERNAME;
    // public MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
    // public MONGODB_DBNAME = process.env.MONGODB_DBNAME;

    // // Define the Encoder API Keys 
    // public ENCODER_DEVICE_PROPERTIES_PATH = process.env.ENCODER_DEVICE_PROPERTIES_PATH!;
    // public ENCODER_DEVICE_STATUS_PATH = process.env.ENCODER_DEVICE_STATUS_PATH!;
    // public ENCODER_DEVICE_START_PATH = process.env.ENCODER_DEVICE_START_PATH!;
    // public ENCODER_DEVICE_STOP_PATH = process.env.ENCODER_DEVICE_STOP_PATH!;
    // public ENCODER_SET_DEVICENAME_PATH = process.env.ENCODER_SET_DEVICENAME_PATH!;
    // public ENCODER_LOAD_PRESET = process.env.ENCODER_LOAD_PRESET!;
    // public ENCODER_UPDATE_PRESET = process.env.ENCODER_UPDATE_PRESET!;
    // public ENCODER_REQUEST_LOGIN = process.env.ENCODER_REQUEST_LOGIN!;
    // public ENCODER_REQUEST_LOGOUT = process.env.ENCODER_REQUEST_LOGOUT!;
    // public ENCODER_SET_LOGIN_PROPERTIES = process.env.ENCODER_SET_LOGIN_PROPERTIES!;
    // public ENCODER_SET_LCD_LOGIN_PROPERTIES = process.env.ENCODER_SET_LCD_LOGIN_PROPERTIES!;
    // public ENCODER_DEVICE_REBOOT = process.env.ENCODER_DEVICE_REBOOT!;
    // public ENCODER_SAVESESSION = process.env.ENCODER_SAVESESSION!;
    // public CALL_WITH_SESSION = process.env.CALL_WITH_SESSION!;
    // // Define the Ellvis API End Points 
    // public ELLVIS_ACTIVE_CONNECTIONS = process.env.ELLVIS_ACTIVE_CONNECTIONS!;
    // public ELLVIS_LOGIN = process.env.ELLVIS_LOGIN;
    // public ELLVIS_CREATE_CONTAINER = process.env.ELLVIS_CREATE_CONTAINER;
    // public ELLVIS_CHANGE_PASSWORD = process.env.ELLVIS_CHANGE_PASSWORD;
    // public ELLVIS_EXPORT_PRESET = process.env.ELLVIS_EXPORT_PRESET;
    // public ELLVIS_IMPORT_PRESET = process.env.ELLVIS_IMPORT_PRESET;
    // public ELLVIS_CLEAR_PRESET = process.env.ELLVIS_CLEAR_PRESET;
    // public ELLVIS_SYSTEM_ACTION = process.env.ELLVIS_SYSTEM_ACTION;
    // public ELLVIS_DELETE_CONTAINER = process.env.ELLVIS_DELETE_CONTAINER;
    // public ELLVIS_START_CONTAINER = process.env.ELLVIS_START_CONTAINER;
    // public ELLVIS_STOP_CONTAINER = process.env.ELLVIS_STOP_CONTAINER;
    // public ELLVIS_UPLOAD_TBD = process.env.ELLVIS_UPLOAD_TBD;
    // public ELLVIS_DOWNLOAD_TBD = process.env.ELLVIS_DOWNLOAD_TBD;
    // public ELLVIS_ENABLE_DISABLE_SSH = process.env.ELLVIS_ENABLE_DISABLE_SSH;
    // public ELLVIS_VERSION_LICENSING = process.env.ELLVIS_VERSION_LICENSING;
    // public ELLVIS_NETWORK_SETTINGS = process.env.ELLVIS_NETWORK_SETTINGS;
    // public ELLVIS_ALL_CONTAINERS = process.env.ELLVIS_ALL_CONTAINERS;
    // public ELLVIS_ALL_CONTAINERS_RUNNING = process.env.ELLVIS_ALL_CONTAINERS_RUNNING;

    // public ELLVIS_USERNAME = process.env.ELLVIS_USERNAME;
    // public ENCODER_UPDATEFIRMWARE = process.env.ENCODER_UPDATEFIRMWARE;

}

export const secretUtil = new SecretUtil();
