import React, { useState, useEffect } from "react";
import './App.css';
import Web3 from 'web3'
import { Biconomy } from "@biconomy/mexa";
import { NotificationContainer, NotificationManager } from 'react-notifications';
import 'react-notifications/lib/notifications.css';
const { config } = require("./config");
const showErrorMessage = message => {
  NotificationManager.error(message, "Error", 5000);
};
const showSuccessMessage = message => {
  NotificationManager.success(message, "Message", 3000);
};

const showInfoMessage = message => {
  NotificationManager.info(message, "Info", 3000);
};

let contract;
let domainData = {
  name: "Quote",
  version: "1",
  chainId: "42",  // Kovan
  verifyingContract: config.contract.address
};
const domainType = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" }
];

const metaTransactionType = [
  { name: "nonce", type: "uint256" },
  { name: "from", type: "address" }
];

let web3;

function App() {


  const [owner, setOwner] = useState("Default Owner Address");
  const [quote, setQuote] = useState("This is a default quote");
  const [newQuote, setNewQuote] = useState("");
  useEffect(() => {


    if (!window.ethereum) {
      showErrorMessage("Metamask is required to use this DApp")
      return;
    }

    //  Use the API Key you got from dashboard
    const biconomy = new Biconomy(window.ethereum, { apiKey: "q9oEztJM8.e8ed08a7-5b38-48e3-b4c0-f66e6b66f407" });

    web3 = new Web3(biconomy);

    biconomy.onEvent(biconomy.READY, async () => {
      // Initialize your dapp here like getting user accounts etc

      await window.ethereum.enable();
      contract = new web3.eth.Contract(config.contract.abi, config.contract.address);
      startApp();
    }).onEvent(biconomy.ERROR, (error, message) => {
      // Handle error while initializing mexa
      console.log(error)
    });
  }
    , []);

  const onQuoteChange = event => {
    setNewQuote(event.target.value);
  };

  async function startApp() {
    const result = await contract.methods.getQuote().call({ from: window.ethereum.selectedAddress });
    if (result.currentOwner !== "0x0000000000000000000000000000000000000000") {
      setQuote(result.currentQuote)
      setOwner(result.currentOwner)
    }
  }
  async function onButtonClickMeta() {
    console.log(window.ethereum.selectedAddress)
    setNewQuote("");
    console.log(contract)
    let nonce = await contract.methods.nonces(window.ethereum.selectedAddress).call();
    let message = {};
    message.nonce = parseInt(nonce);
    message.from = window.ethereum.selectedAddress;

    const dataToSign = JSON.stringify({
      types: {
        EIP712Domain: domainType,
        MetaTransaction: metaTransactionType
      },
      domain: domainData,
      primaryType: "MetaTransaction",
      message: message
    });

    window.web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        id: 999999999999,
        method: "eth_signTypedData_v4",
        params: [window.ethereum.selectedAddress, dataToSign]
      },
      async function (err, result) {
        if (err) {
          return console.error(err);
        }
        console.log("Signature result from wallet :");
        console.log(result);
        if(result && result.result) {
          const signature = result.result.substring(2);
          const r = "0x" + signature.substring(0, 64);
          const s = "0x" + signature.substring(64, 128);
          const v = parseInt(signature.substring(128, 130), 16);
          console.log(r, "r")
          console.log(s, "s")
          console.log(v, "v")
          console.log(window.ethereum.address, "userAddress")
  
          const promiEvent = contract.methods
            .setQuoteMeta(window.ethereum.selectedAddress, newQuote, r, s, v)
            .send({
              from: window.ethereum.selectedAddress
            })
          promiEvent.on("transactionHash", (hash) => {
            showInfoMessage("Transaction sent successfully. Check Console for Transaction hash")
            console.log("Transaction Hash is ", hash)
          }).once("confirmation", (confirmationNumber, receipt) => {
            if (receipt.status) {
              showSuccessMessage("Transaction processed successfully")
              startApp()
            } else {
              showErrorMessage("Transaction Failed");
            }
            console.log(receipt)
          })
        } else {
          showErrorMessage("Could not get user signature. Check console logs for error");
        }
      }
    );
  }
  return (
    <div className="App">
      *Use this DApp only on Kovan Network
      <header className="App-header">
        <h1>Quotes</h1>
        <section className="main">
          <div className="mb-wrap mb-style-2">
            <blockquote cite="http://www.gutenberg.org/ebboks/11">
              <h4>{quote} </h4>
            </blockquote>
          </div>

          <div className="mb-attribution">
            <p className="mb-author">- {owner}</p>
          </div>
        </section>
        <section>
          <div className="submit-container">
            <div className="submit-row">
              <input size="100"
                border-radius="15"
                type="text"
                placeholder="Enter your quote"
                onChange={onQuoteChange}
                value={newQuote}
              />
              <button type="button" className="button" onClick={onButtonClickMeta}>Submit</button>
            </div>
          </div>
        </section>
      </header>
      <NotificationContainer />
    </div >
  );
}

export default App;
