import { Component } from '@angular/core';
import { ZeroXService } from './shared/services/zero-x.service';
import { TestERC721ZeroXService } from './shared/services/test-zero-x.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'ng-zerox';
  // signedOrder: any;
  // orderHashHex: any;
  signedNFTOrder: any;
  NFTOrderHashHex: any;
  tokenId: any;


  constructor(private zeroX: TestERC721ZeroXService) {

  }

  // createOrder() {
  //   console.log("Start");
  //   this.zeroX.createOrder().then((result) => {
  //     console.log(result);
  //     this.signedOrder = result.signedOrder;
  //     this.orderHashHex = result.orderHashHex;
  //     console.log("End")
  //   },
  //     (error) => console.error(error)
  //   );
  // }

  createNFTOrder() {
    console.log("Start");
    this.zeroX.createNFTOrder().then((result) => {
      console.log(result);
      this.signedNFTOrder = result.signedOrder;
      this.NFTOrderHashHex = result.orderHashHex;
      this.tokenId = result.tokenId;
      console.log("End")
    },
      (error) => console.error(error)
    );
  }  

  // fillOrder() {
  //   console.log("Start");
  //   this.zeroX.fillOrder(this.signedOrder, this.orderHashHex).then(() => 
  //   console.log("End"), 
  //   (error) => console.error(error));
  // }

  fillNFTOrder() {
    console.log("Start");
    this.zeroX.fillNFTOrder(this.signedNFTOrder, this.NFTOrderHashHex, this.tokenId).then(() => 
    console.log("End"), 
    (error) => console.error(error));
  }

}
