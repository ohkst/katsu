import { ethers } from 'ethers';
import { abi, contractAddress } from './abi';

let provider;
let signer;
let lotteryContract;

if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
} else {
    console.log("Metamask not found");
}

export const getContract = async () => {
    if (!provider) return null;
    signer = await provider.getSigner();
    lotteryContract = new ethers.Contract(contractAddress, abi, signer);
    return lotteryContract;
};

export const getProvider = () => provider;
