class ApiService {
    async getEmployee(byuID) {
        const base = location.origin.split(":");
        let url = base[0] + ":" + base[1];
        let port = base[2];
        url = url + ":" + port + "/get_employee_data/" + byuID;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const json = await response.json();

            if (json.error) {
                if (json.error.includes("no worker")) {
                    window.showErrorPopup("No Worker Matches ID");
                } else {
                    window.showErrorPopup(json.error);
                }
                return null;
            }

            try {
                const employee = new Employee(json.employee);
                const status = json.status || {};
                console.log("Employee data received:", employee);
                window.employee = employee; // Store the employee object globally
                window.timeService = new TimeService(employee);
                window.stats = status; // Store the status globally
                window.unprocessedPunches = json.unprocessed_punches_in_tcd || 0; // Store unprocessed punches globally
                return employee;
            } catch (error) {
                console.error("Error parsing employee data:", error);
                window.showErrorPopup("Error parsing employee data. Please try again.");
                return null;
            }
        } catch (error) {
            window.showErrorPopup("Error communicating with server. Please try again.");
            return null;
        }
    }

    async punch(data) {
        try {
            const json = JSON.stringify(data); // Serialize the data
            const base = location.origin.split(":");
            let url = base[0] + ":" + base[1];
            let port = base[2];
            url = url + ":" + port + "/punch/" + data.worker_id;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: json
            });

            if (!response.ok) {
                throw new Error(`Error punching: ${response.statusText}`);
            }

            return response;
        } catch (e) {
            console.error("Error punching", e);
            return e;
        }
    }

    async log(message, button) {
        let byuID = window.employee ? window.employee.worker_id : null;
        let strbyuID = byuID !== null && byuID !== undefined ? String(byuID) : null;
        let strButton = button !== null && button !== undefined ? String(button) : null;
        let logData = {
            "time": new Date().toISOString(),
            "message": String(message),
            "byuID": strbyuID,
            "button": strButton,
            "notify": "false"
        };

        try {
            const json = JSON.stringify(logData); // Serialize the data
            const base = location.origin.split(":");
            let url = base[0] + ":" + base[1];
            let port = base[2];
            // Encode the message to ensure it's a valid URL component
            const encodedMessage = encodeURIComponent(message);
            url = url + ":" + port + "/log-entry/level/debug/message/" + encodedMessage;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: json
            });
        } catch (error) {
            console.error("Error logging message:", error);
        }
    }
}

