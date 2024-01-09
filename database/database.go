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

type PunchResponse struct {
	Writen_To_TCD    string `json:"written_to_tcd"`
	Punch_Time       string `json:"punch_time"`
	Clock_Event_Type string `json:"clock_event_type"`
	Hostname         string `json:"hostname"`
}

type Employee struct {
	Employee_Name        string            `json:"employee_name"`
	Worker_ID            string            `json:"worker_id"`
	International_Status string            `json:"international_status"`
	Total_Week_Hours     string            `json:"total_week_hours"`
	Total_Period_Hours   string            `json:"total_period_hours"`
	PositionsList        []string          `json:"positions_list"`
	Time_Entry_Codes     map[string]string `json:"time_entry_codes"` //time_code_group : ui_name - uses data from time_entry_code_map and employee_cache
	Positions            []Position        `json:"positions"`
	Period_Punches       []PeriodPunches   `json:"period_punches"`
	Period_Blocks        []PeriodBlocks    `json:"period_blocks"`
}

type Position struct {
	Position_Number             string `json:"position_number"`
	Primary_Position            string `json:"primary_position"`
	Business_Title              string `json:"business_title"`
	Position_Total_Week_Hours   string `json:"position_total_week_hours"`
	Position_Total_Period_Hours string `json:"position_total_period_hours"`
}

// Punches not related to a time block
type PeriodPunches struct {
	Position_Number            string `json:"position_number"`
	Business_Title             string `json:"business_title"`
	Clock_Event_Type           string `json:"clock_event_type"`
	Time_Clock_Event_Date_Time string `json:"time_clock_event_date_time"`
}

// time blocks - may have matched
type PeriodBlocks struct {
	Position_Number                string `json:"position_number"`
	Business_Title                 string `json:"business_title"`
	Time_Clock_Event_Date_Time_IN  string `json:"time_clock_event_date_time_in"`
	Time_Clock_Event_Date_Time_OUT string `json:"time_clock_event_date_time_out"`
	Length                         string `json:"length"`
	ReferenceID                    string `json:"reference_id"`
	Reported_Date                  string `json:"reported_date"`
}

// JSON from workday API
type WorkdayEmployeeTimeReport struct {
	Report_Entry []WorkdayWorkerTimeData `json:"Report_Entry"`
}

type WorkdayWorkerTimeData struct {
	Worker_ID         string              `json:"employee_id"`
	Time_Code_Groups  string              `json:"time_code_group"`
	Time_Blocks       []WorkdayTimeBlocks `json:"time_blocks"`
	Time_Clock_Events []WorkdayTimeEvents `json:"time_clock_events"`
}

type WorkdayTimeEvents struct {
	Clock_Event_Time string `json:"clock_event_time"`
	Clock_Event_Type string `json:"clock_event_type"`
	Position_Ref_ID  string `json:"position_ref_id"`
	Position_Descr   string `json:"position_descr"`
	Timeblock_Ref_ID string `json:"timeblock_ref_id"`
}

type WorkdayTimeBlocks struct {
	Reported_Date string `json:"reported_date"`
	Hours         string `json:"hours"`
	Time_Type     string `json:"time_type"`
	Reference_ID  string `json:"reference_id"`
	Position      string `json:"position"`
}

type TCD_Employee struct {
	Worker_ID       string `json:"employee_id"`
	BYU_ID          string `json:"byu_id"`
	Last_Updated    string `json:"last_updated"`
	Employee_Name   string `json:"employee_name"`
	Time_Code_Group string `json:"time_code_group"`
	Positions       string `json:"positions"`
}

var db *sql.DB

const database_timeout = "5"

var apiPassword, apiUser, tokenRefreshURL, apiURL, apiTenant string
var payPeriodAnchorDate time.Time

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

	//date to establish the pay period cadence
	anchorDate := "2023-Dec-09"
	loc, _ := time.LoadLocation("America/Denver")
	payPeriodAnchorDate, err = time.ParseInLocation("2006-Jan-02", anchorDate, loc)
	if err != nil {
		slog.Error(err.Error())
		panic(err)
	}
}

