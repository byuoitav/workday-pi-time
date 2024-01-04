package handlers

import (
	"fmt"
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
	// //get the id
	online := true
	byuID := context.Param("id")
	slog.Debug("GetEmployeeFromTCD with byuID: " + byuID)

	// //get the employee info for this worker
	err := database.GetWorkerInfo(byuID, employee)
	if err != nil {
		online = false
		return online, err
	}
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
		return online, err
	}
	return online, nil
}

// Punch adds an in or out punch as determined by the body sent
func PostPunch(context *gin.Context) {

	byuID := context.Param("id")
	fmt.Println("PostPunch The id is: ", byuID)

	var incomingRequest database.Punch

	err := context.BindJSON(&incomingRequest)
	if err != nil {
		context.String(http.StatusBadRequest, err.Error())
	}
	fmt.Println(incomingRequest)
	incomingRequest.Comment, err = os.Hostname()
	if err != nil {
		context.String(http.StatusBadRequest, err.Error())
		slog.Error("error geting hostname", "error", err)
	}
	err = database.WritePunch(incomingRequest)
	if err != nil {
		context.String(http.StatusBadRequest, err.Error())
		slog.Error("error writing punch to database", "error", err)
	}
	context.JSON(http.StatusOK, "ok")
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
