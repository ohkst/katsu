// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Lottery {
    struct Ticket {
        address player;
        uint256 predictedNumber;
    }

    address public manager;
    Ticket[] public tickets;
    uint256 public entryFee = 0.003 ether;
    address public lastWinner;
    uint256 public lastWinningNumber;
    uint256 public round;

    event TicketPurchased(address indexed player, uint256 predictedNumber);
    event WinnerPicked(address indexed winner, uint256 winningNumber, uint256 prize);

    constructor() {
        manager = msg.sender;
        round = 1;
    }

    function enter(uint256 _predictedNumber) public payable {
        require(msg.value == entryFee, "Entry fee is 0.003 ETH");
        require(_predictedNumber >= 0 && _predictedNumber <= 999, "Number must be between 0 and 999");

        tickets.push(Ticket(msg.sender, _predictedNumber));
        emit TicketPurchased(msg.sender, _predictedNumber);
    }

    function getTickets() public view returns (Ticket[] memory) {
        return tickets;
    }

    // Pseudo-random number generator (Not secure for high stakes, but fine for demo)
    function random() private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.difficulty, block.timestamp, tickets.length))) % 1000;
    }

    function pickWinner() public restricted {
        require(tickets.length > 0, "No tickets sold");

        uint256 winningNumber = random();
        lastWinningNumber = winningNumber;
        
        address winner;
        uint256 prize = address(this).balance;
        
        // Find if anyone matched the number
        bool matchFound = false;
        for (uint i = 0; i < tickets.length; i++) {
            if (tickets[i].predictedNumber == winningNumber) {
                winner = tickets[i].player;
                matchFound = true;
                break; // First match wins for simplicity in this demo
            }
        }

        // If no match, maybe carry over? Or just pick a random ticket?
        // For this requirement: "모금된 코인을 당첨자에게 모두 전달"
        // Let's say if no one guesses the number, the manager picks a random index from tickets.
        // OR to stick to "Lottery" logic, if no one wins, the pot stays.
        // BUT user said "results checked every cycle", implying a winner is expected or at least a result.
        // Let's implement: If exact match, they win. If no exact match, the pot carries over (standard lottery).
        // However, to make it fun for the user, let's add a fallback: Closest number wins? Or just random ticket wins?
        // Re-reading: "예상하는 로또 번호를 입력... 결과 확인... 모금된 코인을 당첨자에게 모두 전달"
        // Usually implies a raffle if it's "all funds to winner".
        // Let's stick to: Randomly select a WINNING TICKET index, and that ticket's number is the "winning number" for the sake of the raffle?
        // NO, user said "Input predicted number". So it's a guess.
        // Let's do: 1. Generate random number. 2. Check matches. 3. If match, pay. 4. If no match, Manager can decide to refund or carry over.
        // For simplicity and "transparency", let's just pay the winner if found.
        
        if (matchFound) {
            payable(winner).transfer(prize);
            lastWinner = winner;
            emit WinnerPicked(winner, winningNumber, prize);
        } else {
            // No winner this round
            emit WinnerPicked(address(0), winningNumber, 0);
        }
        
        // Reset for next round
        delete tickets;
        round++;
    }

    modifier restricted() {
        require(msg.sender == manager, "Only manager can call this");
        _;
    }
}
