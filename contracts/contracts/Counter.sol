// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract Counter {
    mapping(address => uint256) private _counts;

    event Incremented(address indexed account, uint256 newCount);

    /// @notice Incrémente le compteur de msg.sender
    function increment() external {
        _counts[msg.sender]++;
        emit Incremented(msg.sender, _counts[msg.sender]);
    }

    /// @notice Remet à zéro le compteur de msg.sender
    function reset() external {
        _counts[msg.sender] = 0;
    }

    /// @notice Retourne le compteur d'une adresse donnée
    function getCount(address account) external view returns (uint256) {
        return _counts[account];
    }
}
