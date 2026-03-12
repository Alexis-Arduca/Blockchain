// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";

contract SmartAccount {
    using ECDSA for bytes32;

    uint256 private constant SIG_VALIDATION_FAILED  = 1;
    uint256 private constant SIG_VALIDATION_SUCCESS = 0;

    address public owner;
    address public immutable entryPoint;

    struct SessionKeyData {
        bool active;
        uint256 expiry;                          // 0 = pas de limite
        mapping(bytes4 => bool) allowedSelectors;
    }

    mapping(address => SessionKeyData) private _sessionKeys;

    event SessionKeyAdded(address indexed key, uint256 expiry);
    event SessionKeyRevoked(address indexed key);

    error NotOwner();
    error NotEntryPoint();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyEntryPoint() {
        if (msg.sender != entryPoint) revert NotEntryPoint();
        _;
    }

    constructor(address _owner, address _entryPoint) {
        if (_owner == address(0) || _entryPoint == address(0)) revert ZeroAddress();
        owner = _owner;
        entryPoint = _entryPoint;
    }

    receive() external payable {}

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256) {
        if (missingAccountFunds > 0) {
            (bool ok, ) = payable(entryPoint).call{value: missingAccountFunds}("");
            (ok);
        }

        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        address recovered = ECDSA.recover(ethSignedHash, userOp.signature);

        if (recovered == owner) return SIG_VALIDATION_SUCCESS;

        return _validateSessionKey(recovered, userOp.callData);
    }

    function execute(address target, uint256 value, bytes calldata data)
        external
        onlyEntryPoint
    {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly { revert(add(result, 32), mload(result)) }
        }
    }

    function addSessionKey(address key, uint256 expiry, bytes4[] calldata selectors)
        external
        onlyOwner
    {
        if (key == address(0)) revert ZeroAddress();
        SessionKeyData storage sk = _sessionKeys[key];
        sk.active = true;
        sk.expiry = expiry;
        for (uint256 i = 0; i < selectors.length; i++) {
            sk.allowedSelectors[selectors[i]] = true;
        }
        emit SessionKeyAdded(key, expiry);
    }

    function revokeSessionKey(address key) external onlyOwner {
        _sessionKeys[key].active = false;
        emit SessionKeyRevoked(key);
    }

    function isSessionKeyValid(address key) external view returns (bool) {
        SessionKeyData storage sk = _sessionKeys[key];
        if (!sk.active) return false;
        if (sk.expiry != 0 && block.timestamp > sk.expiry) return false;
        return true;
    }

    function isSessionKeyAllowed(address key, bytes4 selector) external view returns (bool) {
        return _sessionKeys[key].allowedSelectors[selector];
    }

    function getSessionKeyInfo(address key) external view returns (bool active, uint256 expiry) {
        return (_sessionKeys[key].active, _sessionKeys[key].expiry);
    }

    function getDeposit() external view returns (uint256) {
        (bool ok, bytes memory data) = entryPoint.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        if (!ok || data.length < 32) return 0;
        return abi.decode(data, (uint256));
    }

    // Interne

    /**
     * @dev Vérifie qu'une session key est active, non expirée, et autorisée sur le selector appelé.
     *
     * Structure du callData (execute(address,uint256,bytes)) :
     *   [0:4]     selector de execute
     *   [4:36]    target
     *   [36:68]   value
     *   [68:100]  offset de bytes data
     *   [100:132] longueur de data
     *   [132:136] selector de la fonction cible  ← ce qu'on vérifie
     */
    function _validateSessionKey(address key, bytes calldata callData)
        private
        view
        returns (uint256)
    {
        SessionKeyData storage sk = _sessionKeys[key];

        if (!sk.active) return SIG_VALIDATION_FAILED;
        if (sk.expiry != 0 && block.timestamp > sk.expiry) return SIG_VALIDATION_FAILED;

        if (callData.length >= 136) {
            bytes4 innerSelector = bytes4(callData[132:136]);
            if (!sk.allowedSelectors[innerSelector]) return SIG_VALIDATION_FAILED;
        }

        return SIG_VALIDATION_SUCCESS;
    }
}
