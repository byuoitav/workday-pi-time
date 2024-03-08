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

var logger *slog.Logger

func main() {
	var err error

	port := flag.String("p", "8463", "port for microservice to av-api communication")
	logLevelFlag := flag.String("l", "info", "slog log level")
	flag.Parse()

	//setup logger
	var logLevel = new(slog.LevelVar)

	logger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))
	slog.SetDefault(logger)

	logLevel.Set(slog.LevelInfo)
	if runtime.GOOS == "windows" {
		*logLevelFlag = "debug"
		logger.Info("running from Windows, logging set to debug")
	}

	err = setLogLevel(*logLevelFlag, logLevel)
	if err != nil {
		logger.Error("can not set log level", "error", err)
	}

	//start up a server to serve the angular site and set up the handlers for the UI to use
	router := gin.Default()

	router.Use(corsMiddleware())

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
		Status        map[string]bool   `json:"status"`
		Error         []string          `json:"error"`
		Events_In_TCD int               `json:"unprocessed_punches_in_tcd"`
		Employee      database.Employee `json:"employee"`
	}
	router.GET("/get_employee_data/:id", func(context *gin.Context) {
		var employee database.Employee
		var return_data employee_dataReturn
		var err error

		status := make(map[string]bool)
		errSend := make(map[string]string)
		online, err := handlers.GetEmployeeFromTCD(context, &employee)
		if err != nil {
			errSend["error"] = err.Error()
			context.JSON(http.StatusServiceUnavailable, errSend)
		} else {

			online2, err := handlers.GetEmployeeFromWorkdayAPI(context, &employee)
			if err != nil {
				slog.Error("error with handlers.GetEmployeeFromWorkdayAPI ", "error", err)
				return_data.Error = append(return_data.Error, err.Error())
			}
			count, online3, err := handlers.GetEmployeePunchesFromTCD(context, &employee)
			if err != nil {
				slog.Error("error with handlers.GetEmployeePunchesFromTCD ", "error", err)
				return_data.Error = append(return_data.Error, err.Error())
			}
			err = handlers.DetermineIfClockedIn(&employee.Period_Blocks, &employee.Period_Punches, &employee)
			if err != nil {
				slog.Error("error with DetermineIfClockedIn ", "error", err)
				return_data.Error = append(return_data.Error, err.Error())
			}

			status["TCD_employee_cache_online"] = online
			status["workdayAPI_online"] = online2
			status["TCD_timeevents_online"] = online3
			if count > 0 {
				status["unprocessed_punches_in_tcd"] = true
			} else {
				status["unprocessed_punches_in_tcd"] = false
			}

			return_data.Status = status
			return_data.Employee = employee
			return_data.Events_In_TCD = count
			context.JSON(http.StatusOK, return_data)
		}
	})

	//all of the functions to call to add / update / delete / do things on the UI

	//clock in
	//clock out
	router.POST("/punch/:id", func(context *gin.Context) {
		handlers.PostPunch(context)
	})

	router.GET("/getPunches/:id", func(context *gin.Context) {
		var punches []database.Punch
		workerID := context.Param("id")
		punches, err := database.GetEmployeePunchesInTCD(workerID)
		if err != nil {
			context.JSON(http.StatusServiceUnavailable, err)
		}
		context.JSON(http.StatusOK, punches)
	})

	//serve the angular web page
	sitePath := "/analog"
	router.GET("/", func(context *gin.Context) {
		context.Redirect(http.StatusTemporaryRedirect, sitePath)
	})

	webRoot := "./dist/analog"
	fmt.Println("http.Dir(webRoot)", http.Dir(webRoot))
	router.StaticFS(sitePath, http.Dir(webRoot))

	router.NoRoute(func(context *gin.Context) {
		if strings.HasPrefix(context.Request.RequestURI, sitePath) {
			// Only redirect if we are already in the angular sitePath
			context.File(webRoot + "/index.html")
		}
		context.Redirect(http.StatusFound, sitePath)
	})

	listeningPort := ":" + *port
	server := &http.Server{
		Addr:           listeningPort,
		MaxHeaderBytes: 1024 * 10,
	}

	router.Run(server.Addr)

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

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
