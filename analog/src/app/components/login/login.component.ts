import {Component, OnInit} from "@angular/core";
import {Router} from "@angular/router";
import {APIService} from "../../services/api.service";


@Component({
  selector: "login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"]
})
export class LoginComponent implements OnInit {
  id = "";

  constructor(public api: APIService, private router: Router) {
  }

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

  login = async () => {
    this.loadAnimation();
    const success = await this.router.navigate(["/employee/" + this.id]);
    this.stopAnimation();
    this.id = ""; // reset the id
  };

  loadAnimation = () => {
    const logo = document.getElementById("medallion") as HTMLObjectElement;
    const blueCircle = logo.contentDocument.getElementById("blueCircle") as HTMLElement;
    blueCircle.classList.add("loader");
  }

  stopAnimation = () => {
    const logo = document.getElementById("medallion") as HTMLObjectElement;
    const blueCircle = logo.contentDocument.getElementById("blueCircle") as HTMLElement;
    blueCircle.classList.remove("loader");
  }
}
