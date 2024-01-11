package handlers

import (
	"log/slog"
	"net/http"
	"os"

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

// Punch adds an in or out punch as determined by the body sent
func PostPunch(context *gin.Context) {
	var incomingRequest database.Punch
	byuID := context.Param("id")
	slog.Debug("PostPunch with byuID: " + byuID)

	err := context.BindJSON(&incomingRequest)
	if err != nil {
		context.String(http.StatusBadRequest, err.Error())
	}
	hostname, err := os.Hostname()

	incomingRequest.Comment = "Wall Clock Punch from: " + hostname
	if err != nil {
		slog.Error("error geting hostname", "error", err)
		context.String(http.StatusBadRequest, err.Error())
	}
	response, err := database.WritePunch(incomingRequest)
	if err != nil {
		slog.Error("error writing punch to database", "error", err)
		context.String(http.StatusBadRequest, err.Error())
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
