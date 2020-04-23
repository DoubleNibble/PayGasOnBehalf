var ut = require("../private/ethereum-utils");
var web3 = ut.web3;
const chainId = "0x3";
const ntxGas = 21000;
const txGas = web3.utils.toHex(ntxGas);

// shortcuts
const pk2acc = (pk) => {return web3.eth.accounts.privateKeyToAccount(pk)};
const getBalance = (addr) => {return web3.eth.getBalance(addr)};
const wei2eth = (weis) => {return web3.utils.fromWei(weis.toString(),"ether")};

// user accounts
var w1 = pk2acc("0x0689b0f63ff393cdc1085e3acef85a3d8334b98a2c32ac294f623245a2814674");
var w2 = pk2acc("0x64cc5e6db47fd9b3de42856546f8f1b682660e67f5b1fe91c8a4fb797eb9a79f");
var w3 = pk2acc("0x6c9bf9127fc4f978e0d4350d7f5db93a9458f807e97b195d5ab9e092d391d978");
var p1 = pk2acc("0xffd65b9d6efcac604b5473d39c13c1b2c5f55f5c86a2fb61e3ccd713274b11bb");
var p2 = pk2acc("0xfcdf054274554ecf4adbfa97ea64dc4236a4fb62f015d41016dbe2f9c1c7db1f");
var p3 = pk2acc("0x59c8119ea2748468a60c2893d4ea08c4c941ef60a13101ae5b537367701dec64");
var users = [w1,w2,w3,p1,p2,p3];


// faucet
var faucet_address = "0x81b7E08F65Bdf5648606c89998A9CC8164397647"

// empty every user account
// if the account has sufficient balance to make a tx, it will forward all his balance to the facuet_addres
const emptyAccounts = async(accounts) => {
  for (var i = accounts.length - 1; i >= 0; i--) {
    let acc = accounts[i];
    let gasPrice;
    await web3.eth.getGasPrice().then((r)=>{gasPrice = r;});
    let gasWeis = (ntxGas * gasPrice);

    let weis,tx,txValue,txGas_,nValue,nGas; 
    await getBalance(acc.address)
      .then(async(r)=>{
        weis=r;

        // if balance is 0 or < gasWeis we cant make a tx
        if (! weis || weis < gasWeis) {
          tx = undefined;
          console.log(`address ${acc.address} ALREADY empty!`);
          return
        }

        nValue = Math.max(0,(weis-gasWeis)); // never below 0
        txValue = web3.utils.toHex( nValue );
        await web3.eth.accounts.signTransaction({
          chainId:chainId,
          value:txValue,
          gas:txGas,
          to:faucet_address
        },acc.privateKey)
          .then((r_)=>{
            tx=r_;
          })
          .catch((e)=>{
            tx = undefined;
            console.log(e);
          });
      })
      .catch((e)=>{
        tx = undefined;
        console.log(e);
      });
    
    // if there is a tx, publish to blockchain
    if (tx) {
      let rtx = tx.rawTransaction;
      await web3.eth.sendSignedTransaction(rtx)
        .then((h)=>{console.log(`address ${acc.address} IS NOW empty!`)})
        .catch((e)=>{
          console.log(`unable to empty address ${acc.address}`);
          console.log(e);
      })
    }
  }
}

module.exports = {
  web3:web3,
  pk2acc:pk2acc,
  getBalance:getBalance,
  wei2eth:wei2eth,
  users:users,
  faucet_address:faucet_address,
  emptyAccounts:emptyAccounts
}