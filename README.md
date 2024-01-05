# pi-time

This is the source code deployed on the raspberry-pi based timeclocks around BYU. Hourly employees use these clocks to clock in/out of their jobs, to review/correct their punches, etc.

Environment vars required:
CACHE_DATABASE_LOCATION
SYSTEM_ID - should we just make this hostname??? -jake
EVENT_PROCESSOR_HOST

WSO2
CLIENT_KEY
CLIENT_SECRET
TOKEN_REFRESH_URL - used in both WSO2 and in generating the URL in employeeCache.go

pflags
-p -port --TCP port to listen defaults to 8643

endpoints:
GET 127.0.0.1:8463/status
GET 127.0.0.1:8463/ping
GET 127.0.0.1:8463/healthz
GET 127.0.0.1:8463/get_employee_data/byuID - queries our database and Lukes API (might be adding workday to this mix) and serves employee info for the front end
GET 127.0.0.1:8463/logLevel/level - sets log level and returns current level
GET 127.0.0.1:8463/logLevel - returns current level
POST 127.0.0.1:8463/punch/byuID - records a punch (comment is set to os.hostname, punch time is current device time)


