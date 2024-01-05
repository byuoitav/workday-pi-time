package main

import (
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"runtime"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/byuoitav/workday-pi-time/database"
	"github.com/byuoitav/workday-pi-time/handlers"
)

var updateCacheNowChannel = make(chan struct{})
var logger *slog.Logger

func main() {
	//setup logger
	var logLevel = new(slog.LevelVar)
	var err error
	logger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))
	slog.SetDefault(logger)

	logLevel.Set(slog.LevelInfo)
	if runtime.GOOS == "windows" {
		logLevel.Set(slog.LevelDebug)
		logger.Info("running from Windows, logging set to debug")
	}

	//start up a server to serve the angular site and set up the handlers for the UI to use
	port := flag.String("p", "8463", "port for microservice to av-api communication")
	flag.Parse()
	listeningPort := ":" + *port

	router := gin.Default()

	// health endpoint
	router.GET("/healthz", func(context *gin.Context) {
		context.JSON(http.StatusOK, gin.H{
			"message": "healthy",
		})
	})

	router.GET("/ping", func(context *gin.Context) {
		context.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	router.GET("/status", func(context *gin.Context) {
		context.JSON(http.StatusOK, gin.H{
			"message": "good",
		})
	})

	router.GET("/logLevel/:level", func(context *gin.Context) {
		err = setLogLevel(context.Param("level"), logLevel)
		if err != nil {
			logger.Error("can not set log level", "error", err)
			context.JSON(http.StatusInternalServerError, err.Error())
			return
		}
		context.JSON(http.StatusOK, gin.H{
			"current logLevel": logLevel.Level(),
		})
	})

	router.GET("/logLevel", func(context *gin.Context) {
		context.JSON(http.StatusOK, gin.H{
			"current logLevel": logLevel.Level(),
		})
	})

	//get and return all info to ui for employee
	type employee_dataReturn struct {
		Status   map[string]bool   `json:"status"`
		Employee database.Employee `json:"employee"`
	}
	router.GET("/get_employee_data/:id", func(context *gin.Context) {
		var employee database.Employee
		status := make(map[string]bool)
		errSend := make(map[string]string)
		online, err := handlers.GetEmployeeFromTCD(context, &employee)
		if err != nil {
			errSend["error"] = err.Error()
			context.JSON(http.StatusServiceUnavailable, errSend)
		} else {

			online2, _ := handlers.GetEmployeeFromWorkdayAPI(context, &employee)

			status["TCD_online"] = online
			status["workdayAPI_online"] = online2
			var return_data employee_dataReturn
			return_data.Status = status
			return_data.Employee = employee
			context.JSON(http.StatusOK, return_data)
		}
	})

	//all of the functions to call to add / update / delete / do things on the UI

	//clock in
	//clock out
	router.POST("/punch/:id", func(context *gin.Context) {
		handlers.PostPunch(context)
	})

	router.GET("/", func(context *gin.Context) {
		context.Redirect(http.StatusTemporaryRedirect, "/analog")
	})

	//serve the angular web page
	//frontend := router.Group("/analog")
	router.StaticFS("/assets", http.Dir("./assets"))
	//  middleware.StaticWithConfig(middleware.StaticConfig{
	// 	Root:   "analog",
	// 	Index:  "index.html",
	// 	HTML5:  true,
	// 	Browse: true,
	// })

	server := &http.Server{
		Addr:           listeningPort,
		MaxHeaderBytes: 1024 * 10,
	}

	router.Run(server.Addr)

}

func updateCacheNow(context *gin.Context) {
	fmt.Println("Updating Cache")
	updateCacheNowChannel <- struct{}{}
	context.String(http.StatusOK, "cache update initiated")
}

func setLogLevel(level string, logLevel *slog.LevelVar) error {
	level = strings.ToLower(level)
	if level == "debug" {
		logLevel.Set(slog.LevelDebug)
	} else if level == "info" {
		logLevel.Set(slog.LevelInfo)
	} else if level == "warn" {
		logLevel.Set(slog.LevelWarn)
	} else if level == "error" {
		logLevel.Set(slog.LevelError)
	} else {
		return fmt.Errorf("the debug level must be one of (debug, info, warn, error) received %s", level)
	}
	return nil
}
