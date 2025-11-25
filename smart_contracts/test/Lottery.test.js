const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lottery", function () {
    let Lottery;
    let lottery;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        Lottery = await ethers.getContractFactory("Lottery");
        lottery = await Lottery.deploy();
        await lottery.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right manager", async function () {
            expect(await lottery.manager()).to.equal(owner.address);
        });
    });

    describe("Transactions", function () {
        it("Should allow a player to enter", async function () {
            await lottery.connect(addr1).enter({ value: ethers.parseEther("0.003") });
            const players = await lottery.getPlayers();
            expect(players[0]).to.equal(addr1.address);
            expect(players.length).to.equal(1);
        });

        it("Should fail if incorrect ETH amount sent", async function () {
            await expect(
                lottery.connect(addr1).enter({ value: ethers.parseEther("0.001") })
            ).to.be.revertedWith("Must send exactly 0.003 ETH");
        });

        it("Should allow multiple players to enter", async function () {
            await lottery.connect(addr1).enter({ value: ethers.parseEther("0.003") });
            await lottery.connect(addr2).enter({ value: ethers.parseEther("0.003") });
            const players = await lottery.getPlayers();
            expect(players.length).to.equal(2);
            expect(players[0]).to.equal(addr1.address);
            expect(players[1]).to.equal(addr2.address);
        });

        it("Should pick a winner and reset the array", async function () {
            await lottery.connect(addr1).enter({ value: ethers.parseEther("0.003") });

            const initialBalance = await ethers.provider.getBalance(addr1.address);

            await lottery.pickWinner();

            const finalBalance = await ethers.provider.getBalance(addr1.address);
            const players = await lottery.getPlayers();

            expect(players.length).to.equal(0);
            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("Should only allow manager to pick winner", async function () {
            await lottery.connect(addr1).enter({ value: ethers.parseEther("0.003") });
            await expect(
                lottery.connect(addr1).pickWinner()
            ).to.be.revertedWith("Only manager can call this function");
        });
    });
});
