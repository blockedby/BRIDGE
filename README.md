# Simple Bridge for EVM chains



contract
https://rinkeby.etherscan.io/address/0xEC1d65396Ff9ECabA09F3dfcF01d0AEA1D9e7C15#code
https://testnet.bscscan.com/address/0x991879fd7a029E9788FB74925Aa8B7FCdc8F745d#code
token
https://rinkeby.etherscan.io/address/0x2ae196c8f7c5e48de656632985f92263a4341770#code
https://testnet.bscscan.com/address/0x663C878D92959b0E92818175F20E322d2F9d1aa0#code

# How It Works

1) you should give minting rights to bridge
2) set gateway(chainID/address)
3) add token (tokenAddress,bridgedAddress, chainID
4) swap (addressTo, amount, chainID, token symbol)
5) catch event with params
6) set gateway at other chain 
7) add token 
8) set validator
9) grant validator role 
10) validate 
11) redeem executed