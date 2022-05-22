// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IERC20Query.sol";

contract MainBridge is OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    mapping(address => bool) public registeredERC20;
    mapping(bytes32 => bool) public filledSideTx;
    uint256 public swapFee;

    /* ========== EVENTS ========== */
    event SwapPairRegister(
        address indexed sponsor,
        address indexed mainTokenAddr,
        string name,
        string symbol,
        uint8 decimals
    );
    event SwapStarted(
        address indexed mainTokenAddr,
        address indexed fromAddr,
        uint256 amount,
        uint256 feeAmount
    );
    event SwapFilled(
        address indexed mainTokenAddr,
        bytes32 indexed sideTxHash,
        address indexed toAddress,
        uint256 amount
    );

    function initialize(uint256 fee) public initializer {
        __Ownable_init();
        swapFee = fee;
    }

    /**
     * @dev Returns set minimum swap fee from ERC20 to BEP20
     */
    function setSwapFee(uint256 fee) external onlyOwner {
        swapFee = fee;
    }

    function registerSwapPairToSide(address mainTokenAddr) external returns (bool) {
        require(!registeredERC20[mainTokenAddr], "already registered");

        string memory name = IERC20Query(mainTokenAddr).name();
        string memory symbol = IERC20Query(mainTokenAddr).symbol();
        uint8 decimals = IERC20Query(mainTokenAddr).decimals();

        require(bytes(name).length>0, "empty name");
        require(bytes(symbol).length>0, "empty symbol");

        registeredERC20[mainTokenAddr] = true;

        emit SwapPairRegister(msg.sender, mainTokenAddr, name, symbol, decimals);
        return true;
    }

    function fillSide2MainSwap(
        bytes32 sideTxHash,
        address mainTokenAddr,
        address toAddress,
        uint256 amount
    ) external onlyOwner returns (bool) {
        require(!filledSideTx[sideTxHash], "side tx filled already");
        require(registeredERC20[mainTokenAddr], "not registered token");

        filledSideTx[sideTxHash] = true;
        IERC20Upgradeable(mainTokenAddr).safeTransfer(toAddress, amount);

        emit SwapFilled(mainTokenAddr, sideTxHash, toAddress, amount);
        return true;
    }

    function swapMain2Side(
        address mainTokenAddr,
        uint256 amount
    ) external returns (bool) {
        require(registeredERC20[mainTokenAddr], "not registered token");
        IERC20Upgradeable(mainTokenAddr).safeTransferFrom(msg.sender, address(this), amount);
        emit SwapStarted(mainTokenAddr, msg.sender, amount, 0);
        return true;
    }
}