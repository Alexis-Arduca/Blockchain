// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title Counter
 * @notice Contrat cible utilisé pour les tests de SmartAccount.
 *         Chaque adresse (smart account) a son propre compteur.
 *
 * Ce contrat sert aussi de base pour la partie 1.2 du sujet.
 */
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