func getGlobalVars() {
	tokenRefreshURL = os.Getenv("BDP_TOKEN_REFRESH_URL")
	apiUser = os.Getenv("WORKDAY_API_USER")
	apiPassword = os.Getenv("WORKDAY_API_PASSWORD")
	apiURL = os.Getenv("WORKDAY_API_URL")
	apiTenant = os.Getenv("WORKDAY_API_TENANT")
	if tokenRefreshURL == "" || apiUser == "" || apiPassword == "" || apiURL == "" || apiTenant == "" {
		slog.Error(`bdp package error
		error getting environment variables. 
		BDP_TOKEN_REFRESH_URL, WORKDAY_API_USER, WORKDAY_API_PASSWORD, WORKDAY_API_URL, WORKDAY_API_TENANT must be set to valid values. 
		exiting`)
		os.Exit(1)
	}

}

func DatabaseIO(query string) (*sql.Rows, error) {
	slog.Debug("Stats", "DatabaseOpenConnections", db.Stats().OpenConnections)
	var data *sql.Rows
	var err error
	slog.Debug("attempting database query", "query", query)

	data, err = db.Query(query)
	if err != nil {
		return data, fmt.Errorf("error inserting into database with string:\n%s\n error: %w", query, err)
	}

	slog.Debug("database query successful", "Data", data)
	return data, nil
}

// write a single punch to the postgres database - called form each individual pi on a punch event
func WritePunch(punch Punch) (PunchResponse, error) {
	hostname, err := os.Hostname()
	var punchResponse PunchResponse
	if err != nil {
		return punchResponse, fmt.Errorf("error gettng hostname: %w", err)
	}
	dateTime := time.Now()
	formattedDateTime := dateTime.Format(time.RFC1123Z) // formats to this style for postgres and workday: "02 Jan 06 15:04 -0700"

	query := fmt.Sprintf(`INSERT INTO workday.timeevents(employee_id, position_id, clock_event_type, time_entry_code, "comment", time_clock_event_date_time, pi_hostname)
	VALUES('%s', '%s', '%s', '%s', '%s', '%s', '%s');`, punch.Worker_ID, punch.Position_Number, punch.Clock_Event_Type, punch.Time_Entry_Code, punch.Comment, formattedDateTime, hostname)
	slog.Debug("sending database query", "Query", query)
	data, err := DatabaseIO(query)
	if err != nil {
		return punchResponse, fmt.Errorf("error calling DatabaseQuery function %w", err)
	}
	defer data.Close()
	punchResponse.Punch_Time = formattedDateTime
	punchResponse.Clock_Event_Type = punch.Clock_Event_Type
	punchResponse.Writen_To_TCD = "true"
	return punchResponse, nil
}

// receives list of time codes and returns a map of time codes with their display name from the database table
const getTimeCodesQery = `SELECT time_code_groups, time_entry_code, entry_method, time_code_reference_id, ui_name FROM workday.time_entry_code_map WHERE ui_name is not null ;`

func MapTimeCodes(timeCodes []string) (map[string]string, error) {
	type databaseInfo struct {
		time_code_groups       string
		time_entry_code        string
		entry_method           string
		time_code_reference_id string
		ui_name                string
	}
	data, err := DatabaseIO(getTimeCodesQery)
	toReturn := make(map[string]string)

	var fromDatabase []databaseInfo
	if err != nil {
		return toReturn, fmt.Errorf("error calling DatabaseQuery function %w", err)
	}
	defer data.Close()

	for data.Next() {
		var row databaseInfo
		err := data.Scan(&row.time_code_groups, &row.time_entry_code, &row.entry_method, &row.time_code_reference_id, &row.ui_name)
		if err != nil {
			return toReturn, err
		}
		fromDatabase = append(fromDatabase, row)
	}
	//loop and organize fromDatabase as a map of: "time_code_groups : ui_name" AND "time_code_groups : time_code_reference_id"
	timeUIMap := make(map[string]string)
	timeIDMap := make(map[string]string)
	for _, v := range fromDatabase {
		timeUIMap[v.time_code_groups] = v.ui_name
		timeIDMap[v.time_code_groups] = v.time_code_reference_id
	}

	//use the two maps from above and create the map to be sent to the UI
	for _, v := range timeCodes {
		if timeUIMap[v] != "" {
			toReturn[timeIDMap[v]] = timeUIMap[v]
		}
	}
	return toReturn, nil
}

const getWorkerQuery = `SELECT worker_id, byu_id, last_updated, employee_name, time_code_group, positions FROM workday.employee_cache WHERE byu_id = '%s';`

