import {Component, OnInit} from "@angular/core";
import {Router} from "@angular/router";
import {APIService} from "../../services/api.service";
import { SvgPreloadService } from "src/app/services/svg-preload.service";
import { Log } from "src/app/objects";



@Component({
  selector: "login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"]
})
export class LoginComponent implements OnInit {
  id = "";

  constructor(
    public api: APIService, 
    private router: Router,
    public svgPreloadService: SvgPreloadService
  ) { }

  ngOnInit() {}

  addToID(num: string) {
    if (this.id.length < 9) {
      this.id += num;
    }
  }

  delFromID() {
    if (this.id.length > 0) {
      this.id = this.id.slice(0, -1);
    }
  }

  clickLogin = async () => {
    this.logLogInClick();
    this.login()
  }

  logLogInClick = async () => {
    console.log("Logging login button clicked by " + this.id);
    var log = new Log();
    log.button = "enter";
    log.message = "Clicked Login Button";
    log.byuID = this.id;
    log.time = new Date();
    log.notify = false;
    this.api.sendLog(log).toPromise();
  }

  login = async () => {
    this.loadAnimation();
    const success = await this.router.navigate(["/employee/" + this.id]);
    this.stopAnimation();
    this.id = ""; // reset the id
  };

  loadAnimation = () => {
    const blueCircle = document.getElementById("blueCircle") as HTMLElement;
    blueCircle.classList.add("loader");
  }

  stopAnimation = () => {
    const blueCircle = document.getElementById("blueCircle") as HTMLElement;
    blueCircle.classList.remove("loader");
  }
}
