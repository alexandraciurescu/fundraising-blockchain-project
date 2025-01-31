// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GovernanceToken is ERC20, Ownable {
    mapping(address => bool) public minters;
    
    event MinterSet(address indexed minter, bool status);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    constructor() ERC20("HumanitarianDAO", "HDAO") Ownable(msg.sender) {
        // Mint inițial redus pentru owner
        _mint(msg.sender, 100000 * 10 ** decimals()); // Reducem mint-ul inițial
    }

    modifier onlyMinter() {
        require(minters[msg.sender], "Not authorized to mint");
        _;
    }

    // Funcție pentru setarea minter-ilor
    function setMinter(address minter, bool status) public onlyOwner {
        minters[minter] = status;
        emit MinterSet(minter, status);
    }

    // Modificăm funcția mint să poată fi folosită de minters
    function mint(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // Funcție pentru arderea token-urilor
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    // Funcție pentru delegarea voturilor
    // un utilizator transfera puterea de vot catre alt user care poate vota in numele sau
    mapping(address => address) private _delegates;

    function delegate(address delegatee) public {
        require(delegatee != address(0), "Cannot delegate to zero address");
        _delegates[msg.sender] = delegatee;
    }

    function getDelegate(address account) public view returns (address) {
        return _delegates[account];
    }

    // Override pentru transferuri pentru a actualiza delegații
    function _update(address from, address to, uint256 value) internal virtual override {
        super._update(from, to, value);
        
        // Dacă este un transfer (nu mint sau burn), și destinatarul nu are delegat
        if (from != address(0) && to != address(0) && _delegates[to] == address(0)) {
            _delegates[to] = to; // Auto-delegare pentru noul holder
        }
    }
}