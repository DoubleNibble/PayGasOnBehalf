/* API endpoint for receiving client tx */
var express = require('express');
var router = express.Router();

const {
  decodeTx,
  checkAgainstWhitelist,
  wrapClientTx,
  builPublisherTx
} = require('../private/ethereum-utils');
const ethTx = require('../private/ethereumjs-tx-1.3.3');

// TODO remove when in prod
const EG_INVALID_TX = '0xf90339018506fc23ac008310000094000000000000000000000000000000000000000080b902d26060604052341561000c57fe5b60405160a0806102d2833981016040528080519060200190919080519060200190919080519060200190919080519060200190919080519060200190919050505b84600060006101000a81548160ff02191690831515021790555083600060016101000a81548160ff021916908360ff1602179055508260018190555081600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555080600381600019169055505b50505050505b6101e7806100eb6000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806337af7327146100675780634aa2762e146100b9578063bc109174146100e7578063d2a174e51461010d578063fab261f414610137575bfe5b341561006f57fe5b610077610163565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b34156100c157fe5b6100c9610189565b60405180826000191660001916815260200191505060405180910390f35b34156100ef57fe5b6100f761018f565b6040518082815260200191505060405180910390f35b341561011557fe5b61011d610195565b604051808215151515815260200191505060405180910390f35b341561013f57fe5b6101476101a8565b604051808260ff1660ff16815260200191505060405180910390f35b600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60035481565b60015481565b600060009054906101000a900460ff1681565b600060019054906101000a900460ff16815600a165627a7a72305820ff945b9d7a6ff1e878bec54db295bb00226acfa2fb89419a3f9798c76963b16500291ba08aecbf204ffac9c31638c4cf508c5a83600fb755b869235aefe0708f460f8126a043b5fb3bd40cc632fa8f274e4bc5503c72a34b6349344b2d1b48b45055a3e110'
const EG_VALID_TX = '0xf8830308827a08943673b368babf8a7015cbec48a3ad1b7741bd151e80a42e1a7d4d00000000000000000000000000000000000000000000000000b1a2bc2ec500002aa07caefce22135185684d0cd8fd79e272dee6157cebb3397824f81458ff6106c60a0695cefa533e163b9dce71ed6246be04b407f27eed2c86f8c77d10c08cee9a48e';

/* GET -> Json (query_params: [rawTx]) */
router.get('/', async(req, res, next) => {
  var pubTx, pubTxParams, pubTxHash;
  var rawTx = req.query.rawTx || EG_VALID_TX;
  var query = {
    rawTx: rawTx,
    status:"valid",
    objTx: undefined
  };
  var result = {
    publishing: undefined,
    errors: [],
  };

  // rawTx 2 objTx
  try {
    query.objTx = decodeTx(rawTx);
    query.bufferedTx = new ethTx.Tx(rawTx);
  }
  catch (e) {
    query.status = "invalid";
    errors.push("Invalid rawTx");
  }

  // check, and append errors
  if (query.objTx !== undefined) {
      let {errors} = checkAgainstWhitelist(query.objTx);
      result.errors.push(...errors);
  }
  

  // build publisher tx
  if (! result.errors.length) {
    // obtain the build object from the util method
    let build_obj = await builPublisherTx({
      to: query.objTx.to,
      // SC function id called by the client
      data: query.objTx.data.substring(0,8) + wrapClientTx(query.bufferedTx).toString("hex")
    });
    pubTxParams = build_obj.params;

    // console.log(build_obj.result);

    // if no errors we're ready to go
    if (!build_obj.errors.length) {
      pubTx = build_obj.result.rawTransaction;
      pubTxHash = build_obj.result.messageHash;

      // TODO ACTIVATE BLOCKCHAIN PUBLISHING WHEN READY
      
    } else {
      result.errors.push(...build_obj.errors);
    }
  }
  
  result.publishing = ! result.errors.length;

  res.setHeader('Content-Type', 'application/json');
  // TODO remove debug when in prod
  let debug = {
    rawTx: rawTx,
    objTx: query.objTx,
    rawTxParams: query.bufferedTx.toJSON(),
    publisherTxParams: pubTxParams,
    publisherTx: pubTx,
    publisherTxHash: pubTxHash
  }

  res.end(JSON.stringify({
    result: result,
    debug: debug
  }));
});

module.exports = router;
