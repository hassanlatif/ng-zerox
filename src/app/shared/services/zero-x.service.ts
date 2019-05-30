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
import { contractAddresses } from '../configs/contracts';
import { PrintUtils } from '../utils/print_utils';
import { providerEngine } from './provider_engine';
import { getRandomFutureDateInSeconds } from '../utils/utils';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ZeroXService {

  constructor(private httpClient: HttpClient) { }

  async createOrder() {
    PrintUtils.printScenario('Create Order');
    // Initialize the ContractWrappers, this provides helper functions around calling
    // 0x contracts as well as ERC20/ERC721 token contracts on the blockchain
    const contractWrappers = new ContractWrappers(providerEngine, { networkId: NETWORK_CONFIGS.networkId });
    // Initialize the Web3Wrapper, this provides helper functions around fetching
    // account information, balances, general contract logs
    const web3Wrapper = new Web3Wrapper(providerEngine);
    // const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
    // const addresses = await web3Wrapper.getAvailableAddressesAsync();
    const maker = '0x00c97b9efa7ed5712b835f2635a388cf8631f109';
    const taker = NULL_ADDRESS;

    // const zrxTokenAddress = contractAddresses.zrxToken;
    const etherTokenAddress = contractAddresses.etherToken;
    console.log(etherTokenAddress);
    const printUtils = new PrintUtils(
      web3Wrapper,
      contractWrappers,
      { maker, taker },
      { WETH: etherTokenAddress },
    );
    printUtils.printAccounts();

    // the amount the maker is selling of maker asset
    const makerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.1), DECIMALS);
    // the amount the maker wants of taker asset
    const takerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.01), DECIMALS);
    // 0x v2 uses hex encoded asset data strings to encode all the information needed to identify an asset
    const makerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);
    const takerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);

    // Allow the 0x ERC20 Proxy to move ZRX on behalf of makerAccount
    const makerWETHApprovalTxHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
      etherTokenAddress,
      maker,
    );
    await printUtils.awaitTransactionMinedSpinnerAsync('Maker WETH Approval', makerWETHApprovalTxHash);

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

    // Generate the order hash and sign it
    const orderHashHex = orderHashUtils.getOrderHashHex(order);
    const signature = await signatureUtils.ecSignHashAsync(providerEngine, orderHashHex, maker);
    const signedOrder = { ...order, signature };

    this.httpClient.post<any>('http://test-marketplace.apollo.gg/v2/order', signedOrder).subscribe(result => console.log(result));

    // Print the Balances
    await printUtils.fetchAndPrintContractBalancesAsync();

    // Stop the Provider Engine
    providerEngine.stop();

    return {signedOrder, orderHashHex};
  }


  async fillOrder(signedOrder: any, orderHashHex: any) {
    PrintUtils.printScenario('Fill signedOrder');
    // Initialize the ContractWrappers, this provides helper functions around calling
    // 0x contracts as well as ERC20/ERC721 token contracts on the blockchain
    const contractWrappers = new ContractWrappers(providerEngine, { networkId: NETWORK_CONFIGS.networkId });
    // Initialize the Web3Wrapper, this provides helper functions around fetching
    // account information, balances, general contract logs
    const web3Wrapper = new Web3Wrapper(providerEngine);
    // const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
    // const taker = '0x00c97b9efa7ed5712b835f2635a388cf8631f109';
    const taker = '0x4b83b6db927232b22b52469d595ef2a7474d9e03';
    // const zrxTokenAddress = contractAddresses.zrxToken;
    const etherTokenAddress = contractAddresses.etherToken;
    const printUtils = new PrintUtils(
      web3Wrapper,
      contractWrappers,
      { taker },
      { WETH: etherTokenAddress },
    );
    printUtils.printAccounts();

    // the amount the maker wants of taker asset
    const takerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.01), DECIMALS);
    // 0x v2 uses hex encoded asset data strings to encode all the information needed to identify an asset

    const takerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);
    let txHash;
    let txReceipt;
    
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

    printUtils.printOrder(signedOrder);

    // Print out the Balances and Allowances
    await printUtils.fetchAndPrintContractAllowancesAsync();
    await printUtils.fetchAndPrintContractBalancesAsync();

    // Validate the order is Fillable before calling fillOrder
    // This checks both the maker and taker balances and allowances to ensure it is fillable
    // up to takerAssetAmount
    await contractWrappers.exchange.validateFillOrderThrowIfInvalidAsync(signedOrder, takerAssetAmount, taker);

    // Fill the Order via 0x Exchange contract
    txHash = await contractWrappers.exchange.fillOrderAsync(signedOrder, takerAssetAmount, taker, {
      gasLimit: TX_DEFAULTS.gas,
    });
    txReceipt = await printUtils.awaitTransactionMinedSpinnerAsync('fillOrder', txHash);
    printUtils.printTransaction('fillOrder', txReceipt, [['orderHash', orderHashHex]]);

    // Print the Balances
    await printUtils.fetchAndPrintContractBalancesAsync();

    // Stop the Provider Engine
    providerEngine.stop();
  }


  async createNFTOrder() {
    PrintUtils.printScenario('Create NFT Order');
    // Initialize the ContractWrappers, this provides helper functions around calling
    // 0x contracts as well as ERC20/ERC721 token contracts on the blockchain
    const contractWrappers = new ContractWrappers(providerEngine, { networkId: NETWORK_CONFIGS.networkId });
    // Initialize the Web3Wrapper, this provides helper functions around fetching
    // account information, balances, general contract logs
    const web3Wrapper = new Web3Wrapper(providerEngine);
    // const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
    // const addresses = await web3Wrapper.getAvailableAddressesAsync();
    const maker = '0x00c97b9efa7ed5712b835f2635a388cf8631f109';
    const taker = NULL_ADDRESS;

    const imTokenAddress = '0x198134b4fd359025fc6731f573119f312e5970c7';
    const imTokenId = new BigNumber(1);
    // const erc721Proxy = '0xe654aac058bfbf9f83fcaee7793311dd82f6ddb4';
    const etherTokenAddress = contractAddresses.etherToken;

    const printUtils = new PrintUtils(
      web3Wrapper,
      contractWrappers,
      { maker, taker },
      { WETH: etherTokenAddress, IMT: imTokenAddress }
    );
    printUtils.printAccounts();

    // the amount the maker is selling of maker asset
    const makerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.01), DECIMALS);
    // the amount the maker wants of taker asset
    const takerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.01), DECIMALS);
    // 0x v2 uses hex encoded asset data strings to encode all the information needed to identify an asset
    const makerAssetData = assetDataUtils.encodeERC721AssetData(imTokenAddress, imTokenId);
    const takerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);

    // Allow the 0x ERC721 Proxy to move IMT on behalf of makerAccount
    const makerIMTApprovalTxHash = await contractWrappers.erc721Token.setProxyApprovalAsync(
      imTokenAddress,
      imTokenId
    );

    await printUtils.awaitTransactionMinedSpinnerAsync('Maker IMT Approval', makerIMTApprovalTxHash);

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

    // Generate the order hash and sign it
    const orderHashHex = orderHashUtils.getOrderHashHex(order);
    const signature = await signatureUtils.ecSignHashAsync(providerEngine, orderHashHex, maker);
    const signedOrder = { ...order, signature };

    this.httpClient.post<any>('http://test-marketplace.apollo.gg/v2/order', signedOrder).subscribe(result => console.log(result));

    // Print the Balances
    await printUtils.fetchAndPrintContractBalancesAsync();

    // Stop the Provider Engine
    providerEngine.stop();

    return {signedOrder, orderHashHex};
  }


  async fillNFTOrder(signedOrder: SignedOrder, orderHashHex: any) {
    PrintUtils.printScenario('Fill NFT signedOrder');
    // Initialize the ContractWrappers, this provides helper functions around calling
    // 0x contracts as well as ERC20/ERC721 token contracts on the blockchain
    const contractWrappers = new ContractWrappers(providerEngine, { networkId: NETWORK_CONFIGS.networkId });
    // Initialize the Web3Wrapper, this provides helper functions around fetching
    // account information, balances, general contract logs
    const web3Wrapper = new Web3Wrapper(providerEngine);
    // const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
    // const taker = '0x00c97b9efa7ed5712b835f2635a388cf8631f109';
    const taker = '0x4b83b6db927232b22b52469d595ef2a7474d9e03';
    // const zrxTokenAddress = contractAddresses.zrxToken;
    const etherTokenAddress = contractAddresses.etherToken;
    const printUtils = new PrintUtils(
      web3Wrapper,
      contractWrappers,
      { taker },
      { WETH: etherTokenAddress },
    );
    printUtils.printAccounts();

    // the amount the maker wants of taker asset
    const takerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.01), DECIMALS);
    // 0x v2 uses hex encoded asset data strings to encode all the information needed to identify an asset

    const takerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);
    let txHash;
    let txReceipt;

    // Convert ETH into WETH for taker by depositing ETH into the WETH contract
    const takerWETHDepositTxHash = await contractWrappers.etherToken.depositAsync(
      etherTokenAddress,
      takerAssetAmount,
      taker,
    );
    await printUtils.awaitTransactionMinedSpinnerAsync('Taker WETH Deposit', takerWETHDepositTxHash);
    
    // Allow the 0x ERC20 Proxy to move WETH on behalf of takerAccount
    const takerWETHApprovalTxHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
      etherTokenAddress,
      taker,
    );
    await printUtils.awaitTransactionMinedSpinnerAsync('Taker WETH Approval', takerWETHApprovalTxHash);


    PrintUtils.printData('Setup', [
      ['Taker WETH Approval', takerWETHApprovalTxHash],
      ['Taker WETH Deposit', takerWETHDepositTxHash],
    ]);

    printUtils.printOrder(signedOrder);

    console.log("validating asset data");
    assetDataUtils.validateAssetDataOrThrow(signedOrder.makerAssetData);
    console.log("validated asset data");
    console.log("validating order");
    await contractWrappers.exchange.validateOrderFillableOrThrowAsync(signedOrder);
    console.log("validated order");

    // Print out the Balances and Allowances
    await printUtils.fetchAndPrintContractAllowancesAsync();
    await printUtils.fetchAndPrintContractBalancesAsync();

    // Validate the order is Fillable before calling fillOrder
    // This checks both the maker and taker balances and allowances to ensure it is fillable
    // up to takerAssetAmount
    await contractWrappers.exchange.validateFillOrderThrowIfInvalidAsync(signedOrder, takerAssetAmount, taker);

    // Fill the Order via 0x Exchange contract
    txHash = await contractWrappers.exchange.fillOrderAsync(signedOrder, takerAssetAmount, taker, {
      gasLimit: TX_DEFAULTS.gas,
    });
    txReceipt = await printUtils.awaitTransactionMinedSpinnerAsync('fillOrder', txHash);
    printUtils.printTransaction('fillOrder', txReceipt, [['orderHash', orderHashHex]]);

    // Print the Balances
    await printUtils.fetchAndPrintContractBalancesAsync();

    // Stop the Provider Engine
    providerEngine.stop();
  }  
  

  


  async fillSwapOrder() {
    PrintUtils.printScenario('Fill Order');
    // Initialize the ContractWrappers, this provides helper functions around calling
    // 0x contracts as well as ERC20/ERC721 token contracts on the blockchain
    const contractWrappers = new ContractWrappers(providerEngine, { networkId: NETWORK_CONFIGS.networkId });
    // Initialize the Web3Wrapper, this provides helper functions around fetching
    // account information, balances, general contract logs
    const web3Wrapper = new Web3Wrapper(providerEngine);
    // const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
    const maker = '0x00c97b9efa7ed5712b835f2635a388cf8631f109';
    const taker = '0x00c97b9efa7ed5712b835f2635a388cf8631f109';
    // const taker = '0x4b83b6db927232b22b52469d595ef2a7474d9e03';
    // const zrxTokenAddress = contractAddresses.zrxToken;
    const etherTokenAddress = contractAddresses.etherToken;
    const printUtils = new PrintUtils(
      web3Wrapper,
      contractWrappers,
      { maker, taker },
      { WETH: etherTokenAddress },
    );
    printUtils.printAccounts();

    // the amount the maker is selling of maker asset
    const makerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.01), DECIMALS);
    // the amount the maker wants of taker asset
    const takerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.01), DECIMALS);
    // 0x v2 uses hex encoded asset data strings to encode all the information needed to identify an asset
    const makerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);
    const takerAssetData = assetDataUtils.encodeERC20AssetData(etherTokenAddress);
    let txHash;
    let txReceipt;

    // Allow the 0x ERC20 Proxy to move WETH on behalf of makerAccount
    const makerZRXApprovalTxHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
      etherTokenAddress,
      maker,
    );
    await printUtils.awaitTransactionMinedSpinnerAsync('Maker WETH Approval', makerZRXApprovalTxHash);

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
      ['Maker ZRX Approval', makerZRXApprovalTxHash],
      ['Taker WETH Approval', takerWETHApprovalTxHash],
      ['Taker WETH Deposit', takerWETHDepositTxHash],
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

    // Generate the order hash and sign it
    const orderHashHex = orderHashUtils.getOrderHashHex(order);
    const signature = await signatureUtils.ecSignHashAsync(providerEngine, orderHashHex, maker);
    const signedOrder = { ...order, signature };

    // Validate the order is Fillable before calling fillOrder
    // This checks both the maker and taker balances and allowances to ensure it is fillable
    // up to takerAssetAmount
    await contractWrappers.exchange.validateFillOrderThrowIfInvalidAsync(signedOrder, takerAssetAmount, taker);

    // Fill the Order via 0x Exchange contract
    txHash = await contractWrappers.exchange.fillOrderAsync(signedOrder, takerAssetAmount, taker, {
      gasLimit: TX_DEFAULTS.gas,
    });
    txReceipt = await printUtils.awaitTransactionMinedSpinnerAsync('fillOrder', txHash);
    printUtils.printTransaction('fillOrder', txReceipt, [['orderHash', orderHashHex]]);

    // Print the Balances
    await printUtils.fetchAndPrintContractBalancesAsync();

    // Stop the Provider Engine
    providerEngine.stop();
  }


}
