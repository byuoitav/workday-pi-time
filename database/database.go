package database

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	_ "github.com/lib/pq"
)

type Punch struct {
	Worker_ID                  string `json:"worker_id"`
	Position_Number            string `json:"position_number"`
	Clock_Event_Type           string `json:"clock_event_type"`
	Time_Entry_Code            string `json:"time_entry_code"`
	Comment                    string `json:"comment"`
	Time_Clock_Event_Date_Time string `json:"time_clock_event_date_time"`
}

type Employee struct {
	Employee_Name      string              `json:"Employee_Name"`
	Total_Week_Hours   string              `json:"Total_Week_Hours"`
	Total_Period_Hours string              `json:"Total_Period_Hours"`
	Time_Entry_Codes   []map[string]string `json:"Time_Entry_Codes"` //time_code_group : ui_name - uses data from time_entry_code_map and employee_cache
	Positions          []Position          `json:"Positions"`
	Period_Punches     []PeriodPunches     `json:"Period_Punches"`
	Period_Blocks      []PeriodBlocks      `json:"Period_Blocks"`
}

type Position struct {
	Position_Number             string `json:"Position_Number"`
	Primary_Position            string `json:"Primary_Position"`
	Business_Title              string `json:"Business_Title"`
	Position_Total_Week_Hours   string `json:"Position_Total_Week_Hours"`
	Position_Total_Period_Hours string `json:"Position_Total_Period_Hours"`
}

// Punches not related to a time block
type PeriodPunches struct {
	Position_Number            string `json:"Position_Number"`
	Business_Title             string `json:"Business_Title"`
	Clock_Event_Type           string `json:"Clock_Event_Type"`
	Time_Clock_Event_Date_Time string `json:"Time_Clock_Event_Date_Time"`
}

// time blocks are matched clock in and out events
type PeriodBlocks struct {
	Position_Number                string `json:"Position_Number"`
	Business_Title                 string `json:"Business_Title"`
	Time_Clock_Event_Date_Time_IN  string `json:"Time_Clock_Event_Date_Time_IN"`
	Time_Clock_Event_Date_Time_OUT string `json:"Time_Clock_Event_Date_Time_OUT"`
	Length                         string `json:"length"`
}

// JSON from workday API
type WorkdayEmployeeTimeReport struct {
	Report_Entry []WorkdayWorkerTimeData `json:"Report_Entry"`
}
type WorkdayWorkerTimeData struct {
	Worker_ID         string              `json:"employee_id"`
	Time_Code_Groups  []string            `json:"time_code_group"`
	Time_Blocks       []WorkdayTimeBlocks `json:"time_blocks"`
	Time_Clock_Events []WorkdayTimeEvents `json:"time_clock_events"`
}

type WorkdayTimeBlocks struct {
	Reported_Date string `json:"reported_date"`
	Hours         string `json:"hours"`
	Time_Type     string `json:"time_type"`
	Reference_ID  string `json:"reference_id"`
	Position      string `json:"position"`
}

type WorkdayTimeEvents struct {
	Clock_Event_Time string `json:"clock_event_time"`
	Clock_Event_Type string `json:"clock_event_type"`
	Position_Ref_ID  string `json:"position_ref_id"`
	Position_Descr   string `json:"position_descr"`
	Timeblock_Ref_ID string `json:"timeblock_ref_id"`
}

var db *sql.DB

const database_timeout = "5"

var apiPassword, apiUser, tokenRefreshURL, apiURL, apiTenant, bdpPageSize string

func init() {
	var err error
	slog.Info("getting environment variables for databaseIO package")
	var (
		host     = os.Getenv("WORKDAY_DB_HOST")
		user     = os.Getenv("WORKDAY_DB_USER")
		password = os.Getenv("WORKDAY_DB_PASSWORD")
		dbname   = os.Getenv("WORKDAY_DB_NAME")
	)
	port, err := strconv.Atoi(os.Getenv("WORKDAY_DB_PORT"))
	if err != nil {
		panic("WORKDAY_DB_PORT is not an int")
	}
	if host == "" || port == 0 || user == "" || password == "" || dbname == "" {
		slog.Info("error getting environment variables, exiting")
		os.Exit(1)
	}
	slog.Info("got environment variables:", "host:", host, "port:", port, "user:", user, "password:", password, "dbname:", dbname)
	//setup database connection
	slog.Info("setting up database connection")
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s "+
		"password=%s dbname=%s sslmode=disable connect_timeout=%s",
		host, port, user, password, dbname, database_timeout)

	db, err = sql.Open("postgres", psqlInfo)
	if err != nil {
		slog.Error("error opening database:", err)
		os.Exit(1)
	}
	getGlobalVars()
}

