package handlers

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/byuoitav/common/v2/events"
	"github.com/byuoitav/workday-pi-time/database"
	"github.com/byuoitav/workday-pi-time/event"

	"github.com/gin-gonic/gin"
)

// Returns data from the postgres database - aka the TCD
func GetEmployeeFromTCD(context *gin.Context, employee *database.Employee) (bool, error) {
	online := true
	byuID := context.Param("id")
	slog.Debug("GetEmployeeFromTCD with byuID: " + byuID)

	// get the employee info for this worker
	err := database.GetWorkerInfo(byuID, employee)
	if err != nil {
		online = false
		slog.Error("unable to GetWorkerInfo", "error", err)
		return online, err
	}
	slog.Info("GetEmployeeFromTCD success", "response", online, "id", byuID)
	return online, nil
}

// Attempts to get data from the Workday custom API - returns
func GetEmployeeFromWorkdayAPI(context *gin.Context, employee *database.Employee) (bool, error) {
	// //get the id
	online := true
	byuID := context.Param("id")
	slog.Debug("GetEmployeeFromWorkdayAPI with byuID: " + byuID)

	// //get the timesheet for this guy
	err := database.GetTimeSheet(byuID, employee)
	if err != nil {
		online = false
		slog.Error("unable to GetTimeSheet", "error", err)
		return online, err
	}
	slog.Info("GetEmployeeFromWorkdayAPI success", "response", online, "id", byuID)
	return online, nil
}

// adds in any punches from the TCD that have not been uploaded to Workday - uses employee.Worker_ID - must be defined before running
func GetEmployeePunchesFromTCD(context *gin.Context, employee *database.Employee) (int, bool, error) {
	online := true
	// //get the current punches for employee.Worker_ID
	count, err := database.GetRecentEmployeePunches(employee)
	if err != nil {
		online = false
		slog.Error("unable to GetRecentEmployeePunches", "error", err)
		return count, online, err
	}
	slog.Info("GetEmployeePunchesFromTCD success", "response", online, "worker_id", employee.Worker_ID)
	return count, online, nil
}
func DetermineIfClockedIn(period_blocks *[]database.PeriodBlocks, period_punches *[]database.PeriodPunches, employee *database.Employee) error {
	var errRtn error
	for k := range employee.Positions {
		employee.Positions[k].Clocked_In = "false"

		//find latest clock in
		var lastIn time.Time
		//find latest block
		for _, v := range *period_blocks {
			if (v.Time_Clock_Event_Date_Time_IN == "N/A" || v.Time_Clock_Event_Date_Time_IN == "") || employee.Positions[k].Position_Number != v.Position_Number {
				continue
			}
			blockStartTime, err := time.Parse("2006-01-02T15:04:05-07:00", v.Time_Clock_Event_Date_Time_IN)
			if err != nil {
				errRtn = errors.Join(errRtn, err)
				continue
			}
			if blockStartTime.After(lastIn) {
				lastIn = blockStartTime
			}
		}
		//find latest event
		for _, v := range *period_punches {
			if v.Clock_Event_Type != "Check-in" || employee.Positions[k].Position_Number != v.Position_Number {
				continue
			}
			eventTime, err := time.Parse("2006-01-02T15:04:05-07:00", v.Time_Clock_Event_Date_Time)
			if err != nil {
				errRtn = errors.Join(errRtn, err)
				continue
			}
			if eventTime.After(lastIn) {
				lastIn = eventTime
			}
		}

		//find latest out
		var lastOut time.Time
		//find latest block
		for _, v := range *period_blocks {
			if (v.Time_Clock_Event_Date_Time_OUT == "N/A" || v.Time_Clock_Event_Date_Time_OUT == "") || employee.Positions[k].Position_Number != v.Position_Number {
				continue
			}
			blockEndTime, err := time.Parse("2006-01-02T15:04:05-07:00", v.Time_Clock_Event_Date_Time_OUT)
			if err != nil {
				errRtn = errors.Join(errRtn, err)
				continue
			}
			if blockEndTime.After(lastOut) {
				lastOut = blockEndTime
			}
		}
		//find latest event
		for _, v := range *period_punches {
			if v.Clock_Event_Type != "Check-out" || employee.Positions[k].Position_Number != v.Position_Number {
				continue
			}
			eventTime, err := time.Parse("2006-01-02T15:04:05-07:00", v.Time_Clock_Event_Date_Time)
			if err != nil {
				errRtn = errors.Join(errRtn, err)
				continue
			}
			if eventTime.After(lastIn) {
				lastOut = eventTime
			}
		}

		//compare latest in/out and update the value accordingly
		if lastIn.After(lastOut) {
			employee.Positions[k].Clocked_In = "true"
		}
	}
	return errRtn
}

// Punch adds an in or out punch as determined by the body sent
func PostPunch(context *gin.Context) {
	var err error
	var incomingRequest database.Punch
	worker_ID := context.Param("id")
	slog.Debug("PostPunch with worker_ID: " + worker_ID)
	if len(worker_ID) != 9 {
		err = fmt.Errorf("missing punch data, request must include worker_ID to be a valid request. worker_id received: %s", worker_ID)
		slog.Error("bad request", "error", err)
		context.String(http.StatusBadRequest, err.Error())
		return
	}

	err = context.BindJSON(&incomingRequest)
	if err != nil {
		err = fmt.Errorf("error parsing incoming response body. error: %w", err)
		slog.Error("bad request body", "error", err)
		context.String(http.StatusBadRequest, err.Error())
		return
	}
	if incomingRequest.Clock_Event_Type == "" || incomingRequest.Worker_ID == "" || incomingRequest.Position_Number == "" || incomingRequest.Time_Entry_Code == "" {
		err = fmt.Errorf("missing punch data, request must include worker_id, position_number, clock_event_type, and time_entry_code in the request body")
		slog.Error("bad request", "error", err)
		context.String(http.StatusBadRequest, err.Error())
		return
	}
	hostname, err := os.Hostname()

	incomingRequest.Comment = "Wall Clock Punch from: " + hostname
	if err != nil {
		err = fmt.Errorf("error geting hostname. error: %w", err)
		slog.Error("bad request", "error", err)
		context.String(http.StatusBadRequest, err.Error())
		return
	}
	response, err := database.WritePunch(incomingRequest)
	if err != nil {
		err = fmt.Errorf("error writing punch to database %w", err)
		slog.Error("bad request", "error", err)
		context.String(http.StatusBadRequest, err.Error())
		return
	}
	response.Hostname = hostname
	slog.Info("postPunch success", "response", response)
	context.JSON(http.StatusOK, response)
}

// SendEventHandler passes an event to the messenger
func SendEventHandler(context *gin.Context) {
	var e events.Event
	if err := context.Bind(&e); err != nil {
		context.JSON(http.StatusInternalServerError, err.Error())
	}

	if err := event.SendEvent(e); err != nil {
		context.JSON(http.StatusInternalServerError, err.Error())
	}

	context.JSON(http.StatusOK, "ok")
}
