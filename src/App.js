import { useState, useEffect, useCallback } from "react";
import { ethers, utils } from "ethers";
import abi from "./contracts/MSMCoin.json";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [inputValue, setInputValue] = useState({
    walletAddress: "",
    transferAmount: "",
    burnAmount: "",
    mintAmount: "",
  });
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenTotalSupply, setTokenTotalSupply] = useState(0);
  const [yourMSMCoinBalance, setYourMSMCoinBalance] = useState(0);
  const [isTokenOwner, setIsTokenOwner] = useState(false);
  const [tokenOwnerAddress, setTokenOwnerAddress] = useState(null);
  const [yourWalletAddress, setYourWalletAddress] = useState(null);
  const [error, setError] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);

  const contractAddress = "0x74639828Ed86400e05C7bBcfcC0590208B3F27cd";
  const contractABI = abi.abi;

  const checkIfWalletIsConnected = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const account = accounts[0];
        setIsWalletConnected(true);
        setYourWalletAddress(account);
        console.log("Account Connected: ", account);
        await getBalance();
      } else {
        setError("Install a MetaMask wallet to get our token.");
        console.log("No Metamask detected");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getTokenInfo = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const _tokenContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
        setTokenContract(_tokenContract);

        const [account] = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        let tokenName = await _tokenContract.name();
        let tokenSymbol = await _tokenContract.symbol();
        let tokenOwner = await _tokenContract.owner();
        let tokenSupply = await _tokenContract.totalSupply();
        tokenSupply = utils.formatEther(tokenSupply);
        setTokenName(tokenName);
        setTokenSymbol(tokenSymbol);
        setTokenTotalSupply(tokenSupply);
        setTokenOwnerAddress(tokenOwner);
        if (account.toLowerCase() === tokenOwner.toLowerCase()) {
          setIsTokenOwner(true);
        }
        await getBalance();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const transferToken = async (event) => {
    event.preventDefault();
    try {
      if (window.ethereum) {
        if (tokenContract) {
          const txn = await tokenContract.transfer(
            inputValue.walletAddress,
            utils.parseEther(inputValue.transferAmount)
          );
          console.log("Transfering tokens...");
          await txn.wait();

          await getBalance();

          console.log("Tokens Transfered", txn.hash);
        }
      } else {
        console.log("Ethereum object not found, install Metamask.");
        setError("Install a MetaMask wallet to get our token.");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const burnTokens = async (event) => {
    event.preventDefault();
    try {
      if (window.ethereum) {
        if (tokenContract) {
          const txn = await tokenContract.burn(
            utils.parseEther(inputValue.burnAmount)
          );
          console.log("Burning tokens...");
          await txn.wait();
          console.log("Tokens burned...", txn.hash);
          let tokenSupply = await tokenContract.totalSupply();
          tokenSupply = utils.formatEther(tokenSupply);
          setTokenTotalSupply(tokenSupply);

          await getBalance();
        }
      } else {
        console.log("Ethereum object not found, install Metamask.");
        setError("Install a MetaMask wallet to get our token.");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const mintTokens = async (event) => {
    event.preventDefault();
    try {
      if (window.ethereum) {
        if (tokenContract) {
          let tokenOwner = await tokenContract.owner();
          const txn = await tokenContract.mint(
            tokenOwner,
            utils.parseEther(inputValue.mintAmount)
          );
          console.log("Minting tokens...");
          await txn.wait();
          console.log("Tokens minted...", txn.hash);
          let tokenSupply = await tokenContract.totalSupply();
          tokenSupply = utils.formatEther(tokenSupply);
          setTokenTotalSupply(tokenSupply);

          await getBalance();
        }
      } else {
        console.log("Ethereum object not found, install Metamask.");
        setError("Install a MetaMask wallet to get our token.");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getBalance = useCallback(async () => {
    try {
      if (window.ethereum) {
        if (tokenContract) {
          const MSMCoinBalance = await tokenContract.balanceOf(
            yourWalletAddress
          );
          setYourMSMCoinBalance(utils.formatEther(MSMCoinBalance));
        }
      }
    } catch (error) {
      console.log(error);
    }
  }, [yourWalletAddress, tokenContract]);

  const handleInputChange = (event) => {
    setInputValue((prevFormData) => ({
      ...prevFormData,
      [event.target.name]: event.target.value,
    }));
  };

  useEffect(() => {
    checkIfWalletIsConnected();
    getTokenInfo();
    // eslint-disable-next-line
  }, []);

  const eventTransfer = useCallback(
    async (address, account, amount) => {
      toast.success(
        `${utils.formatEther(
          amount
        )} MSM transferred by ${address} to ${account} successfully!`
      );
      await getBalance();
    },
    [getBalance]
  );
  const eventAdditionalTokensMinted = useCallback(
    async (address, account, amount) => {
      toast.success(
        `${utils.formatEther(
          amount
        )} MSM minted and transferred by ${address} to ${account} successfully!`
      );
      await getBalance();
    },
    [getBalance]
  );
  const eventTokensBurned = useCallback(
    async (address, amount, msg) => {
      toast.warn(`${utils.formatEther(amount)} MSM burned by ${address}`);
      await getBalance();
    },
    [getBalance]
  );
  const eventBonusTokensMinted = useCallback(
    async (address, amount) => {
      toast.success(`${address} won bonus 0.5 MSM for spending 10 MSM`);
      await getBalance();
    },
    [getBalance]
  );

  useEffect(() => {
    if (tokenContract) {
      tokenContract.on("Transfer", eventTransfer);
      tokenContract.on("additionalTokensMinted", eventAdditionalTokensMinted);
      tokenContract.on("tokensBurned", eventTokensBurned);
      tokenContract.on("bonusTokensMinted", eventBonusTokensMinted);
    }

    return () => {
      if (tokenContract) {
        tokenContract.off("Transfer", eventTransfer);
        tokenContract.off(
          "additionalTokensMinted",
          eventAdditionalTokensMinted
        );
        tokenContract.off("tokensBurned", eventTokensBurned);
        tokenContract.off("bonusTokensMinted", eventBonusTokensMinted);
      }
    };
  }, [
    tokenContract,
    eventTransfer,
    eventAdditionalTokensMinted,
    eventTokensBurned,
    eventBonusTokensMinted,
  ]);

  useEffect(() => {
    getBalance();
  }, [getBalance, yourWalletAddress]);

  return (
    <>
      <ToastContainer />
      <main className="main-container">
        <h2 className="headline">
          <span className="headline-gradient">MSM Coin Project</span>
          <img
            className="inline p-3 ml-2"
            src="https://i.imgur.com/5JfHKHU.png"
            alt="Meme Coin"
            width="60"
            height="30"
          />
        </h2>
        <section className="customer-section px-10 pt-5 pb-10">
          {error && <p className="text-2xl text-red-700">{error}</p>}
          <div className="mt-5">
            <span className="mr-5">
              <strong>Coin:</strong> {tokenName}{" "}
            </span>
            <span className="mr-5">
              <strong>Ticker:</strong> {tokenSymbol}{" "}
            </span>
            <span className="mr-5">
              <strong>Total Supply:</strong> {tokenTotalSupply}
            </span>
            {isWalletConnected && (
              <span className="mr-5">
                <strong>Balance:</strong> {yourMSMCoinBalance} MSM
              </span>
            )}
          </div>
          <div className="mt-7 mb-9">
            <form className="form-style">
              <input
                type="text"
                className="input-double"
                onChange={handleInputChange}
                name="walletAddress"
                placeholder="Wallet Address"
                value={inputValue.walletAddress}
              />
              <input
                type="text"
                className="input-double"
                onChange={handleInputChange}
                name="transferAmount"
                placeholder={`0.0000 ${tokenSymbol}`}
                value={inputValue.transferAmount}
              />
              <button className="btn-purple" onClick={transferToken}>
                Transfer Tokens
              </button>
            </form>
          </div>
          {isTokenOwner && (
            <section>
              <div className="mt-10 mb-10">
                <form className="form-style">
                  <input
                    type="text"
                    className="input-style"
                    onChange={handleInputChange}
                    name="burnAmount"
                    placeholder={`0.0000 ${tokenSymbol}`}
                    value={inputValue.burnAmount}
                  />
                  <button className="btn-purple" onClick={burnTokens}>
                    Burn Tokens
                  </button>
                </form>
              </div>
              <div className="mt-10 mb-10">
                <form className="form-style">
                  <input
                    type="text"
                    className="input-style"
                    onChange={handleInputChange}
                    name="mintAmount"
                    placeholder={`0.0000 ${tokenSymbol}`}
                    value={inputValue.mintAmount}
                  />
                  <button className="btn-purple" onClick={mintTokens}>
                    Mint Tokens
                  </button>
                </form>
              </div>
            </section>
          )}
          <div className="mt-5">
            <p>
              <span className="font-bold">Contract Address: </span>
              {contractAddress}
            </p>
          </div>
          <div className="mt-5">
            <p>
              <span className="font-bold">Token Owner Address: </span>
              {tokenOwnerAddress}
            </p>
          </div>
          <div className="mt-5">
            {isWalletConnected && (
              <p>
                <span className="font-bold">Your Wallet Address: </span>
                {yourWalletAddress}
              </p>
            )}
            <button className="btn-connect" onClick={checkIfWalletIsConnected}>
              {isWalletConnected ? "Wallet Connected 🔒" : "Connect Wallet 🔑"}
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
export default App;
