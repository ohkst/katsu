import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, getProvider } from './web3';
import './Lottery.css';

function App() {
    const [manager, setManager] = useState('');
    const [tickets, setTickets] = useState([]);
    const [balance, setBalance] = useState('');
    const [lastWinner, setLastWinner] = useState('');
    const [lastWinningNumbers, setLastWinningNumbers] = useState([]);
    const [lastMatchCount, setLastMatchCount] = useState(0);
    const [currentAccount, setCurrentAccount] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMockMode, setIsMockMode] = useState(false);
    const [lotteryNumbers, setLotteryNumbers] = useState(['', '', '', '', '', '']);
    const [myTickets, setMyTickets] = useState([]);

    useEffect(() => {
        const init = async () => {
            try {
                const contract = await getContract();
                if (!contract) {
                    console.log("Contract not found, enabling Mock Mode");
                    setIsMockMode(true);
                    setManager('0x1234...abcd');
                    setTickets([
                        { player: '0xUser1...', numbers: [3, 7, 15, 23, 31, 42] },
                        { player: '0xUser2...', numbers: [1, 5, 10, 20, 30, 40] }
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
                const winningNums = await contract.lastWinningNumbers();
                const matchCount = await contract.lastMatchCount();
                const balanceWei = await provider.getBalance(await contract.getAddress());

                setManager(managerAddress);
                setTickets(ticketsList);
                setLastWinner(lastWinnerAddress);
                setLastWinningNumbers(winningNums.map(n => n.toString()));
                setLastMatchCount(matchCount.toString());
                setBalance(ethers.formatEther(balanceWei));

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

    const handleNumberChange = (index, value) => {
        const newNumbers = [...lotteryNumbers];
        newNumbers[index] = value;
        setLotteryNumbers(newNumbers);
    };

    const validateNumbers = () => {
        const nums = lotteryNumbers.map(n => parseInt(n)).filter(n => !isNaN(n));

        if (nums.length !== 6) {
            alert("6개의 번호를 모두 입력해주세요!");
            return false;
        }

        for (let num of nums) {
            if (num < 1 || num > 45) {
                alert("번호는 1부터 45 사이여야 합니다!");
                return false;
            }
        }

        const uniqueNums = new Set(nums);
        if (uniqueNums.size !== 6) {
            alert("중복되지 않은 6개의 번호를 입력해주세요!");
            return false;
        }

        return true;
    };

    const onEnter = async () => {
        if (!validateNumbers()) return;

        const nums = lotteryNumbers.map(n => parseInt(n));

        try {
            setMessage('트랜잭션 처리 중입니다...');
            setIsLoading(true);

            if (isMockMode) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const newTicket = { player: currentAccount || "0xMockUser", numbers: nums };
                setMessage(`복권 참여가 완료되었습니다! (번호: ${nums.join(', ')}, 테스트 모드)`);
                setTickets([...tickets, newTicket]);
                setMyTickets([...myTickets, newTicket]);
                setBalance((parseFloat(balance || 0) + 0.003).toFixed(3));
                setLotteryNumbers(['', '', '', '', '', '']);
                setIsLoading(false);
                return;
            }

            const contract = await getContract();
            const tx = await contract.enter(nums, {
                value: ethers.parseEther('0.003')
            });
            await tx.wait();
            setMessage(`복권 참여가 완료되었습니다! (번호: ${nums.join(', ')})`);

            const ticketsList = await contract.getTickets();
            const provider = getProvider();
            const balanceWei = await provider.getBalance(await contract.getAddress());
            setTickets(ticketsList);
            setBalance(ethers.formatEther(balanceWei));

            const userTickets = ticketsList.filter(t =>
                t.player.toLowerCase() === currentAccount.toLowerCase()
            );
            setMyTickets(userTickets);
            setLotteryNumbers(['', '', '', '', '', '']);
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
                const winningNums = [];
                const used = new Set();
                while (winningNums.length < 6) {
                    const num = Math.floor(Math.random() * 45) + 1;
                    if (!used.has(num)) {
                        used.add(num);
                        winningNums.push(num);
                    }
                }

                let winner = tickets[0];
                let maxMatches = 0;

                for (let ticket of tickets) {
                    let matches = 0;
                    for (let num of ticket.numbers) {
                        if (winningNums.includes(num)) matches++;
                    }
                    if (matches > maxMatches) {
                        maxMatches = matches;
                        winner = ticket;
                    }
                }

                setLastWinner(winner.player);
                setLastWinningNumbers(winningNums);
                setLastMatchCount(maxMatches);
                setMessage(`당첨 번호: ${winningNums.join(', ')} | 당첨자: ${winner.player} (${maxMatches}개 일치) (테스트 모드)`);
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
            const winningNums = await contract.lastWinningNumbers();
            const matchCount = await contract.lastMatchCount();
            setLastWinner(winner);
            setLastWinningNumbers(winningNums.map(n => n.toString()));
            setLastMatchCount(matchCount.toString());
            setMessage(`당첨 번호: ${winningNums.join(', ')} | 당첨자: ${winner} (${matchCount}개 일치)`);

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
    const allNumbersFilled = lotteryNumbers.every(n => n !== '');

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
                <h3>행운의 번호를 선택하세요!</h3>
                <p>참가비: 0.003 ETH</p>
                <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.5rem', marginBottom: '1rem' }}>
                    1부터 45 사이의 중복되지 않는 6개 번호
                </p>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                }}>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <input
                            key={i}
                            type="number"
                            min="1"
                            max="45"
                            value={lotteryNumbers[i]}
                            onChange={(e) => handleNumberChange(i, e.target.value)}
                            placeholder={`번호 ${i + 1}`}
                            disabled={isLoading}
                            style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}
                        />
                    ))}
                </div>
                <button onClick={onEnter} disabled={isLoading || !allNumbersFilled}>
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
                                fontSize: '0.9rem'
                            }}>
                                <div style={{ marginBottom: '0.3rem' }}>티켓 #{idx + 1}</div>
                                <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                    {(ticket.numbers || []).map((num, i) => (
                                        <span key={i} style={{
                                            background: '#10b981',
                                            color: 'white',
                                            padding: '0.3rem 0.6rem',
                                            borderRadius: '50%',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem',
                                            minWidth: '2rem',
                                            textAlign: 'center'
                                        }}>
                                            {num?.toString ? num.toString() : num}
                                        </span>
                                    ))}
                                </div>
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
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '1rem 0' }}>
                        {lastWinningNumbers.map((num, i) => (
                            <span key={i} className="winner-highlight" style={{
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                padding: '0.5rem 0.8rem',
                                borderRadius: '50%',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                minWidth: '2.5rem',
                                textAlign: 'center',
                                color: 'white'
                            }}>
                                {num}
                            </span>
                        ))}
                    </div>
                    <p className="winner-highlight">당첨자: {lastWinner}</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>일치 개수: {lastMatchCount}개</p>
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
                                <div>{ticket.player?.slice ? ticket.player.slice(0, 10) : ticket.player}...</div>
                                <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                                    {(ticket.numbers || []).map((num, i) => (
                                        <span key={i} style={{
                                            background: '#a855f7',
                                            color: 'white',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '50%',
                                            fontSize: '0.8rem',
                                            minWidth: '1.5rem',
                                            textAlign: 'center'
                                        }}>
                                            {num?.toString ? num.toString() : num}
                                        </span>
                                    ))}
                                </div>
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
