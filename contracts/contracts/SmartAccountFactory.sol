// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./SmartAccount.sol";

contract SmartAccountFactory {

    address public immutable entryPoint;

    event AccountCreated(address indexed account, address indexed owner, uint256 salt);

    error ZeroAddress();

    constructor(address _entryPoint) {
        if (_entryPoint == address(0)) revert ZeroAddress();
        entryPoint = _entryPoint;
    }

    function createAccount(address _owner, uint256 salt) external returns (SmartAccount account) {
        if (_owner == address(0)) revert ZeroAddress();

        address predicted = getAddress(_owner, salt);
        if (predicted.code.length > 0) return SmartAccount(payable(predicted));

        account = new SmartAccount{salt: bytes32(salt)}(_owner, entryPoint);
        emit AccountCreated(address(account), _owner, salt);
    }

    function getAddress(address _owner, uint256 salt) public view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(SmartAccount).creationCode,
            abi.encode(_owner, entryPoint)
        );
        bytes32 hash = keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            bytes32(salt),
            keccak256(bytecode)
        ));
        return address(uint160(uint256(hash)));
    }

    function isDeployed(address _owner, uint256 salt) external view returns (bool) {
        return getAddress(_owner, salt).code.length > 0;
    }
}