func GetWorkerInfo(byuid string, employee *Employee) error {
	query := fmt.Sprintf(getWorkerQuery, byuid)
	data, err := DatabaseIO(query)
	if err != nil {
		return fmt.Errorf("error calling DatabaseQuery function on employee_cache database %w", err)
	}
	defer data.Close()

	var emp TCD_Employee
	for data.Next() {

		err := data.Scan(&emp.Worker_ID, &emp.BYU_ID, &emp.Last_Updated, &emp.Employee_Name, &emp.Time_Code_Group, &emp.Positions)
		if err != nil {
			return err
		}
	}
	if emp.Worker_ID == "" {
		return fmt.Errorf("no worker at byuID from employee_cache database: %s", byuid)
	}
	employee.Employee_Name = emp.Employee_Name
	employee.Worker_ID = emp.Worker_ID

	var timeCodeGroupList []string
	err = json.Unmarshal([]byte(emp.Time_Code_Group), &timeCodeGroupList)
	if err != nil {
		return fmt.Errorf("error unmarshalling emp.Time_Code_Group from employee_cache database %w", err)
	}

	//create time code map to put on employee.Time_Entey_Codes
	employee.Time_Entry_Codes, err = MapTimeCodes(timeCodeGroupList)
	if err != nil {
		return fmt.Errorf("could not get the time_entry_code_map  from employee_cache database. error: %w", err)
	}

	//TCD_Employee.Positions
	type databasePosition struct {
		Position_Number    string `json:"position_number"`
		Primary_Position   bool   `json:"primary_position"`
		Is_Active_Position bool   `json:"is_active_position"`
		Business_Title     string `json:"business_title"`
	}
	var databasePositions []databasePosition
	err = json.Unmarshal([]byte(emp.Positions), &databasePositions)
	if err != nil {
		return fmt.Errorf("could not unmarshall positions from employee_cache database. error: %w", err)
	}

	for _, v := range databasePositions {
		if v.Is_Active_Position {
			var position Position
			position.Business_Title = v.Business_Title
			position.Position_Number = v.Position_Number
			position.Primary_Position = strconv.FormatBool(v.Primary_Position)

			employee.Positions = append(employee.Positions, position)
			employee.PositionsList = append(employee.PositionsList, v.Position_Number)
		}
	}

	return nil
}

// ------------------------------------------------------------------------------------------------------Workday custom API start------------------------------------------------------------
// gets time data from workday custom API
func GetTimeSheet(byuID string, employeeData *Employee) error {
	slog.Debug("start GetTimeGroups")
	var workerTimeData WorkdayEmployeeTimeReport
	var err error

	today := time.Now()
	lastMonth := today.AddDate(0, -1, 0)

	url := apiURL + "/ccx/service/customreport2/" + apiTenant + "/ISU_INT265/INT265_Timekeeping_System?employee_id=" + byuID + "&start_date=" + lastMonth.Format(time.DateOnly) + "-00%3A00&end_date=" + today.Format(time.DateOnly) + "-00%3A00&format=json"
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
	if workerTimeData.Report_Entry[0].Worker_ID == "" {
		return fmt.Errorf("no employee_id returned")
	}

	err = MapEmployeeTimeData(employeeData, &workerTimeData.Report_Entry[0])
	if err != nil {
		return err
	}

	err = GetInternationalStatus(employeeData, &workerTimeData.Report_Entry[0])
	if err != nil {
		return err
	}
	slog.Debug("end GetTimeGroups")

	return nil
}

func GetInternationalStatus(employee *Employee, worker *WorkdayWorkerTimeData) error {
	var err error

	//todo make international status work once we get that data from an API
	employee.International_Status = "false"
	return err
}

func ReturnCurrentPayPeriod() (time.Time, time.Time) {
	var start, end time.Time
	today := time.Now() //.AddDate(0, 0, -14) //////////////////////////////////////Testing - need to remove the date shift
	difference := today.Sub(payPeriodAnchorDate)
	weeksSince := int(difference.Hours() / 24 / 7)
	periodsSince := (weeksSince / 2)

	start = payPeriodAnchorDate.AddDate(0, 0, periodsSince*14)
	end = start.AddDate(0, 0, 13)
	end = end.Add(24*time.Hour - 1*time.Second)

	return start, end
}

func ReturnCurrentWeek() (time.Time, time.Time) {
	var start, end time.Time
	today := time.Now() //.AddDate(0, 0, -14) //////////////////////////////////////Testing - need to remove the date shift
	difference := today.Sub(payPeriodAnchorDate)
	weeksSince := int(difference.Hours() / 24 / 7)

	start = payPeriodAnchorDate.AddDate(0, 0, weeksSince*7)
	end = start.AddDate(0, 0, 6)
	end = end.Add(24*time.Hour - 1*time.Second)

	return start, end
}

