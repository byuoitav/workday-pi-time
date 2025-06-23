class ApiService {
    async getEmployee(byuID) {
        const url = "http://localhost:8463/get_employee_data/" + byuID;

        fetch(url)
            .then(res => res.json())
            .then(json => {
                const employee = new Employee(json.employee);

                console.log(`Name: ${employee.name}`);
                console.log(`Clocked in: ${employee.isClockedIn}`);
                console.log(`Total hours: ${employee.totalHoursWorked.toFixed(2)}`);

                console.log("Last punch:", employee.latestPunch?.time);

                employee.periodBlocks.forEach(block => {
                    console.log(`${block.reportedDate}: ${block.length} hrs`);
                });

                window.employee = employee; // Store the employee object globally
            });
    }


}