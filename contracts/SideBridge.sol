// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./BridgeMintableToken.sol";

contract SideBridge is OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    mapping(address => address) public swapMappingMain2Side;
    mapping(address => address) public swapMappingSide2Main;
    mapping(bytes32 => bool) public filledMainTx;

    uint256 public swapFee;

    /* ========== EVENTS ========== */
    event SwapPairCreated(
        bytes32 indexed mainRegisterTxHash,
        address indexed sideTokenAddr,
        address indexed mainTokenAddr,
        string symbol,
        string name,
        uint8 decimals
    );
    event SwapStarted(
        address indexed sideTokenAddr,
        address indexed mainTokenAddr,
        address indexed fromAddr,
        uint256 amount,
        uint256 feeAmount
    );
    event SwapFilled(
        address indexed sideTokenAddr,
        bytes32 indexed mainTxHash,
        address indexed toAddress,
        uint256 amount
    );

    function initialize(
        uint256 fee
    ) public initializer {
        __Ownable_init();
        swapFee = fee;
    }

    /**
     * @dev Returns set minimum swap fee from sideToken to mainToken
     */
    function setSwapFee(uint256 fee) external onlyOwner {
        swapFee = fee;
    }

    /**
     * @dev createSwapPair
     */
    function createSwapPair(
        bytes32 mainTxHash,
        address mainTokenAddr,
        string calldata name,
        string calldata symbol,
        uint8 decimals
    ) external onlyOwner returns (address) {
        require(swapMappingMain2Side[mainTokenAddr] == address(0x0), "duplicated swap pair");

        BridgeMintableToken token = new BridgeMintableToken(name, symbol, decimals);
        
        swapMappingMain2Side[mainTokenAddr] = address(token);
        swapMappingSide2Main[address(token)] = mainTokenAddr;

        emit SwapPairCreated(mainTxHash, address(token), mainTokenAddr, symbol, name, decimals);
        return address(token);
    }

    /**
     * @dev fillMain2SideSwap
     */
    function fillMain2SideSwap(
        bytes32 mainTxHash,
        address mainTokenAddr,
        address toAddress,
        uint256 amount
    ) external onlyOwner returns (bool) {
        require(!filledMainTx[mainTxHash], "main swap tx filled already");
        address sideTokenAddr = swapMappingMain2Side[mainTokenAddr];
        require(sideTokenAddr != address(0x0), "no swap pair for this token");
        filledMainTx[mainTxHash] = true;
        BridgeMintableToken(sideTokenAddr).mint(toAddress, amount);
        emit SwapFilled(sideTokenAddr, mainTxHash, toAddress, amount);

        return true;
    }
    /**
     * @dev swapSide2Main
     */
    function swapSide2Main(address sideTokenAddr, uint256 amount) external returns (bool) {
        address mainTokenAddr = swapMappingSide2Main[sideTokenAddr];
        require(mainTokenAddr != address(0x0), "no swap pair for this token");

        IERC20Upgradeable(sideTokenAddr).safeTransferFrom(msg.sender, address(this), amount);
        BridgeMintableToken(sideTokenAddr).burn(address(this), amount);

        emit SwapStarted(sideTokenAddr, mainTokenAddr, msg.sender, amount, 0);
        return true;
    }
}