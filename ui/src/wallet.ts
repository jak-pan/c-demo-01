import {
  web3Accounts,
  web3Enable,
  web3FromSource,
} from "@polkadot/extension-dapp";
import { encodeAddress } from "@polkadot/util-crypto";
import { wallets } from "./walletConfig";
import type { ApiPromise } from "@polkadot/api";
import { renderTable } from "./script";

declare global {
  interface Window {
    injectedWeb3?: Record<string, any>;
  }
}

export interface WalletState {
  account: any;
  api: ApiPromise;
}

let state: WalletState = {
  account: null,
  api: null as unknown as ApiPromise,
};

export function setState(newState: Partial<WalletState>) {
  state = { ...state, ...newState };
}

export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export async function connectWallet(walletType: string) {
  try {
    if (!state.api?.isReady) {
      throw new Error("API not ready. Please wait for connection.");
    }

    // Enable web3 when actually connecting
    const extensions = await web3Enable("my-template-app");
    if (extensions.length === 0) {
      throw new Error("No extensions found");
    }

    // Get all accounts with their source info
    const allAccounts = await web3Accounts();
    if (allAccounts.length === 0) {
      throw new Error("No accounts found");
    }

    // Filter accounts based on wallet type
    const walletAccounts = allAccounts.filter((acc) => {
      switch (walletType) {
        case "polkadot-js":
          return acc.meta.source === "polkadot-js";
        case "talisman":
          return acc.meta.source === "talisman";
        case "subwallet":
          return acc.meta.source === "subwallet-js";
        case "nova":
          return acc.meta.source === "nova";
        default:
          return false;
      }
    });

    if (walletAccounts.length === 0) {
      throw new Error(`No accounts found for ${walletType}`);
    }

    state.account = walletAccounts[0];
    localStorage.setItem("lastWalletType", walletType);
    updateWalletButton();
    updateActionButton(true);
    return true;
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    throw error;
  }
}

export async function tryReconnectLastWallet() {
  const lastWalletType = localStorage.getItem("lastWalletType");
  if (lastWalletType) {
    try {
      const isAvailable = await checkWalletAvailability(lastWalletType);
      if (isAvailable) {
        await connectWallet(lastWalletType);
      }
    } catch (error) {
      console.error("Failed to reconnect to last wallet:", error);
      localStorage.removeItem("lastWalletType");
    }
  }
}

export async function checkWalletAvailability(
  source: string
): Promise<boolean> {
  if (!state.api?.isReady) return false;

  try {
    // Don't enable web3 here, just check if extension exists
    return window?.injectedWeb3?.[source] !== undefined;
  } catch {
    return false;
  }
}

export function updateWalletDropdown() {
  const dropdown = document.getElementById("walletDropdown");
  if (!dropdown) return;

  dropdown.innerHTML = "";

  const availableWallets = wallets.filter(
    (wallet) => !isMobile || wallet.mobileSupport
  );

  availableWallets.forEach(async (wallet) => {
    const isAvailable = await checkWalletAvailability(wallet.id);
    const div = document.createElement("div");
    div.className = `wallet-option ${isAvailable ? "" : "disabled"}`;
    div.setAttribute("data-wallet", wallet.id);

    div.innerHTML = `
      <img src="${wallet.icon}" alt="${wallet.name}" class="wallet-icon">
      <span class="wallet-name">${wallet.name}</span>
      ${
        !isAvailable
          ? `<a href="${wallet.installUrl}" 
            class="install-pill" 
            target="_blank" 
            onclick="event.stopPropagation()">
          Install
        </a>`
          : ""
      }
    `;

    if (isAvailable) {
      div.addEventListener("click", async () => {
        try {
          await connectWallet(wallet.id);
          renderTable();
          dropdown.classList.remove("show");
        } catch (error) {
          console.error("Failed to connect wallet:", error);
          alert(
            `Failed to connect ${wallet.name}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      });
    }

    dropdown.appendChild(div);
  });
}

function updateActionButton(isConnected: boolean) {
  const actionButton = document.getElementById(
    "actionButton"
  ) as HTMLButtonElement;
  if (actionButton) {
    actionButton.disabled = !isConnected;
  }
}

export function updateWalletButton() {
  const button = document.getElementById("walletButton");
  if (!button) return;

  if (state.account) {
    const wallet = wallets.find((w) => w.source === state.account.meta.source);
    const polkadotAddress = encodeAddress(state.account.address, 0);
    const shortAddress = `${polkadotAddress.slice(
      0,
      6
    )}...${polkadotAddress.slice(-4)}`;
    button.innerHTML = `
      <img src="${wallet?.icon}" alt="${wallet?.name}" class="wallet-icon">
      <div>
        <div>${wallet?.name || "Connected"}</div>
        <div class="connected-address">${shortAddress}</div>
      </div>
    `;
    updateActionButton(true);
  } else {
    button.innerHTML = `<div>Connect Wallet</div>`;
    updateActionButton(false);
  }
}

export function setupWalletUI() {
  const button = document.getElementById("walletButton");
  const dropdown = document.getElementById("walletDropdown");

  if (!button || !dropdown) return;

  // Initialize wallet button state
  updateWalletButton();

  button.addEventListener("click", () => {
    dropdown.classList.toggle("show");
    updateWalletDropdown(); // Update wallet availability each time dropdown is opened
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (event) => {
    if (!button.contains(event.target as Node)) {
      dropdown.classList.remove("show");
    }
  });
}

export async function getWalletSigner() {
  if (!state.account) return null;
  const injector = await web3FromSource(state.account.meta.source);
  return injector.signer;
}

export function getCurrentAccount() {
  return state.account;
}

export function getFormattedAddress() {
  return state.account ? encodeAddress(state.account.address, 0) : undefined;
}
