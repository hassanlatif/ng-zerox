import { RPCSubprovider, Web3ProviderEngine } from '0x.js';
import { MnemonicWalletSubprovider, SignerSubprovider, MetamaskSubprovider } from '@0x/subproviders';

import { BASE_DERIVATION_PATH, MNEMONIC, NETWORK_CONFIGS } from '../configs/configs';

export const mnemonicWallet = new MnemonicWalletSubprovider({
    mnemonic: MNEMONIC,
    baseDerivationPath: BASE_DERIVATION_PATH,
});

declare global {
    interface Window { web3: any }
}

window.web3 = window.web3 || {};

// Create a Web3 Provider Engine
export const pe = new Web3ProviderEngine();
// Compose our Providers, order matters
// Use the SignerSubprovider to wrap the browser extension wallet
// All account based and signing requests will go through the SignerSubprovider

if (window.web3.currentProvider.isMetaMask)
    pe.addProvider(new MetamaskSubprovider(window.web3.currentProvider));
else
    pe.addProvider(new SignerSubprovider(window.web3.currentProvider));
// Use an RPC provider to route all other requests
pe.addProvider(new RPCSubprovider(NETWORK_CONFIGS.rpcUrl));
pe.start();

export const providerEngine = pe;
