import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, getProvider } from './web3';
import './Lottery.css';

function App() {
    const [manager, setManager] = useState('');
    const [tickets, setTickets] = useState([]);
    const [balance, setBalance] = useState('');
    const [lastWinner, setLastWinner] = useState('');
    const [lastWinningNumber, setLastWinningNumber] = useState('');
    const [currentAccount, setCurrentAccount] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMockMode, setIsMockMode] = useState(false);
    const [lotteryNumber, setLotteryNumber] = useState('');
    const [myTickets, setMyTickets] = useState([]);

    useEffect(() => {
        const init = async () => {
            try {
                const contract = await getContract();
                if (!contract) {
                    console.log("Contract not found, enabling Mock Mode");
                    setIsMockMode(true);
                    // Mock Data
                    setManager('0x1234...abcd');
                    setTickets([
                        { player: '0xUser1...', number: 123 },
                        { player: '0xUser2...', number: 456 }
                    ]);
                    setBalance('0.006');
                    return;
                }

                const provider = getProvider();
                const accounts = await provider.listAccounts();
                if (accounts.length > 0) {
                    setCurrentAccount(accounts[0].address);
                }

                const managerAddress = await contract.manager();
                const ticketsList = await contract.getTickets();
                const lastWinnerAddress = await contract.lastWinner();
                const winningNum = await contract.lastWinningNumber();
                const balanceWei = await provider.getBalance(await contract.getAddress());

                setManager(managerAddress);
                setTickets(ticketsList);
                setLastWinner(lastWinnerAddress);
                setLastWinningNumber(winningNum.toString());
                setBalance(ethers.formatEther(balanceWei));

                // Filter my tickets
                if (accounts.length > 0) {
                    const userTickets = ticketsList.filter(t =>
                        t.player.toLowerCase() === accounts[0].address.toLowerCase()
                    );
                    setMyTickets(userTickets);
                }
            } catch (error) {
                console.error("Error initializing:", error);
                setIsMockMode(true);
            }
        };

        init();
    }, []);

    useEffect(() => {
        if (currentAccount && tickets.length > 0) {
            const userTickets = tickets.filter(t =>
                t.player?.toLowerCase() === currentAccount.toLowerCase()
            );
            setMyTickets(userTickets);
        }
    }, [currentAccount, tickets]);

    const connectWallet = async () => {
        if (isMockMode) {
            setCurrentAccount("0xMockAccount...1234");
            return;
        }

        if (!window.ethereum) {
            alert("MetaMask를 설치해주세요!");
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
        const num = parseInt(lotteryNumber);
        if (isNaN(num) || num < 0 || num > 999) {
            alert("0부터 999 사이의 숫자를 입력해주세요!");
            return;
        }

        try {
            setMessage('트랜잭션 처리 중입니다...');
            setIsLoading(true);

            if (isMockMode) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const newTicket = { player: currentAccount || "0xMockUser", number: num };
                setMessage(`복권 참여가 완료되었습니다! (번호: ${num}, 테스트 모드)`);
                setTickets([...tickets, newTicket]);
                setMyTickets([...myTickets, newTicket]);
                setBalance((parseFloat(balance || 0) + 0.003).toFixed(3));
                setLotteryNumber('');
                setIsLoading(false);
                return;
            }

            const contract = await getContract();
            const tx = await contract.enter(num, {
                value: ethers.parseEther('0.003')
            });
            await tx.wait();
            setMessage(`복권 참여가 완료되었습니다! (번호: ${num})`);

            // Refresh data
            const ticketsList = await contract.getTickets();
            const provider = getProvider();
            const balanceWei = await provider.getBalance(await contract.getAddress());
            setTickets(ticketsList);
            setBalance(ethers.formatEther(balanceWei));

            const userTickets = ticketsList.filter(t =>
                t.player.toLowerCase() === currentAccount.toLowerCase()
            );
            setMyTickets(userTickets);
            setLotteryNumber('');
        } catch (error) {
            setMessage('트랜잭션 실패!');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const onPickWinner = async () => {
        try {
            setMessage('당첨자를 선정하는 중입니다...');
            setIsLoading(true);

            if (isMockMode) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const winningNum = Math.floor(Math.random() * 1000);
                let winner = tickets.length > 0 ? tickets[0] : { player: "0xMockWinner", number: 0 };
                let minDiff = Math.abs(winner.number - winningNum);

                for (let i = 1; i < tickets.length; i++) {
                    const diff = Math.abs(tickets[i].number - winningNum);
                    if (diff < minDiff) {
                        minDiff = diff;
                        winner = tickets[i];
                    }
                }

                setLastWinner(winner.player);
                setLastWinningNumber(winningNum.toString());
                setMessage(`당첨 번호: ${winningNum}, 당첨자: ${winner.player} (예측 번호: ${winner.number}) (테스트 모드)`);
                setTickets([]);
                setMyTickets([]);
                setBalance('0');
                setIsLoading(false);
                return;
            }

            const contract = await getContract();
            const tx = await contract.pickWinner();
            await tx.wait();

            const winner = await contract.lastWinner();
            const winningNum = await contract.lastWinningNumber();
            setLastWinner(winner);
            setLastWinningNumber(winningNum.toString());
            setMessage(`당첨 번호: ${winningNum}, 당첨자: ${winner}`);

            // Refresh data
            setTickets([]);
            setMyTickets([]);
            setBalance('0');
        } catch (error) {
            setMessage('트랜잭션 실패!');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalPrize = tickets.length * 0.003;

    return (
        <div className="container">
            <h1>🔮 katsu 로또</h1>

            {!currentAccount ? (
                <button onClick={connectWallet}>지갑 연결</button>
            ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    연결됨: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
                </p>
            )}

            <div className="stats">
                <div className="stat-item">
                    <h3>참여자 수</h3>
                    <p>{tickets.length}명</p>
                </div>
                <div className="stat-item">
                    <h3>총 상금</h3>
                    <p>{totalPrize.toFixed(3)} ETH</p>
                </div>
                <div className="stat-item">
                    <h3>내 참여</h3>
                    <p>{myTickets.length}회</p>
                </div>
            </div>

            <div className="card">
                <h3>행운을 시험해보세요!</h3>
                <p>참가비: 0.003 ETH</p>
                <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                    0부터 999 사이의 숫자를 예측하세요
                </p>
                <input
                    type="number"
                    min="0"
                    max="999"
                    value={lotteryNumber}
                    onChange={(e) => setLotteryNumber(e.target.value)}
                    placeholder="예측 번호 (0-999)"
                    disabled={isLoading}
                />
                <button onClick={onEnter} disabled={isLoading || !lotteryNumber}>
                    {isLoading ? <span className="loading"></span> : null}
                    {isLoading ? '처리 중...' : '복권 참여하기'}
                </button>
            </div>

            {myTickets.length > 0 && (
                <div className="card" style={{ borderColor: '#10b981' }}>
                    <h3>🎫 내 참여 내역</h3>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '1rem' }}>
                        {myTickets.map((ticket, idx) => (
                            <div key={idx} style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: '0.5rem',
                                marginBottom: '0.5rem',
                                borderRadius: '5px',
                                fontSize: '0.9rem',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span>티켓 #{idx + 1}</span>
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                                    예측 번호: {ticket.number?.toString ? ticket.number.toString() : ticket.number}
                                </span>
                            </div>
                        ))}
                    </div>
                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                        총 투자: {(myTickets.length * 0.003).toFixed(3)} ETH
                    </p>
                </div>
            )}

            {(isMockMode || currentAccount.toLowerCase() === manager.toLowerCase()) && (
                <div className="card" style={{ borderColor: '#a855f7' }}>
                    <h3>관리자 구역</h3>
                    <p>당첨자를 선정하시겠습니까?</p>
                    <button onClick={onPickWinner} disabled={isLoading}>
                        당첨자 선정
                    </button>
                </div>
            )}

            {message && <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>{message}</p>}

            {lastWinner && lastWinner !== '0x0000000000000000000000000000000000000000' && (
                <div className="winner-section">
                    <h3>🏆 지난 당첨 결과</h3>
                    <p className="winner-highlight">당첨 번호: {lastWinningNumber}</p>
                    <p className="winner-highlight">당첨자: {lastWinner}</p>
                </div>
            )}

            {tickets.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>전체 참여 현황 ({tickets.length}명)</h3>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {tickets.map((ticket, idx) => (
                            <div key={idx} style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '0.5rem',
                                marginBottom: '0.5rem',
                                borderRadius: '5px',
                                fontSize: '0.85rem'
                            }}>
                                <span>{ticket.player?.slice ? ticket.player.slice(0, 10) : ticket.player}...</span>
                                <span style={{ float: 'right', color: '#a855f7', fontWeight: 'bold' }}>
                                    번호: {ticket.number?.toString ? ticket.number.toString() : ticket.number}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isMockMode && (
                <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'orange' }}>
                    ⚠️ 현재 테스트(Mock) 모드로 실행 중입니다. 실제 블록체인과 연결되지 않았습니다.
                </div>
            )}
        </div>
    );
}

export default App;
