package workday

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
)

func init() {
	fmt.Println("Workday Init")
}

type WorkerTimeBlockInfo struct {
	In_Time                        string
	Out_Time                       string
	Calculated_Quantity            string
	Time_Calculation_Tag_ID        string
	Time_Tracking_Set_Up_Option_ID string
	Worker_ID                      string
}

type TimeBlockEnvelope struct {
	Calculated_Time_Block []CalculatedTimeBlock `xml:"Body>Get_Calculated_Time_Blocks_Response>Response_Data>Calculated_Time_Block"`
}

type CalculatedTimeBlock struct {
	Worker_Time_Block_Reference_ID []BlockID                 `xml:"Worker_Time_Block_Reference>ID"`
	Calculated_Time_Block_Data     []CalculatedTimeBlockData `xml:"Calculated_Time_Block_Data"`
}
type BlockID struct {
	ID   string `xml:",chardata"`
	Type string `xml:"type,attr"`
}

type CalculatedTimeBlockData struct {
	In_Time             string `xml:"In_Time"`
	Out_Time            string `xml:"Out_Time"`
	Calculated_Quantity string `xml:"Calculated_Quantity"`

	Status_Reference          StatusReference         `xml:"Status_Reference"`
	Calculation_Tag_Reference CalculationTagReference `xml:"Calculation_Tag_Reference"`
}

type StatusReference struct {
	Status_Reference_Descriptor string    `xml:"Descriptor,attr"`
	Status_Reference            []BlockID `xml:"ID"`
}

type CalculationTagReference struct {
	Calculation_Tag_Reference_Descriptor string    `xml:"Descriptor,attr"`
	Calculation_Tag_Reference            []BlockID `xml:"ID"`
}

var apiPassword, apiUser, apiURL, apiTenant string

func init() {

	getGlobalVars()
}

func getGlobalVars() {
	apiUser = os.Getenv("WORKDAY_API_USER")
	apiPassword = os.Getenv("WORKDAY_API_PASSWORD")
	apiURL = os.Getenv("WORKDAY_API_URL")
	apiTenant = os.Getenv("WORKDAY_API_TENANT")
	if apiUser == "" || apiPassword == "" || apiURL == "" || apiTenant == "" {
		slog.Error(`bdp package error
		error getting environment variables. 
		BDP_TOKEN_REFRESH_URL, WORKDAY_API_USER, WORKDAY_API_PASSWORD, WORKDAY_API_URL, WORKDAY_API_TENANT must be set to valid values. 
		exiting`)
		os.Exit(1)
	}
}

func SortCalculatedTimeBlocks(TimeBlocks map[string]WorkerTimeBlockInfo, data []byte) (int, error) {
	var block TimeBlockEnvelope

	err := xml.Unmarshal(data, &block)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, v := range block.Calculated_Time_Block {
		if len(v.Worker_Time_Block_Reference_ID) > 1 {
			var timeBlock WorkerTimeBlockInfo
			timeBlock.Worker_ID = v.Worker_Time_Block_Reference_ID[0].Type

			timeBlock.Calculated_Quantity = v.Calculated_Time_Block_Data[0].Calculated_Quantity
			timeBlock.In_Time = v.Calculated_Time_Block_Data[0].In_Time
			timeBlock.Out_Time = v.Calculated_Time_Block_Data[0].Out_Time
			timeBlock.Time_Calculation_Tag_ID = v.Calculated_Time_Block_Data[0].Calculation_Tag_Reference.Calculation_Tag_Reference[0].ID
			timeBlock.Time_Tracking_Set_Up_Option_ID = v.Calculated_Time_Block_Data[0].Status_Reference.Status_Reference[0].ID

			TimeBlocks[v.Worker_Time_Block_Reference_ID[1].ID] = timeBlock
			count++
		}
	}
	return count, nil
}

func GetDataFromWorkday(workerID string, startDate string, endDate string) ([]byte, error) {
	var body []byte
	var err error

	// username, tenant, password, startDate, endDate, workerID
	toSend := fmt.Sprintf(requestBody, apiUser, apiTenant, apiPassword, startDate, endDate, workerID)

	url := apiURL + "/ccx/service/" + apiTenant + "/Time_Tracking/v41.1"

	req, err := http.NewRequest("POST", url, bytes.NewBuffer([]byte(toSend)))
	if err != nil {
		slog.Error("could not make request", "error", err)
		return body, err
	}
	req.Header.Set("X-Custom-Header", "myvalue")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		slog.Error("could not execute client.Do", "error", err)
		return body, err
	}
	defer resp.Body.Close()

	//slog.Debug("response:", "response_status", resp.Status, "response_headers", resp.Header)
	body, _ = io.ReadAll(resp.Body)

	return body, err
}

// username, tenant, password, startDate, endDate, WorkerID
const requestBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
    <soap:Header>
        <bsvc:Workday_Common_Header>
            <bsvc:Include_Reference_Descriptors_In_Response>Y</bsvc:Include_Reference_Descriptors_In_Response>
        </bsvc:Workday_Common_Header>
        <wsse:Security 
            soap:mustUnderstand="1"
            xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <wsse:UsernameToken>
                <wsse:Username>%s@%s</wsse:Username>
                <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">%s</wsse:Password>
            </wsse:UsernameToken>
        </wsse:Security>
    </soap:Header>
    <soap:Body>
        <bsvc:Get_Calculated_Time_Blocks_Request bsvc:version="v41.0">
            <bsvc:Request_Criteria>
                <bsvc:Start_Date>%s</bsvc:Start_Date>
                <bsvc:End_Date>%s</bsvc:End_Date>
                <bsvc:Worker_Reference bsvc:Descriptor="string">
                    <bsvc:ID bsvc:type="Employee_ID">%s</bsvc:ID>
                </bsvc:Worker_Reference>
            </bsvc:Request_Criteria>
            <bsvc:Response_Filter>
                <bsvc:Page>1</bsvc:Page>
                <bsvc:Count>999</bsvc:Count>
            </bsvc:Response_Filter>
            <bsvc:Response_Group>
                <bsvc:Include_Worker>true</bsvc:Include_Worker>
                <bsvc:Include_Date>true</bsvc:Include_Date>
                <bsvc:Include_In_Out_Time>true</bsvc:Include_In_Out_Time>
                <bsvc:Include_Calculated_Quantity>true</bsvc:Include_Calculated_Quantity>
                <bsvc:Include_Status>true</bsvc:Include_Status>
                <bsvc:Include_Deleted>false</bsvc:Include_Deleted>
                <bsvc:Include_Calculation_Tags>true</bsvc:Include_Calculation_Tags>
                <bsvc:Include_Last_Updated>true</bsvc:Include_Last_Updated>
                <bsvc:Include_Worktags>true</bsvc:Include_Worktags>
            </bsvc:Response_Group>
        </bsvc:Get_Calculated_Time_Blocks_Request>
    </soap:Body>
</soap:Envelope>`
