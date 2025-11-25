// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Lottery {
    struct Ticket {
        address player;
        uint number;
    }

    address public manager;
    Ticket[] public tickets;
    address public lastWinner;
    uint public lastWinningNumber;

    constructor() {
        manager = msg.sender;
    }

    function enter(uint _number) public payable {
        require(msg.value == .003 ether, "Must send exactly 0.003 ETH");
        require(_number >= 0 && _number <= 999, "Number must be between 0 and 999");
        tickets.push(Ticket({
            player: msg.sender,
            number: _number
        }));
    }

    function random() private view returns (uint) {
        // Pseudo-random number generator (Not secure for production with high stakes)
        return uint(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, tickets.length)));
    }

    function pickWinner() public restricted {
        require(tickets.length > 0, "No players in the lottery");
        
        uint winningNumber = random() % 1000; // 0-999
        lastWinningNumber = winningNumber;
        
        // Find closest match
        address winner = tickets[0].player;
        uint minDiff = abs(int(tickets[0].number) - int(winningNumber));
        
        for (uint i = 1; i < tickets.length; i++) {
            uint diff = abs(int(tickets[i].number) - int(winningNumber));
            if (diff < minDiff) {
                minDiff = diff;
                winner = tickets[i].player;
            }
        }
        
        lastWinner = winner;
        
        (bool success, ) = winner.call{value: address(this).balance}("");
        require(success, "Transfer failed");
        
        delete tickets; // Reset the lottery
    }

    function abs(int x) private pure returns (uint) {
        return x >= 0 ? uint(x) : uint(-x);
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
