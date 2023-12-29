package handlers

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/byuoitav/common/v2/events"
	"github.com/byuoitav/workday-pi-time/database"
	"github.com/byuoitav/workday-pi-time/event"

	"github.com/gin-gonic/gin"
)

// Returns data from the postgres database - aka the TCD
func GetEmployeeFromTCD(context *gin.Context) {
	// //upgrade the connection to a websocket
	// webSocketClient := cache.ServeWebsocket(c.Response().Writer, c.Request())

	// //get the id
	byuID := context.Param("id")
	slog.Debug("GetEmployeeFromTCD with byuID: " + byuID)

	// //get the timesheet for this guy
	timesheet, isOffline, err := database.GetTimesheet(byuID)
	fmt.Println("Timesheet", timesheet)
	fmt.Println("isOffline", isOffline)

	if err != nil {

		context.JSON(http.StatusInternalServerError, err)
	}

	context.JSON(http.StatusOK, "ok")
}

// Attempts to get data from the Workday custom API - returns
func GetEmployeeFromWorkdayAPI(context *gin.Context) {
	// //upgrade the connection to a websocket
	// webSocketClient := cache.ServeWebsocket(c.Response().Writer, c.Request())

	// //get the id
	byuID := context.Param("id")
	slog.Debug("GetEmployeeFromWorkdayAPI with byuID: " + byuID)

	// //get the timesheet for this guy
	timesheet, isOffline, err := database.GetTimesheet(byuID)
	fmt.Println("Timesheet", timesheet)
	fmt.Println("isOffline", isOffline)

	if err != nil {

		context.JSON(http.StatusInternalServerError, err)
	}

	context.JSON(http.StatusOK, "ok")
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

	err = database.WritePunch(incomingRequest)
	if err != nil {
		context.String(http.StatusBadRequest, err.Error())
		slog.Error("error writing punch to database", "Error", err)
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
