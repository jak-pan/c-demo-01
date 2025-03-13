interface WalletConfig {
  name: string;
  id: string;
  icon: string;
  source: string;
  installUrl: string;
  mobileSupport: boolean;
}

export const wallets: WalletConfig[] = [
  {
    name: "Talisman",
    id: "talisman",
    icon: "https://raw.githubusercontent.com/galacticcouncil/hydration-ui/refs/heads/master/src/assets/icons/TalismanLogo.svg",
    source: "talisman",
    installUrl: "https://talisman.xyz/download",
    mobileSupport: false,
  },
  {
    name: "Nova Wallet",
    id: "nva",
    icon: "https://raw.githubusercontent.com/galacticcouncil/hydration-ui/refs/heads/master/src/assets/icons/NovaWallet.svg",
    source: "polkadot-js",
    installUrl: "https://novawallet.io/",
    mobileSupport: false,
  },
  {
    name: "SubWallet",
    id: "nova",
    icon: "https://raw.githubusercontent.com/galacticcouncil/hydration-ui/refs/heads/master/src/assets/icons/SubWalletLogo.svg",
    source: "polkadot-js",
    installUrl: "https://www.subwallet.app/download.html",
    mobileSupport: true,
  },
  {
    name: "Polkadot.js",
    id: "polkadot-js",
    icon: "https://raw.githubusercontent.com/polkadot-js/extension/master/packages/extension/public/images/icon-128.png",
    source: "polkadot-js",
    installUrl: "https://polkadot.js.org/extension/",
    mobileSupport: false,
  },
];
