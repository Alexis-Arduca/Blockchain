// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";

contract MockEntryPoint {
    receive() external payable {}
    fallback() external payable {}

    function callExecute(
        address account,
        address target,
        uint256 value,
        bytes calldata data
    ) external {
        (bool ok, bytes memory result) = account.call(
            abi.encodeWithSignature(
                "execute(address,uint256,bytes)",
                target,
                value,
                data
            )
        );
        if (!ok) {
            assembly { revert(add(result, 32), mload(result)) }
        }
    }
}