func getGlobalVars() {
	tokenRefreshURL = os.Getenv("BDP_TOKEN_REFRESH_URL")
	apiUser = os.Getenv("WORKDAY_API_USER")
	apiPassword = os.Getenv("WORKDAY_API_PASSWORD")
	apiURL = os.Getenv("WORKDAY_API_URL")
	apiTenant = os.Getenv("WORKDAY_API_TENANT")
	bdpPageSize = os.Getenv("BDP_PAGE_SIZE")
	if tokenRefreshURL == "" || apiUser == "" || apiPassword == "" || apiURL == "" || apiTenant == "" {
		slog.Error(`bdp package error
		error getting environment variables. 
		BDP_TOKEN_REFRESH_URL, WORKDAY_API_USER, WORKDAY_API_PASSWORD, WORKDAY_API_URL, WORKDAY_API_TENANT, BDP_PAGE_SIZE must be set to valid values. 
		exiting`)
		os.Exit(1)
	}

}

func DatabaseIO(query string) (*sql.Rows, error) {
	slog.Info("Stats", "DatabaseOpenConnections", db.Stats().OpenConnections)
	var data *sql.Rows
	var err error
	slog.Info("attempting database query", "query", query)

	data, err = db.Query(query)
	fmt.Println("Data", data)
	fmt.Println("Error", err)
	if err != nil {
		return data, fmt.Errorf("error inserting into database with string:\n%s\n error: %w", query, err)
	}

	slog.Info("database query successful", "Data", data)
	return data, nil
}

// write a single punch to the postgres database - called form each individual pi on a punch event
func WritePunch(punch Punch) error {
	hostname, err := os.Hostname()
	if err != nil {
		return fmt.Errorf("error gettng hostname: %w", err)
	}
	dateTime := time.Now()
	formattedDateTime := dateTime.Format(time.RFC1123Z) // formats to this style for postgres and workday: "02 Jan 06 15:04 -0700"

	query := fmt.Sprintf(`INSERT INTO workday.timeevents(employee_id, position_id, clock_event_type, time_entry_code, "comment", time_clock_event_date_time, pi_hostname)
	VALUES('%s', '%s', '%s', '%s', '%s', '%s', '%s');`, punch.Worker_ID, punch.Position_Number, punch.Clock_Event_Type, punch.Time_Entry_Code, punch.Comment, formattedDateTime, hostname)
	slog.Info("sending database query", "Query", query)
	data, err := DatabaseIO(query)
	if err != nil {
		return fmt.Errorf("error calling DatabaseQuery function %w", err)
	}
	defer data.Close()
	return nil
}

// GetTimesheet returns a timesheet and possible error
func GetWorkerInfo(byuid string, employee *Employee) error {

	return nil
}

// gets time data from workday custom API
// https://wd2-impl-services1.workday.com/ccx/service/customreport2/byu9/ISU_INT265/INT265_Timekeeping_System?employee_id=046660263&start_date=2023-12-17-08%3A00&end_date=2023-12-21-08%3A00&format=json
func GetTimeSheet(byuID string, employeeData *Employee) error {

	slog.Debug("start GetTimeGroups")
	var workerTimeData WorkdayEmployeeTimeReport
	var err error
	url := apiURL + "/ccx/service/customreport2/" + apiTenant + "/ISU_INT265/INT265_Worker_Time_Entry_Codes?format=json"
	slog.Debug("making request to", "url", url)

	client := &http.Client{}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Add("Authorization", "Basic "+basicAuth(apiUser, apiPassword))

	response, err := client.Do(req)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		return err
	}

	err = json.Unmarshal(body, &workerTimeData)
	if err != nil {
		return err
	}
	employeeData.Employee_Name = workerTimeData.Report_Entry[0].Worker_ID
	slog.Debug("end GetTimeGroups")

	return nil
}
func basicAuth(username, password string) string {
	auth := username + ":" + password
	return base64.StdEncoding.EncodeToString([]byte(auth))
}
