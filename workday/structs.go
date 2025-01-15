package workday

type Log struct {
	Time    string `json:"time"`
	Message string `json:"message"`
	ByuID   string `json:"byuID"`
	Button  string `json:"button"`
	Notify  string `json:"notify"`
}
