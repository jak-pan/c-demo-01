import { ApiPromise, WsProvider } from "@polkadot/api";
import { encodeAddress } from "@polkadot/util-crypto";
import { web3Enable } from "@polkadot/extension-dapp";
import {
  setState,
  setupWalletUI,
  tryReconnectLastWallet,
  getCurrentAccount,
  getWalletSigner,
  getFormattedAddress,
} from "./wallet";

let api: ApiPromise;

function updateConnectionStatus(
  status: "connecting" | "connected" | "error",
  message: string
) {
  const statusDot = document.getElementById("statusDot");

  if (statusDot) {
    statusDot.className = `status-dot ${status}`;
  }
}

function updateBlockNumber(blockNumber: string) {
  const blockElement = document.getElementById("blockNumber");
  if (blockElement) {
    blockElement.textContent = `Block: ${blockNumber}`;
  }
}

async function subscribeToBlocks() {
  if (!api) return;

  await api.rpc.chain.subscribeNewHeads((header) => {
    updateBlockNumber(header.number.toNumber().toString());
  });
}

export async function renderTable() {
  try {
    const result = await api.query.something.something.entries();
    const tbody = document.getElementById("accountTableBody");
    const countElement = document.getElementById("accountCount");

    if (!tbody || !countElement) return;

    let rowsHTML = "";
    const count = result.length;
    const formattedAccount = getFormattedAddress();

    // Update count in header
    countElement.textContent = count === 0 ? "NOONE" : count.toString();

    // Sort entries to put current account first
    const sortedEntries = result.sort(([keyA], [keyB]) => {
      const accountA = encodeAddress(keyA.args[0].toU8a(), 0);
      const accountB = encodeAddress(keyB.args[0].toU8a(), 0);

      // If account is current user's account, put it first
      if (formattedAccount && accountA === formattedAccount) return -1;
      if (formattedAccount && accountB === formattedAccount) return 1;
      return 0;
    });

    // Add each account ID to the table
    sortedEntries.forEach(([key, _value]) => {
      const accountId = encodeAddress(key.args[0].toU8a(), 0);
      const isCurrentUser = formattedAccount && accountId === formattedAccount;

      rowsHTML += `
        <tr${isCurrentUser ? ' class="current-user"' : ""}>
          <td>
            ${isCurrentUser ? '<span class="me-pill">me!</span>' : ""}
            ${accountId}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHTML;
  } catch (error) {
    console.error("Error:", error);
  }
}

function updateTransactionStatus(message: string, isError = false) {
  const statusElement = document.getElementById("transactionStatus");
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `transaction-status ${
      isError ? "error" : "success"
    }`;
  }
}

async function exportAccounts() {
  try {
    const result = await api.query.something.something.entries();
    const accounts = result.map(([key, _value]) =>
      encodeAddress(key.args[0].toU8a(), 0)
    );

    // Create and download the JSON file
    const blob = new Blob([JSON.stringify(accounts, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "did-something-accounts.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Export error:", error);
    updateTransactionStatus("Failed to export accounts", true);
  }
}

async function something() {
  try {
    const account = getCurrentAccount();
    if (!account) {
      return;
    }

    updateTransactionStatus("Submitting transaction...");

    // Get the signer
    const signer = await getWalletSigner();
    api.setSigner(signer as any);

    const tx = api.tx.something.doSomething();
    await new Promise((resolve, reject) => {
      tx.signAndSend(
        account.address,
        { signer: signer as any },
        ({ status, events = [], dispatchError }) => {
          if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = api.registry.findMetaError(
                dispatchError.asModule
              );
              reject(
                new Error(
                  `${decoded.section}.${decoded.method}: ${decoded.docs}`
                )
              );
            } else {
              reject(dispatchError.toString());
            }
          }

          if (status.isInBlock) {
            updateTransactionStatus(
              `Transaction included in block ${status.asInBlock}`
            );
          }

          if (status.isFinalized) {
            events.forEach(({ event }) => {
              if (api.events.system.ExtrinsicFailed.is(event)) {
                reject(new Error("Transaction failed"));
              }
            });
            resolve(status.hash.toString());
          }
        }
      ).catch(reject);
    });

    await renderTable();
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    updateTransactionStatus(`Transaction failed: ${message}`, true);
  }
}

async function initializeAPI() {
  try {
    updateConnectionStatus("connecting", "Connecting to node...");

    const wsProvider = new WsProvider("ws://127.0.0.1:9944");
    api = await ApiPromise.create({
      provider: wsProvider,
      throwOnConnect: true,
    });

    // Set API in wallet state
    setState({ api });

    // Update status immediately after successful API creation
    updateConnectionStatus("connected", "Connected");
    await subscribeToBlocks();

    // Subscribe to connection events for future state changes
    wsProvider.on("connected", async () => {
      updateConnectionStatus("connected", "Connected");
      await subscribeToBlocks();
    });

    wsProvider.on("disconnected", () => {
      updateConnectionStatus("error", "Disconnected");
      updateBlockNumber("-");
    });

    wsProvider.on("error", () => {
      updateConnectionStatus("error", "Connection error");
      updateBlockNumber("-");
    });

    // Initialize web3 after API is ready
    await web3Enable("my-template-app");
    setupWalletUI();
    await tryReconnectLastWallet();
    await renderTable();

    return true;
  } catch (error) {
    console.error("Error initializing:", error);
    updateConnectionStatus("error", "Connection failed");
    updateBlockNumber("-");
    return false;
  }
}

// Initialize
window.addEventListener("load", async () => {
  await initializeAPI();
});

// Make functions available globally
(window as any).something = something;
(window as any).exportAccounts = exportAccounts;
