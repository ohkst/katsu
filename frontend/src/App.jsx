import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, getProvider } from './web3';
import './Lottery.css';

function App() {
    const [manager, setManager] = useState('');
    const [players, setPlayers] = useState([]);
    const [balance, setBalance] = useState('');
    const [lastWinner, setLastWinner] = useState('');
    const [currentAccount, setCurrentAccount] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const contract = await getContract();
                if (!contract) return;

                const provider = getProvider();
                const accounts = await provider.listAccounts();
                if (accounts.length > 0) {
                    setCurrentAccount(accounts[0].address);
                }

                const managerAddress = await contract.manager();
                const playersList = await contract.getPlayers();
                const lastWinnerAddress = await contract.lastWinner();
                const balanceWei = await provider.getBalance(await contract.getAddress());

                setManager(managerAddress);
                setPlayers(playersList);
                setLastWinner(lastWinnerAddress);
                setBalance(ethers.formatEther(balanceWei));
            } catch (error) {
                console.error("Error initializing:", error);
            }
        };

        init();
    }, []);

    const connectWallet = async () => {
        if (!window.ethereum) {
            alert("Please install MetaMask!");
            return;
        }
        try {
            const provider = getProvider();
            const accounts = await provider.send("eth_requestAccounts", []);
            setCurrentAccount(accounts[0]);
        } catch (error) {
            console.error("Error connecting wallet:", error);
        }
    };

    const onEnter = async () => {
        try {
            setMessage('Waiting on transaction success...');
            setIsLoading(true);
            const contract = await getContract();
            const tx = await contract.enter({
                value: ethers.parseEther('0.003')
            });
            await tx.wait();
            setMessage('You have been entered!');

            // Refresh data
            const playersList = await contract.getPlayers();
            const provider = getProvider();
            const balanceWei = await provider.getBalance(await contract.getAddress());
            setPlayers(playersList);
            setBalance(ethers.formatEther(balanceWei));
        } catch (error) {
            setMessage('Transaction failed!');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const onPickWinner = async () => {
        try {
            setMessage('Picking a winner...');
            setIsLoading(true);
            const contract = await getContract();
            const tx = await contract.pickWinner();
            await tx.wait();

            const winner = await contract.lastWinner();
            setLastWinner(winner);
            setMessage(`A winner has been picked: ${winner}`);

            // Refresh data
            setPlayers([]);
            setBalance('0');
        } catch (error) {
            setMessage('Transaction failed!');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container">
            <h1>🔮 Ether Lottery</h1>

            {!currentAccount ? (
                <button onClick={connectWallet}>Connect Wallet</button>
            ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    Connected: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
                </p>
            )}

            <div className="stats">
                <div className="stat-item">
                    <h3>Players</h3>
                    <p>{players.length}</p>
                </div>
                <div className="stat-item">
                    <h3>Pot Size</h3>
                    <p>{balance} ETH</p>
                </div>
            </div>

            <div className="card">
                <h3>Want to try your luck?</h3>
                <p>Entry cost: 0.003 ETH</p>
                <button onClick={onEnter} disabled={isLoading}>
                    {isLoading ? <span className="loading"></span> : null}
                    {isLoading ? 'Processing...' : 'Enter Lottery'}
                </button>
            </div>

            {currentAccount.toLowerCase() === manager.toLowerCase() && (
                <div className="card" style={{ borderColor: '#a855f7' }}>
                    <h3>Manager Zone</h3>
                    <p>Time to pick a winner?</p>
                    <button onClick={onPickWinner} disabled={isLoading}>
                        Pick Winner
                    </button>
                </div>
            )}

            {message && <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>{message}</p>}

            {lastWinner && lastWinner !== '0x0000000000000000000000000000000000000000' && (
                <div className="winner-section">
                    <h3>🏆 Last Winner</h3>
                    <p className="winner-highlight">{lastWinner}</p>
                </div>
            )}
        </div>
    );
}

export default App;
