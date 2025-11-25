// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Lottery {
    address public manager;
    address[] public players;
    address public lastWinner;

    constructor() {
        manager = msg.sender;
    }

    function enter() public payable {
        require(msg.value == .003 ether, "Must send exactly 0.003 ETH");
        players.push(msg.sender);
    }

    function random() private view returns (uint) {
        // Pseudo-random number generator (Not secure for production with high stakes)
        return uint(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, players)));
    }

    function pickWinner() public restricted {
        require(players.length > 0, "No players in the lottery");
        
        uint index = random() % players.length;
        address winner = players[index];
        lastWinner = winner;
        
        (bool success, ) = winner.call{value: address(this).balance}("");
        require(success, "Transfer failed");
        
        players = new address[](0); // Reset the lottery
    }

    function getPlayers() public view returns (address[] memory) {
        return players;
    }

    modifier restricted() {
        require(msg.sender == manager, "Only manager can call this function");
        _;
    }
}
