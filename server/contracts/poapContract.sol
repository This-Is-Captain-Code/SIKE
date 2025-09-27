// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SIKE is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    string private _baseTokenURI;

    event MemoryCreated(
        address indexed sender,
        address indexed receiver,
        uint256 tokenIdSender,
        uint256 tokenIdReceiver,
        string memoryText
    );

    constructor(string memory baseURI) ERC721("ETHGlobal Events", "SIKE") Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    // Override _baseURI function from ERC721
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function createMemory(
        address sender,
        address receiver
    ) external {
        require(sender != address(0) && receiver != address(0), "Invalid address");
        require(sender != receiver, "Sender and receiver must differ");

        string memory memoryText = string(
            abi.encodePacked(
                "Person ",
                toAsciiString(sender),
                " met Person ",
                toAsciiString(receiver),
                " at ETHGlobal New Delhi"
            )
        );

        // Mint NFT to sender
        _tokenIds.increment();
        uint256 tokenIdSender = _tokenIds.current();
        _safeMint(sender, tokenIdSender);

        // Mint NFT to receiver
        _tokenIds.increment();
        uint256 tokenIdReceiver = _tokenIds.current();
        _safeMint(receiver, tokenIdReceiver);

        emit MemoryCreated(sender, receiver, tokenIdSender, tokenIdReceiver, memoryText);
    }

    // Helper function to convert address to string
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = '0';
        s[1] = 'x';
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i + 2] = char(hi);
            s[2*i + 3] = char(lo);            
        }
        return string(s);
    }

    // Helper function to convert byte to ascii char
    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 48);
        else return bytes1(uint8(b) + 87);
    }
}