func MapEmployeeTimeData(employee *Employee, worker *WorkdayWorkerTimeData) error {
	//don't do anything if there is no data for the worker from the Workday API
	if len(worker.Time_Clock_Events) < 1 {
		return fmt.Errorf("no time events found")
	}

	positionTDtoName := make(map[string]string)
	for _, v := range employee.Positions {
		positionTDtoName[v.Position_Number] = v.Business_Title
	}

	//build period_puhcnes
	var periodPunch PeriodPunches

	block_positionNumber := make(map[string]string)
	block_businessTitle := make(map[string]string)
	block_timeIn := make(map[string]string)
	block_timeOut := make(map[string]string)

	//add time events not related to a time block
	for _, v := range worker.Time_Clock_Events {
		if v.Timeblock_Ref_ID == "" { //add to peroid_punches slice if not associated with a time block
			periodPunch.Clock_Event_Type = v.Clock_Event_Type
			periodPunch.Time_Clock_Event_Date_Time = v.Clock_Event_Time
			periodPunch.Business_Title = v.Position_Descr
			periodPunch.Position_Number = v.Position_Ref_ID

			employee.Period_Punches = append(employee.Period_Punches, periodPunch)

		} else { //get the data to use later for time block in/out
			if v.Clock_Event_Type == "Check-in" {
				block_positionNumber[v.Timeblock_Ref_ID] = v.Position_Ref_ID
				block_businessTitle[v.Timeblock_Ref_ID] = v.Position_Descr
				block_timeIn[v.Timeblock_Ref_ID] = v.Clock_Event_Time
			} else if v.Clock_Event_Type == "Check-out" {
				block_timeOut[v.Timeblock_Ref_ID] = v.Clock_Event_Time
			}
		}
	}

	//associate time events to time block
	var periodBlock PeriodBlocks

	//get time period and weekly info
	currentPeriodStart, currentPeriodEnd := ReturnCurrentPayPeriod()
	currentWeekStart, currentWeekEnd := ReturnCurrentWeek()

	positionWeekTotal := make(map[string]float64)
	positionPeriodTotal := make(map[string]float64)
	var totalWeekHours, totalPeriodHours float64

	for _, v := range worker.Time_Blocks {
		periodBlock.Position_Number = v.Position
		//periodBlock.Business_Title = block_businessTitle[v.Reference_ID]
		periodBlock.Business_Title = positionTDtoName[v.Position]
		periodBlock.Length = v.Hours
		periodBlock.Time_Clock_Event_Date_Time_IN = block_timeIn[v.Reference_ID]
		periodBlock.Time_Clock_Event_Date_Time_OUT = block_timeOut[v.Reference_ID]
		periodBlock.ReferenceID = v.Reference_ID
		periodBlock.Reported_Date = v.Reported_Date

		//auto fill in missing in/out
		err := calculateMissingStartEndTimes(&periodBlock)
		if err != nil {
			slog.Warn("time block missing in or out time", "worker_id", worker.Worker_ID, "reference_id", v.Reference_ID)
		}

		//calculate timeBlock period and weekly hours per position and total
		lengthValue, err := strconv.ParseFloat(periodBlock.Length, 64)
		if err != nil {
			lengthValue = 0
			slog.Debug("could not parse lengthValue", "error", err)
		}

		if isInDateRange(&periodBlock, currentWeekStart, currentWeekEnd) {
			positionWeekTotal[periodBlock.Position_Number] = positionWeekTotal[periodBlock.Position_Number] + lengthValue
			totalWeekHours = totalWeekHours + lengthValue
		}

		if isInDateRange(&periodBlock, currentPeriodStart, currentPeriodEnd) {
			positionPeriodTotal[periodBlock.Position_Number] = positionPeriodTotal[periodBlock.Position_Number] + lengthValue
			totalPeriodHours = totalPeriodHours + lengthValue
		}

		//Logs list of time blocks without valid data
		if periodBlock.Position_Number == "" || periodBlock.Business_Title == "" || periodBlock.Length == "" || periodBlock.Time_Clock_Event_Date_Time_IN == "" || periodBlock.Time_Clock_Event_Date_Time_OUT == "" || periodBlock.ReferenceID == "" {
			slog.Warn("incomplete time block", "reference_id", v.Reference_ID)
			slog.Debug("incomplete time block error", "position", v.Position, "business_title", block_businessTitle[v.Reference_ID], "length", v.Hours, " timeIn", block_timeIn[v.Reference_ID], "timeOut", block_timeOut[v.Reference_ID], "reference_id", v.Reference_ID)
		}
		employee.Period_Blocks = append(employee.Period_Blocks, periodBlock)
	}

	//populate position hours to positions table
	for key, position := range employee.Positions {
		var period, week float64
		var ok bool

		period, ok = positionPeriodTotal[position.Position_Number]
		if ok {
			employee.Positions[key].Position_Total_Period_Hours = fmt.Sprintf("%.2f H", period)
		} else {
			employee.Positions[key].Position_Total_Period_Hours = "N/A"
		}

		week, ok = positionWeekTotal[position.Position_Number]
		if ok {
			employee.Positions[key].Position_Total_Week_Hours = fmt.Sprintf("%.2f H", week)
		} else {
			employee.Positions[key].Position_Total_Week_Hours = "N/A"
		}
	}

	if totalPeriodHours > 0 || totalWeekHours > 0 {
		employee.Total_Period_Hours = fmt.Sprintf("%.2f H", totalPeriodHours)
		employee.Total_Week_Hours = fmt.Sprintf("%.2f H", totalWeekHours)
	} else {
		//set default values to be displayed if no worker data comes from workday
		employee.Total_Period_Hours = "N/A"
		employee.Total_Week_Hours = "N/A"
	}

	return nil
}

