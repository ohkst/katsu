// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Lottery {
    struct Ticket {
        address player;
        uint8[6] numbers; // 6 numbers between 1-45
    }

    address public manager;
    Ticket[] public tickets;
    address public lastWinner;
    uint8[6] public lastWinningNumbers;
    uint public lastMatchCount;

    constructor() {
        manager = msg.sender;
    }

    function enter(uint8[6] memory _numbers) public payable {
        require(msg.value == .003 ether, "Must send exactly 0.003 ETH");
        
        // Validate numbers are in range 1-45 and unique
        for (uint i = 0; i < 6; i++) {
            require(_numbers[i] >= 1 && _numbers[i] <= 45, "Numbers must be between 1 and 45");
            for (uint j = i + 1; j < 6; j++) {
                require(_numbers[i] != _numbers[j], "Numbers must be unique");
            }
        }
        
        tickets.push(Ticket({
            player: msg.sender,
            numbers: _numbers
        }));
    }

    function random() private view returns (uint) {
        return uint(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, tickets.length)));
    }

    function pickWinner() public restricted {
        require(tickets.length > 0, "No players in the lottery");
        
        // Generate 6 random winning numbers (1-45)
        uint8[6] memory winningNumbers;
        bool[46] memory used; // Track used numbers (index 0 unused, 1-45 used)
        
        for (uint i = 0; i < 6; i++) {
            uint8 num;
            do {
                num = uint8((random() + i) % 45) + 1; // 1-45
            } while (used[num]);
            used[num] = true;
            winningNumbers[i] = num;
        }
        
        lastWinningNumbers = winningNumbers;
        
        // Find ticket with most matches
        address winner = tickets[0].player;
        uint maxMatches = countMatches(tickets[0].numbers, winningNumbers);
        
        for (uint i = 1; i < tickets.length; i++) {
            uint matches = countMatches(tickets[i].numbers, winningNumbers);
            if (matches > maxMatches) {
                maxMatches = matches;
                winner = tickets[i].player;
            }
        }
        
        lastWinner = winner;
        lastMatchCount = maxMatches;
        
        (bool success, ) = winner.call{value: address(this).balance}("");
        require(success, "Transfer failed");
        
        delete tickets;
    }

    function countMatches(uint8[6] memory numbers1, uint8[6] memory numbers2) private pure returns (uint) {
        uint matches = 0;
        for (uint i = 0; i < 6; i++) {
            for (uint j = 0; j < 6; j++) {
                if (numbers1[i] == numbers2[j]) {
                    matches++;
                    break;
                }
            }
        }
        return matches;
    }

    function getTickets() public view returns (Ticket[] memory) {
        return tickets;
    }

    function getTicketCount() public view returns (uint) {
        return tickets.length;
    }

    modifier restricted() {
        require(msg.sender == manager, "Only manager can call this function");
        _;
    }
}
