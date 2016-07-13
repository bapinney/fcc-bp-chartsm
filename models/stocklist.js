var mongoose = require('mongoos');
var Schema = mongoose.Schema;


var stocklistSchema = new Schema({
    name    : String,
    stocks  : Array
    },
    {collection: 'fcc-chartsm'}
);

module.exports = mongoose.model('Stocklist', stocklistSchema);