// look at reported date and determine if it is within the current date range
func isInDateRange(periodBlock *PeriodBlocks, timeStart time.Time, timeEnd time.Time) bool {
	// blockStartTime, err := time.Parse("2006-01-02T15:04:05-07:00", periodBlock.Time_Clock_Event_Date_Time_IN)
	// if err != nil {
	// 	return false
	// }
	// blockEndTime, err := time.Parse("2006-01-02T15:04:05-07:00", periodBlock.Time_Clock_Event_Date_Time_OUT)
	// if err != nil {
	// 	return false
	// }

	// if blockStartTime.After(timeStart) && blockEndTime.Before(timeEnd) {
	// 	return true
	// }

	blockDate, err := time.Parse("2006-01-02", periodBlock.Reported_Date)
	if err != nil {
		return false
	}

	if blockDate.After(timeStart) && blockDate.Before(timeEnd) {
		return true
	}
	return false
}

func calculateMissingStartEndTimes(periodBlock *PeriodBlocks) error {
	length, err := strconv.ParseFloat(periodBlock.Length, 64)
	lengthSeconds := int(length * 60 * 60)
	if err != nil {
		length = 0
	}

	// parse start and end times to time.Time
	var validStart, validEnd bool
	blockStartTime, err := time.Parse("2006-01-02T15:04:05-07:00", periodBlock.Time_Clock_Event_Date_Time_IN)
	if err != nil {
		validStart = false
	} else {
		validStart = true
	}

	blockEndTime, err := time.Parse("2006-01-02T15:04:05-07:00", periodBlock.Time_Clock_Event_Date_Time_OUT)
	if err != nil {
		validEnd = false
	} else {
		validEnd = true
	}

	// blockReportedDate, err := time.Parse("2006-01-02", periodBlock.Reported_Date)
	// if err != nil {
	// 	validEnd = false
	// } else {
	// 	validEnd = true
	// }

	if validEnd && validStart { //return if two valid times are sent - no calculation needed
		return nil
	} else if validEnd {
		//calculate start based on length and valid end
		periodBlock.Time_Clock_Event_Date_Time_IN = blockEndTime.Add(time.Second * -time.Duration(lengthSeconds)).Format("2006-01-02T15:04:05-07:00")

	} else if validStart {
		//calculate end based on length and valid start
		periodBlock.Time_Clock_Event_Date_Time_OUT = blockStartTime.Add(time.Second * time.Duration(lengthSeconds)).Format("2006-01-02T15:04:05-07:00")

	} else {
		periodBlock.Time_Clock_Event_Date_Time_IN = "N/A"  //blockReportedDate.Add(time.Second * time.Duration(3600)).Format("2006-01-02T15:04:05-07:00")
		periodBlock.Time_Clock_Event_Date_Time_OUT = "N/A" //blockReportedDate.Add(time.Second * time.Duration(3600 + float64(lengthSeconds))).Format("2006-01-02T15:04:05-07:00")
	}
	return nil
}

func basicAuth(username, password string) string {
	auth := username + ":" + password
	return base64.StdEncoding.EncodeToString([]byte(auth))
}

//------------------------------------------------------------------------------------------------------Workday custom API end------------------------------------------------------------
