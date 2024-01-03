// package structs

// import (
// 	"time"
// )

// //This file is all of the structs that will be sent to the angular client

// // WebSocketMessage is a wrapper for whatever we're sending down the websocket
// type WebSocketMessage struct {
// 	Key   string      `json:"key"`
// 	Value interface{} `json:"value"`
// }

// // Employee is all of the information about an employee for their timeclock session
// type Employee struct {
// 	ID        string        `json:"id"`
// 	Name      string        `json:"name"`
// 	Jobs      []EmployeeJob `json:"jobs"`
// 	TotalTime TotalTime     `json:"total-time"`
// 	Message   string        `json:"international-message"`
// }

// // TotalTime is a struct to hold pay period and total kinds of time
// type TotalTime struct {
// 	Week      string `json:"week"`
// 	PayPeriod string `json:"pay-period"`
// }

// // EmployeeJob is a job for an employee - sent to the client
// type EmployeeJob struct {
// 	EmployeeJobID         int               `json:"employee-job-id"`
// 	Description           string            `json:"description"`
// 	TimeSubtotals         TotalTime         `json:"time-subtotals"`
// 	ClockStatus           string            `json:"clock-status"`
// 	JobType               string            `json:"job-type"`
// 	IsPhysicalFacilities  *bool             `json:"is-physical-facilities,omitempty"`
// 	HasPunchException     *bool             `json:"has-punch-exception,omitempty"`
// 	HasWorkOrderException *bool             `json:"has-work-order-exception,omitempty"`
// 	OperatingUnit         string            `json:"operating_unit"`
// 	TRCs                  []ClientTRC       `json:"trcs"`
// 	CurrentTRC            ClientTRC         `json:"current-trc"`
// 	CurrentWorkOrder      ClientWorkOrder   `json:"current-work-order"`
// 	WorkOrders            []ClientWorkOrder `json:"work-orders"`
// 	Days                  []ClientDay       `json:"days"`
// }

// // ClientTRC is a TRC sent to the client side
// type ClientTRC struct {
// 	ID          string `json:"id"`
// 	Description string `json:"description"`
// }

// // ClientWorkOrder is the work order structure sent to the client
// type ClientWorkOrder struct {
// 	ID   string `json:"id"`
// 	Name string `json:"name"`
// }

// // ClientDay is the day structure sent to the client
// type ClientDay struct {
// 	Date                  time.Time     `json:"date"`
// 	HasPunchException     *bool         `json:"has-punch-exception,omitempty"`
// 	HasWorkOrderException *bool         `json:"has-work-order-exception,omitempty"`
// 	Punches               []ClientPunch `json:"punches"`
// 	PunchedHours          string        `json:"punched-hours"`

// 	ReportedHours string `json:"reported-hours"`
// }

// // ClientPunch is the punch structure sent to the client
// type ClientPunch struct {
// 	ID            int       `json:"id"`
// 	EmployeeJobID int       `json:"employee-job-id"`
// 	Time          time.Time `json:"time"`
// 	PunchType     string    `json:"type"`
// 	DeletablePair *int      `json:"deletable-pair,omitempty"`
// }

// // ClientWorkOrderEntry is a work order entry sent to the client
// type ClientWorkOrderEntry struct {
// 	ID                     int             `json:"id"`
// 	WorkOrder              ClientWorkOrder `json:"work-order"`
// 	TimeReportingCodeHours string          `json:"time-reporting-code-hours"`
// 	TRC                    ClientTRC       `json:"trc"`
// 	Editable               bool            `json:"editable"`
// }

// // ClientPunchRequest is the punch structure from the client on a punch in or out
// type ClientPunchRequest struct {
// 	Worker_ID                  string `json:"worker_id"`
// 	Position_Number            string `json:"position_number"`
// 	Clock_Event_Type           string `json:"clock_event_type"`
// 	Time_Entry_Code            string `json:"time_entry_code"`
// 	Comment                    string `json:"comment"`
// 	Time_Clock_Event_Date_Time string `json:"time_clock_event_date_time"`
// }
