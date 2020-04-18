import React, { useState, useEffect } from "react";
import './App.css';
import Web3 from 'web3'
import Biconomy from "@biconomy/mexa";
const { config } = require("./config");
const biconomy = new Biconomy(window.ethereum, { dappId: "5e998b56667350123f4de8e9", apiKey: "bBZF-hmEL.0fe3385b-f7ea-4e20-8ce2-695f49dd9406" });

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
    web3 = new Web3(biconomy);

    biconomy.onEvent(biconomy.READY, async () => {
      // Initialize your dapp here like getting user accounts etc
      await window.ethereum.enable();
      contract = new web3.eth.Contract(config.contract.abi, config.contract.address);
      startApp();
    }).onEvent(biconomy.ERROR, (error, message) => {
      // Handle error while initializing mexa
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
        const signature = result.result.substring(2);
        const r = "0x" + signature.substring(0, 64);
        const s = "0x" + signature.substring(64, 128);
        const v = parseInt(signature.substring(128, 130), 16);

        await contract.methods
          .setQuoteMeta(window.ethereum.selectedAddress, newQuote, r, s, v)
          .send({
            from: window.ethereum.selectedAddress
          });
        startApp()
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
    </div >
  );
}

export default App;
