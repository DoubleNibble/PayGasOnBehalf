const rlp = require('rlp');
const ethereumjs = require('../private/ethereumjs-tx-1.3.3');
const Web3 = require('../node_modules/web3');

// TODO get env
// TODO proteggere il keyfile in una cartella apposita keystore/
// TODO rebuild keyfile.json & change passwd
const KEYFILE_PATH = "./keyfile.json";
const KEYFILE_PASSWD = "foo-bar-baz";
const RPC_PROVIDER = "https://ropsten.infura.io/v3/4dea9169133246318e58fe7ac1bdbdef";

const web3 = new Web3(new Web3.providers.HttpProvider(RPC_PROVIDER));


const numToHex = (n) => {
    let res;
    try {res=parseInt(n);}
    catch {res=0;}
    if (isNaN(res)){res=0;}
    return web3.utils.toHex(res)
}

const TX_FIELDS = [
    "nonce",
    "gasPrice",
    "gasLimit",
    "to",
    "value",
    "data"
];


const keyfile_obj = require(KEYFILE_PATH);

const publisher_account = web3.eth.accounts.decrypt(keyfile_obj, KEYFILE_PASSWD);
const getPublisherAccountBalance = () => {
    // eg
    // getPublisherAccountBalance().then(console.log);
    return web3.eth.getBalance(publisher_account.address);
}

// clients_tx params to input
const wrapClientTx = (client_tx_buffered) => {
    // TODO return rlp.encode(client_tx_buffered.raw) prepended with func id could be easier
    let params = [];
    // tx params
    for (let i = 0; i < TX_FIELDS.length; i++) {
        let fld = TX_FIELDS[i];
        let value = client_tx_buffered[fld];
        params.push(value);
    }
    // append signature
    params.push(client_tx_buffered.v);
    params.push(client_tx_buffered.r);
    params.push(client_tx_buffered.s);
    let result = rlp.encode(params);
    return result
}


//  check that data calls a predefined method
const callsMethod = (method_id) => {
    return function(data_hex) {
        let res = data_hex.startsWith(method_id)
        return res 
    }
}
// check that value is null or 0, because ofc a publisher cannot transfer value from client addresses
const valueIsNull = () => {
    return function(value_int) {
        return (! value_int)
    }
}
// example validation
const egValidation = () => {
    return {
        data: callsMethod("2e1a7d4d"),
        value: valueIsNull()
    }
}

// { key -> SC address : { key -> client address | {...TX_FIELDS:callbacks for validation} } }
const WHITELIST = {
    // Smart Contract address
    "0x3673b368babf8a7015cbec48a3ad1b7741bd151e": {
        // client address
        "0xe3b702e91ee01bee9e04ed87c2515e6be81e08b4": {
            // data validation callback
            data: callsMethod("2e1a7d4d"),
            // value validation callback
            value: valueIsNull(),
        },
        // client address with validation wrapped
        "0x3673b368babf8a7015cbec48a3ad1b7741bd151e": egValidation(),
    },
}

// from raw hex to js object formatted
function decodeTx(hex) {
  var tx = new ethereumjs.Tx(hex);

  var rawTx = {
      nonce: parseInt(tx.nonce.toString('hex'),16),
      gasPrice: parseInt(tx.gasPrice.toString('hex'),16),
      gasLimit: parseInt(tx.gasLimit.toString('hex'),16),
      to: '0x'+tx.to.toString('hex'),
      value: parseInt(tx.value.toString('hex'), 16),
      data: tx.data.toString('hex'),
  };

  if (tx.r.length) {
    rawTx = {
      ...rawTx,

      from: '0x'+tx.from.toString('hex'),
      r: tx.r.toString('hex'),
      v: tx.v.toString('hex'),
      s: tx.s.toString('hex'),
    }
  }

  return rawTx
}

// check tx object against the WHITELIST
function checkAgainstWhitelist(obj) {
    let errors=[];
    try {
        let wsc = WHITELIST[obj.to];
        if (wsc === undefined) { errors.push("Smart Contract address not whitelisted") }
        else {
            let wc = wsc[obj.from];
            if (wc === undefined) { errors.push("Client address not whitelisted for this Smart Contract") }
            else {
                // validate each field of the tx
                for (let i = 0; i < TX_FIELDS.length; i++) {
                    let fld = TX_FIELDS[i];
                    let validate = wc[fld] || function () {return true}; // valid if no validator callback
                    if (! validate(obj[fld])) { errors.push(fld + " invalid")}
                }
            }
        }
    }
    catch (e) {
        errors.push(e.toString());
    }
    return {
        result: !errors.length,
        errors: errors
    }
}

module.exports = {
    decodeTx: decodeTx,
    checkAgainstWhitelist: checkAgainstWhitelist ,
    wrapClientTx: wrapClientTx
};