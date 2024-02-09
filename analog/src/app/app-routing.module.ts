import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { APP_BASE_HREF } from "@angular/common";

import { ClockComponent } from "./components/clock/clock.component";
import { LoginComponent } from "./components/login/login.component";
import { EmployeeResolverService } from "./services/employee-resolver.service";
import { DateSelectComponent } from "./components/date-select/date-select.component";
import { DayOverviewComponent } from "./components/day-overview/day-overview.component";
import { ScreenSaverComponent } from "./components/screen-saver/screen-saver.component";

const routes: Routes = [
  {
    path: "",
    redirectTo: "/login",
    pathMatch: "full"
  },
  {
    path: "",
    // component: AppComponent,
    children: [
      {
        path: "screensaver",
        component: ScreenSaverComponent
      },
      {
        path: "login",
        component: LoginComponent
      },
      {
        path: "employee/:id",
        runGuardsAndResolvers: 'pathParamsOrQueryParamsChange', 
        resolve: {
          empRef: EmployeeResolverService
        },
        children: [
          {
            path: "",
            component: ClockComponent
          },
          {
            path: "date",
            children: [
              {
                path: "",
                component: DateSelectComponent
              },
              {
                path: ":date",
                component: DayOverviewComponent,
              }
            ]
          }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
  exports: [RouterModule],  
  providers: [
    {
      provide: APP_BASE_HREF,
      useValue: "/analog"
    }
  ],
})
export class AppRoutingModule {}
