import { Component } from '@angular/core';
import { ZeroXService } from './shared/services/zero-x.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ng-zerox';

  constructor(private zeroX: ZeroXService) {

  }

  createOrder() {
    console.log("Start");
    this.zeroX.createOrder().then(() => console.log("End"), (error) => console.error(error));
  }

}
