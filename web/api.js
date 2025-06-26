class ApiService {
    async getEmployee(byuID) {
        const url = "http://localhost:8463/get_employee_data/" + byuID;
        let employee;
        await fetch(url)
            .then(res => res.json())
            .then(json => {
                if (json.error) {
                    alert("Error: " + json.error);
                    return;
                }
                try {
                    employee = new Employee(json.employee);
                    console.log("Employee data received:", employee);
                }
                catch (error) {
                    console.error("Error parsing employee data:", error);
                    alert("Error: Invalid employee data received.");
                    return;
                }
                window.employee = employee; // Store the employee object globally
                window.timeService = new TimeService(employee);
                return;
            });
    }
}