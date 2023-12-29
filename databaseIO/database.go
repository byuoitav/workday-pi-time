package database

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"time"

	_ "github.com/lib/pq"
	bolt "go.etcd.io/bbolt"
)

type Punch struct {
	Worker_ID                  string `json:"worker_id"`
	Position_Number            string `json:"position_number"`
	Clock_Event_Type           string `json:"clock_event_type"`
	Time_Entry_Code            string `json:"time_entry_code"`
	Comment                    string `json:"comment"`
	Time_Clock_Event_Date_Time string `json:"time_clock_event_date_time"`
}

var db *sql.DB

const database_timeout = "5"

func init() {
	var err error
	slog.Info("getting environment variables for databaseIO package")
	var (
		host     = os.Getenv("WORKDAY_HOST")
		user     = os.Getenv("WORKDAY_USER")
		password = os.Getenv("WORKDAY_PASSWORD")
		dbname   = os.Getenv("WORKDAY_DBNAME")
	)
	port, err := strconv.Atoi(os.Getenv("WORKDAY_PORT"))
	if err != nil {
		panic("WORKDAY_PORT is not an int")
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
	formattedDateTime := dateTime.Format(time.RFC1123Z)
	// formats to this style: "02 Jan 06 15:04 -0700"

	insert := fmt.Sprintf(`INSERT INTO workday.timeevents(employee_id, position_id, clock_event_type, time_entry_code, "comment", time_clock_event_date_time, pi_hostname)
	VALUES('%s', '%s', '%s', '%s', '%s', '%s', '%s');`, punch.Worker_ID, punch.Position_Number, punch.Clock_Event_Type, punch.Time_Entry_Code, punch.Comment, formattedDateTime, hostname)
	slog.Info("sending database query", "Query", insert)
	data, err := DatabaseIO(insert)
	fmt.Println("Data2", data)
	fmt.Println("Error2", err)
	if err != nil {
		return fmt.Errorf("error calling DatabaseQuery function %w", err)
	}
	defer data.Close()
	return nil
}

// GetTimesheet returns a timesheet, a bool if the timesheet was returned in offline mode (from cache), and possible error
func GetTimesheet(byuid string, db *bolt.DB) (bool, error) {

	return false, nil
}
