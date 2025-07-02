# Web UI Docs
The web interface is a single page app written in JavaScript, HTML, and CSS. It provides a user-friendly interface for interacting with the Workday Time Tracking API. 

## How It Works
`index.html` serves as the entry point and contains a div `component-container`. `script.js` is the main javascript file that initializes the app and handles routing. The function `loadComponent` takes a component name and loads the corresponding component from the `components` directory. Each component has an html, css, and js file. Each component contains a `loadPage` function that is called when the component is loaded. Each component also has a `cleanup` function that is called when the component is unloaded.

`loadComponent` by default loads the specified component into the `component-container` div. But if a destination is specified as a second argument, it will load the component into that element instead. This allows for components to be loaded into different parts of the page.

## Example Punch JSON
```
{
  "worker_id": "000000000",
  "position_number": "75123404",
  "clock_event_type": "OUT",
  "time_entry_code": "TT_TEC_Student_Staff_Hours_InOut"
}
```

## Example JSON Employee
```
{
    "status": {
        "TCD_employee_cache_online": true,
        "TCD_timeevents_online": true,
        "unprocessed_punches_in_tcd": false,
        "workdayAPI_online": true
    },
    "error": null,
    "unprocessed_punches_in_tcd": 0,
    "employee": {
        "employee_name": "LastName, FirstName",
        "worker_id": "123456789",
        "international_status": "false",
        "total_week_hours": "5.78 H",
        "total_period_hours": "5.78 H",
        "positions_list": [
            "123456789"
        ],
        "time_entry_codes": [
            {
                "backend_id": "TT_TEC_Student_Staff_Hours_InOut",
                "frontend_name": "Regular Hours",
                "sort_order": 4
            },
            {
                "backend_id": "TT_TEC_Premium_Staff_Hours_InOut",
                "frontend_name": "Premium Hours",
                "sort_order": 2
            }
        ],
        "positions": [
            {
                "position_number": "123456789",
                "primary_position": "false",
                "business_title": "Computer Programmer",
                "supervisory_org": "OIT Resource - AV Services (Brad Streeter)",
                "position_total_week_hours": "5.78 H",
                "position_total_period_hours": "5.78 H",
                "clocked_in": "false"
            },
        ],
        "period_punches": [
            {
                "position_number": "123456789",
                "business_title": "Computer Programmer",
                "clock_event_type": "Check-out",
                "time_clock_event_date_time": "2025-06-24T10:09:57-06:00"
            },
            {
                "position_number": "123456789",
                "business_title": "Computer Programmer",
                "clock_event_type": "Check-in",
                "time_clock_event_date_time": "2025-06-12T10:09:57-06:00"
            }
        ],
        "period_blocks": [
            {
                "position_number": "123456789",
                "business_title": "Computer Programmer",
                "time_clock_event_date_time_in": "2025-05-27T09:18:00-06:00",
                "time_clock_event_date_time_out": "2025-05-27T17:08:00-06:00",
                "length": "7.824722",
                "reference_id": "WORKER_TIME_BLOCK-3-2153185",
                "reported_date": "2025-05-27",
                "time_entry_code_ref_id_from_source": "TT_TEC_Student_Staff_Hours_InOut",
                "time_entry_code_ref_id_name": "Regular Hours"
            },
        ]
    }
} 
```