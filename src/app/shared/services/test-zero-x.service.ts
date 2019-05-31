import { Injectable } from '@angular/core';
import {
  assetDataUtils,
  BigNumber,
  ContractWrappers,
  generatePseudoRandomSalt,
  Order,
  orderHashUtils,
  signatureUtils,
  SignedOrder,
} from '0x.js';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { NETWORK_CONFIGS, TX_DEFAULTS } from '../configs/configs';
import { DECIMALS, NULL_ADDRESS, ZERO } from '../configs/constants';
import { contractAddresses, dummyERC721TokenContracts } from '../configs/contracts';
import { PrintUtils } from '../utils/print_utils';
import { providerEngine } from './provider_engine';
import { getRandomFutureDateInSeconds } from '../utils/utils';


@Injectable({
  providedIn: 'root'
})
export class TestERC721ZeroXService {

  constructor() { }

  async createNFTOrder() {
    PrintUtils.printScenario('Create Order ERC721');
    // Initialize the ContractWrappers, this provides helper functions around calling
    // 0x contracts as well as ERC20/ERC721 token contracts on the blockchain
    const contractWrappers = new ContractWrappers(providerEngine, { networkId: NETWORK_CONFIGS.networkId });
    const etherTokenAddress = contractAddresses.etherToken;
    const dummyERC721TokenContract = dummyERC721TokenContracts[0];
    console.log(dummyERC721TokenContract.address);

    if (!dummyERC721TokenContract) {
        console.log('No Dummy ERC721 Tokens deployed on this network');
        return;
    }
    // Initialize the Web3Wrapper, this provides helper functions around fetching
    // account information, balances, general contract logs
    const web3Wrapper = new Web3Wrapper(providerEngine);
    // const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
    const maker = '0x00c97b9efa7ed5712b835f2635a388cf8631f109';
    const taker = NULL_ADDRESS;

    const printUtils = new PrintUtils(web3Wrapper, contractWrappers, { maker, taker }, { WETH: etherTokenAddress });
    printUtils.printAccounts();

    // the amount the maker is selling of maker asset (1 ERC721 Token)
    const makerAssetAmount = new BigNumber(1);
    // the amount the maker wants of taker asset
    const takerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.1), DECIMALS);
    // Generate a random token id
    // const tokenId = generatePseudoRandomSalt();
    const tokenId = new BigNumber('1');
    // 0x v2 uses hex encoded asset data strings to encode all the information needed to identify an asset
    const makerAssetData = assetDataUtils.encodeERC721AssetData(dummyERC721TokenContract.address, tokenId);
    const takerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);
    let txHash;

    // Mint a new ERC721 token for the maker
    // const mintTxHash = await dummyERC721TokenContract.mint.sendTransactionAsync(maker, tokenId, { from: maker });
    // await printUtils.awaitTransactionMinedSpinnerAsync('Mint ERC721 Token', mintTxHash);

    // Allow the 0x ERC721 Proxy to move ERC721 tokens on behalf of maker
    const makerERC721ApprovalTxHash = await contractWrappers.erc721Token.setProxyApprovalForAllAsync(
        dummyERC721TokenContract.address,
        maker,
        true,
    );
    await printUtils.awaitTransactionMinedSpinnerAsync('Maker ERC721 Approval', makerERC721ApprovalTxHash);


    PrintUtils.printData('Setup', [
        // ['Mint ERC721', mintTxHash],
        ['Maker ERC721 Approval', makerERC721ApprovalTxHash],
    ]);

    // Set up the Order and fill it
    const randomExpiration = getRandomFutureDateInSeconds();
    const exchangeAddress = contractAddresses.exchange;

    // Create the order
    const order: Order = {
        exchangeAddress,
        makerAddress: maker,
        takerAddress: NULL_ADDRESS,
        senderAddress: NULL_ADDRESS,
        feeRecipientAddress: NULL_ADDRESS,
        expirationTimeSeconds: randomExpiration,
        salt: generatePseudoRandomSalt(),
        makerAssetAmount,
        takerAssetAmount,
        makerAssetData,
        takerAssetData,
        makerFee: ZERO,
        takerFee: ZERO,
    };

    printUtils.printOrder(order);

    // Print out the Balances and Allowances
    await printUtils.fetchAndPrintContractAllowancesAsync();
    await printUtils.fetchAndPrintContractBalancesAsync();
    await printUtils.fetchAndPrintERC721OwnerAsync(dummyERC721TokenContract.address, tokenId);

    // Generate the order hash and sign it
    const orderHashHex = orderHashUtils.getOrderHashHex(order);
    const signature = await signatureUtils.ecSignHashAsync(providerEngine, orderHashHex, maker);
    const signedOrder = { ...order, signature };

    // Print the Balances
    await printUtils.fetchAndPrintContractBalancesAsync();
    await printUtils.fetchAndPrintERC721OwnerAsync(dummyERC721TokenContract.address, tokenId);

    // Stop the Provider Engine
    providerEngine.stop();

    return {signedOrder, orderHashHex, tokenId};
}


  async fillNFTOrder(signedOrder: SignedOrder, orderHashHex: any, tokenId: any): Promise<void> {
    PrintUtils.printScenario('Fill Order ERC721');
    // Initialize the ContractWrappers, this provides helper functions around calling
    // 0x contracts as well as ERC20/ERC721 token contracts on the blockchain
    const contractWrappers = new ContractWrappers(providerEngine, { networkId: NETWORK_CONFIGS.networkId });
    const etherTokenAddress = contractAddresses.etherToken;
    const dummyERC721TokenContract = dummyERC721TokenContracts[0];
    if (!dummyERC721TokenContract) {
        console.log('No Dummy ERC721 Tokens deployed on this network');
        return;
    }
    // Initialize the Web3Wrapper, this provides helper functions around fetching
    // account information, balances, general contract logs
    const web3Wrapper = new Web3Wrapper(providerEngine);
    // const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
    const taker = '0x4b83b6db927232b22b52469d595ef2a7474d9e03';

    const printUtils = new PrintUtils(web3Wrapper, contractWrappers, { taker }, { WETH: etherTokenAddress });
    printUtils.printAccounts();

    // the amount the maker wants of taker asset
    const takerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.1), DECIMALS);
    // Generate a random token id
    // const tokenId = generatePseudoRandomSalt();
    // 0x v2 uses hex encoded asset data strings to encode all the information needed to identify an asset
    // const takerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);
    let txHash;


    // Allow the 0x ERC20 Proxy to move WETH on behalf of takerAccount
    const takerWETHApprovalTxHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
        etherTokenAddress,
        taker,
    );
    await printUtils.awaitTransactionMinedSpinnerAsync('Taker WETH Approval', takerWETHApprovalTxHash);

    // Convert ETH into WETH for taker by depositing ETH into the WETH contract
    const takerWETHDepositTxHash = await contractWrappers.etherToken.depositAsync(
        etherTokenAddress,
        takerAssetAmount,
        taker,
    );
    await printUtils.awaitTransactionMinedSpinnerAsync('Taker WETH Deposit', takerWETHDepositTxHash);

    PrintUtils.printData('Setup', [
        ['Taker WETH Approval', takerWETHApprovalTxHash],
        ['Taker WETH Deposit', takerWETHDepositTxHash],
    ]);

    // Fill the Order via 0x.js Exchange contract
    txHash = await contractWrappers.exchange.fillOrderAsync(signedOrder, takerAssetAmount, taker, {
        gasLimit: TX_DEFAULTS.gas,
    });
    const txReceipt = await printUtils.awaitTransactionMinedSpinnerAsync('fillOrder', txHash);
    printUtils.printTransaction('fillOrder', txReceipt, [['orderHash', orderHashHex]]);

    // Print the Balances
    await printUtils.fetchAndPrintContractBalancesAsync();
    await printUtils.fetchAndPrintERC721OwnerAsync(dummyERC721TokenContract.address, tokenId);

    // Stop the Provider Engine
    providerEngine.stop();
}

}
