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