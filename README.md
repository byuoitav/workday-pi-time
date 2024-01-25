# pi-time

This is the source code deployed on the raspberry-pi based timeclocks around BYU. Hourly employees use these clocks to clock in/out of their jobs, to review/correct their punches, etc.


* Environment vars required:
  * WORKDAY_DB_HOST
  * WORKDAY_DB_NAME
  * WORKDAY_DB_PASSWORD
  * WORKDAY_DB_PORT
  * WORKDAY_DB_USER


  * BDP_TOKEN_REFRESH_URL


  * WORKDAY_API_PASSWORD
  * WORKDAY_API_TENANT
  * WORKDAY_API_URL
  * WORKDAY_API_USER

* pflags
  * -p -port --TCP port to listen defaults to 8643

* endpoints:
  * GET 127.0.0.1:8463/status
  * GET 127.0.0.1:8463/ping
  * GET 127.0.0.1:8463/healthz
  * GET 127.0.0.1:8463/get_employee_data/byuID - queries our database and Lukes API (might be adding workday to this mix) and serves employee info for the front end
  * GET 127.0.0.1:8463/logLevel/level - sets log level and returns current level
  * GET 127.0.0.1:8463/logLevel - returns current level
  * POST 127.0.0.1:8463/punch/byuID - records a punch (comment is set to os.hostname, punch time is current device time)


