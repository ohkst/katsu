import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, ABI } from './constants';
import './index.css';

function App() {
    const [account, setAccount] = useState('');
    const [contract, setContract] = useState(null);
    const [predictedNumber, setPredictedNumber] = useState('');
    const [tickets, setTickets] = useState([]);
    const [lastWinner, setLastWinner] = useState('None');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                window.ethereum.on('accountsChanged', (accounts) => setAccount(accounts[0]));
                // Check if already connected
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    setupContract(accounts[0]);
                }
            }
        };
        init();
    }, []);

    const setupContract = async (acc) => {
        if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE") return;
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const lotteryContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
            setContract(lotteryContract);
            fetchData(lotteryContract);
        } catch (error) {
            console.error("Error setting up contract:", error);
        }
    };

    const fetchData = async (lotteryContract) => {
        try {
            const ticketsData = await lotteryContract.getTickets();
            setTickets(ticketsData);
            const winner = await lotteryContract.lastWinner();
            if (winner !== ethers.ZeroAddress) {
                setLastWinner(winner);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setAccount(accounts[0]);
                setupContract(accounts[0]);
            } catch (error) {
                console.error("Error connecting wallet:", error);
            }
        } else {
            alert("Please install MetaMask!");
        }
    };

    const enterLottery = async () => {
        if (!contract) return;
        if (!predictedNumber || predictedNumber < 0 || predictedNumber > 999) {
            alert("Please enter a valid number (0-999)");
            return;
        }

        setLoading(true);
        setStatus('Transaction Pending...');
        try {
            const tx = await contract.enter(predictedNumber, {
                value: ethers.parseEther("0.003")
            });
            await tx.wait();
            setStatus('Ticket Purchased Successfully!');
            fetchData(contract);
            setPredictedNumber('');
        } catch (error) {
            console.error("Error entering lottery:", error);
            setStatus('Transaction Failed');
        }
        setLoading(false);
    };

    const pickWinner = async () => {
        if (!contract) return;
        setLoading(true);
        setStatus('Picking Winner...');
        try {
            const tx = await contract.pickWinner();
            await tx.wait();
            setStatus('Winner Picked!');
            fetchData(contract);
        } catch (error) {
            console.error("Error picking winner:", error);
            setStatus('Failed to pick winner (Are you the manager?)');
        }
        setLoading(false);
    };

    return (
        <div className="App">
            <div className="glass-card">
                <h1>🔮 EtherLotto</h1>
                <p>Predict the number, win the pot!</p>

                {!account ? (
                    <button onClick={connectWallet} style={{ marginTop: '2rem' }}>
                        Connect Wallet
                    </button>
                ) : (
                    <div>
                        <p className="stat-label">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>

                        {lastWinner !== 'None' && (
                            <div className="winner-banner">
                                <h3>🏆 Last Winner</h3>
                                <p>{lastWinner}</p>
                            </div>
                        )}

                        <div style={{ margin: '2rem 0' }}>
                            <h3>Enter the Lottery</h3>
                            <p className="stat-label">Entry Fee: 0.003 ETH</p>
                            <input
                                type="number"
                                placeholder="0-999"
                                value={predictedNumber}
                                onChange={(e) => setPredictedNumber(e.target.value)}
                                min="0"
                                max="999"
                            />
                            <br />
                            <button
                                onClick={enterLottery}
                                disabled={loading}
                                style={{ marginTop: '1rem' }}
                            >
                                {loading ? 'Processing...' : 'Buy Ticket 🎟️'}
                            </button>
                            {status && <p style={{ marginTop: '1rem', color: '#a855f7' }}>{status}</p>}
                        </div>

                        <div className="stats-grid">
                            <div className="stat-item">
                                <div className="stat-value">{tickets.length}</div>
                                <div className="stat-label">Players</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value">{(tickets.length * 0.003).toFixed(3)} ETH</div>
                                <div className="stat-label">Current Pot</div>
                            </div>
                        </div>

                        {/* Admin Controls - Hidden in production or check if manager */}
                        <div style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                            <p className="stat-label">Admin Zone</p>
                            <button onClick={pickWinner} disabled={loading} style={{ background: 'rgba(255,255,255,0.1)' }}>
                                Pick Winner 🎲
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
