//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./ZepToken.sol";

contract Bridge is AccessControl {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    Counters.Counter private nonce;

    address public validator;
    uint256 public chainID;

    ZepToken public zepToken;
    mapping(uint256 => address) private gateways;
    mapping(address => bool) private tokenState;
    mapping(string => address) public symbolToAddress;
    mapping(address => mapping(uint256 => address)) public bridges;
    mapping(bytes => uint256) private sigToNonce;
    bytes32 public constant MODERATOR = keccak256("MODERATOR");
    bytes32 public constant VALIDATOR = keccak256("VALIDATOR");

    event SwapInitialized(
        address _to,
        uint256 _amount,
        uint256 indexed _chainID,
        string indexed _tokenSymbol,
        uint256 indexed _nonce
    );
    event SwapExecuted(
        address _to,
        uint256 _amount,
        uint256 indexed _chainID,
        string indexed _tokenSymbol,
        uint256 indexed _nonce
    );
    event TokenAdded(
        string indexed _tokenSymbol,
        address indexed _tokenAddress,
        uint256 indexed _chainID,
        address _bridgedTokenAddress
    );
    event BridgedAddressChanged(
        string indexed _tokenSymbol,
        address indexed _tokenAddress,
        uint256 indexed _chainID,
        address _bridgedTokenAddress
    );
    event TokenPaused(
        string indexed _tokenSymbol,
        address indexed _tokenAddress
    );
    event TokenUnpaused(
        string indexed _tokenSymbol,
        address indexed _tokenAddress
    );

    modifier Authorised() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
                hasRole(MODERATOR, msg.sender) ||
                msg.sender == address(this),
            "Unauthorised 2"
        );
        _;
    }

    constructor(uint256 _chainID) {
        chainID = _chainID;
        nonce.increment();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    function getCurrentNonce() public view returns (uint256) {
        return nonce.current();
    }

    function setChainID(uint256 _chainID) public Authorised {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Unauthorised 1");
        chainID = _chainID;
    }
    
    function setPauseOnToken(string memory _tokenSymbol) public Authorised{
        require(isTokenAdded(_tokenSymbol),"Wrong symbol");
        tokenState[symbolToAddress[_tokenSymbol]] = false;
        emit TokenPaused(_tokenSymbol, symbolToAddress[_tokenSymbol]);
    }
    function setPlayOnToken(string memory _tokenSymbol) public Authorised{
        require(isTokenAdded(_tokenSymbol),"Wrong symbol");
        tokenState[symbolToAddress[_tokenSymbol]] = true;
        emit TokenUnpaused(_tokenSymbol, symbolToAddress[_tokenSymbol]);
    }

    function setGateway(uint256 _chainID, address _newGateway)
        public
        Authorised
    {
        require(_chainID != chainID,"It is you, he he heh");
        gateways[_chainID] = _newGateway;
    }

    function getGateway(uint256 _chainID) public view returns (address) {
        require(gateways[_chainID] != address(0), "Gateway is not configured");
        return gateways[_chainID];
    }

    function setValidator(address _newValidator) public Authorised {
        validator = _newValidator;
    }

    function isChainConfigured(string memory _tokenSymbol, uint256 _chainID)
        public
        view
        returns (bool)
    {
        return bridges[symbolToAddress[_tokenSymbol]][_chainID] != address(0);
    }

    function isTokenAdded(string memory _tokenSymbol)
        public
        view
        returns (bool)
    {
        return symbolToAddress[_tokenSymbol] != address(0);
    }

    function isTokenActive(string memory _tokenSymbol)
        public
        view
        returns (bool)
    {
        require(isTokenAdded(_tokenSymbol), "Token isn't added");
        return tokenState[symbolToAddress[_tokenSymbol]];
    }

    function getTokenAddress(string memory _tokenSymbol)
        public
        view
        returns (address)
    {
        require(isTokenAdded(_tokenSymbol), "Token isn't added");
        return symbolToAddress[_tokenSymbol];
    }

    function getBridgedAddress(string memory _tokenSymbol, uint256 _chainID)
        public
        view
        returns (address)
    {
        require(isTokenAdded(_tokenSymbol), "Token isn't added");
        require(
            isChainConfigured(_tokenSymbol, _chainID),
            "Chain is not configured"
        );
        return bridges[symbolToAddress[_tokenSymbol]][_chainID];
    }

    function setBridgedAddress(
        string memory _tokenSymbol,
        uint256 _chainID,
        address _bridgedTokenAddress
    ) public Authorised {
        require(_bridgedTokenAddress != address(0), "Can't be zero address");
        require(gateways[_chainID] != address(0), "Gateway is not configured");
        bridges[symbolToAddress[_tokenSymbol]][_chainID] =
            _bridgedTokenAddress;
        emit BridgedAddressChanged(_tokenSymbol, symbolToAddress[_tokenSymbol], _chainID, _bridgedTokenAddress);
    }

    function addToken(
        address _tokenAddress,
        address _bridgedTokenAddress,
        uint256 _chainID
    ) public Authorised {
        require(
            _tokenAddress != address(0) && _bridgedTokenAddress != address(0),
            "Address can't be 0x000"
        );
        require(gateways[_chainID] != address(0), "Gateway is not configured");
        ZepToken token = ZepToken(_tokenAddress);
        string memory symbol = token.symbol();
        require(
            symbolToAddress[symbol] == address(0),
            "Token with that symbol is already added"
        );
        // set address
        symbolToAddress[symbol] = _tokenAddress;
        // set bridge
        bridges[_tokenAddress][_chainID] = _bridgedTokenAddress;
        // turn on swap
        tokenState[_tokenAddress] = true;
        emit TokenAdded(symbol,_tokenAddress, _chainID, _bridgedTokenAddress);
    }

    function swap(
        address _to,
        uint256 _amount,
        uint256 _chainID,
        string memory _tokenSymbol
    ) public payable // nonce
    {
        require(gateways[_chainID] != address(0), "Gateway is not configured");

        require(
            isTokenAdded(_tokenSymbol),
            "Token isn't added, or wrong symbol"
        );
        require(isTokenActive(_tokenSymbol), "Token is on pause");
        require(_to != address(0), "Can't send to zero address");
        address tokenAddress = symbolToAddress[_tokenSymbol];
        ZepToken(tokenAddress).burn(msg.sender, _amount);

        emit SwapInitialized(
            _to,
            _amount,
            _chainID,
            _tokenSymbol,
            nonce.current()
        );
        nonce.increment();
    }

    function redeem(
        address _to,
        uint256 _amount,
        uint256 _chainID,
        string memory _tokenSymbol,
        uint256 _nonce,
        bytes memory _signature
    ) public 
    {
        require(_chainID == chainID, "Wrong chain ID");
        require(isTokenActive(_tokenSymbol), "Token is on pause");
        bytes32 acceptedHash = keccak256(
            abi.encodePacked(_to,_amount,_chainID,_tokenSymbol,_nonce)
        );
        bytes32 acceptedMessage = acceptedHash.toEthSignedMessageHash();
        require(
            hasRole(VALIDATOR, acceptedMessage.recover(_signature)),
            "Wrong signature"
        );
        require(sigToNonce[_signature] == 0, "Already redeemed");
        sigToNonce[_signature] = _nonce;
        ZepToken(symbolToAddress[_tokenSymbol]).mint(_to, _amount);
        emit SwapExecuted(_to, _amount, _chainID, _tokenSymbol, _nonce);
    }
}
