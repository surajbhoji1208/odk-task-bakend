/**
 * Enum containing all available module names for building dynamic success/error messages
 * Use these enum values in services instead of string literals
 */
export enum ModuleNames {
    // Authentication
    AUTH = "Auth",
    TOKEN = "Token",
    OTP = "OTP",
    PASSWORD = "Password",

    // User Management
    USER = "User",

    // User Management
    ROLE = "Role",
    MODULE = "Module",
    SUBMODULE = "SubModule",

    //Branch Management
    BRANCH = "Branch",

    //Setting Configuration
    SETTINGS = "Settings",
    COUNTRY = "Country",
    COLLEGE = "College",
    COURSE = "Course",

    // Inquiry Checklist
    INQUIRY_CHECKLIST = "Inquiry Check List",

    //Daily Update
    DAILY_UPDATE = "Daily Updates",

    // Lead Stage config
    LEAD_STAGE_CONFIG = "Lead stage config",

    // Lead progress config
    LEAD_PROGRESS_CONFIG = "Performance points configuration",
    LEAD = "Lead",
    LEAD_PROGRESS = "Lead Progress",
    // Performance Tracking
    PERFORMANCE_TRACKING = "Performance Tracking",
    EARN_POINT_ACTIVITY_TYPE = "Activity Type",

    // Followup Schedule
    FOLLOWUP_SCHEDULE = "Follow up Schedule"
}
