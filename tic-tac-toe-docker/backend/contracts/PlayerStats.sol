// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PlayerStats {
    struct Stats {
        uint player_id;
        uint wins;
        uint draws;
        uint losses;
    }

    // Mapeo de player_id a estadísticas
    mapping(uint => Stats) private playerStats;
    
    // Mapeo de player_id a dirección de MetaMask
    mapping(uint => address) public playerAddressById;

    event PlayerRegistered(address indexed player, uint indexed player_id);
    event StatsUpdated(uint indexed player_id, uint wins, uint draws, uint losses);

    // Registrar un nuevo jugador con un player_id único
    function registerPlayer(uint player_id) public {
        require(playerAddressById[player_id] == address(0), "Player ID already registered.");

        playerStats[player_id] = Stats(player_id, 0, 0, 0); // Inicializar estadísticas en 0
        playerAddressById[player_id] = msg.sender;          // Asociar player_id a la dirección de MetaMask
        emit PlayerRegistered(msg.sender, player_id);
    }

    // Actualizar estadísticas para un player_id específico
    function updateStats(uint player_id, uint wins, uint draws, uint losses) public {
        require(playerAddressById[player_id] == msg.sender, "Unauthorized update.");

        // Actualizar las estadísticas del player_id
        playerStats[player_id].wins += wins;
        playerStats[player_id].draws += draws;
        playerStats[player_id].losses += losses;

        emit StatsUpdated(player_id, playerStats[player_id].wins, playerStats[player_id].draws, playerStats[player_id].losses);
    }

    // Obtener estadísticas de un player_id específico
    function getStatsByPlayerId(uint player_id) public view returns (uint, uint, uint, uint) {
        Stats memory stats = playerStats[player_id];
        return (stats.player_id, stats.wins, stats.draws, stats.losses);
    }
}
