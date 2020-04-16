var express = require('express');
var router = express.Router();

/* GET tour page. */
router.get('/', function(req, res, next) {
  res.render('tour', { title: 'Tx Publisher - Tour' });
});

module.exports = router;
