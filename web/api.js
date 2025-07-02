class ApiService {
    async getEmployee(byuID) {
        const url = "http://localhost:8463/get_employee_data/" + byuID;
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
                console.log("Employee data received:", employee);
                window.employee = employee; // Store the employee object globally
                window.timeService = new TimeService(employee);
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
            console.log(json);

            const response = await fetch("http://localhost:8463/punch/" + data.worker_id, {
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
}