var config = require('./config.json');
var log = require('./log');
var morgan = require('morgan');
var functions = require('./functions');
var TelegramBot = require('node-telegram-bot-api');

process.on('uncaughtException', function (err) {
	console.log ('Except', err.stack);
});

var bot = new TelegramBot (config.telegram.token, {polling: true});


/**
 * Starting bot
 */
bot.onText(/\/start/, function (msg) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    bot.sendMessage(fromId, 'Hey welcome, lets start exploring the Lisk Blockchain with the following commands:\n\n - /help (list of commands)\n - /ping (check bot status)\n - /watch start/stop delegateName (activating/stopping forging monitoring on a delegate)\n - /balance delegateName (check balance for delegate name) \n - /rank delegateName (check rank for delegate)\n - /height (check height from an official node)\n - /status IP (check height from delegate node)\n - /list (show the delegates you are monitoring)\n - /uptime delegateName (check uptime for delegate name)\n - /pkey delegateName (check public key for delegate name)\n - /address delegateName (check address for delegate name)\n - /voters delegateName (check voters of delegate name)\n - /votes delegateName (check votes made by delegate name)');
});

/**
 * Help bot
 */
bot.onText(/\/help/, function (msg) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    bot.sendMessage(fromId, 'Hey, take a look to the following commands:\n\n - /help (list of commands)\n - /ping (check bot status)\n - /watch start/stop delegateName (activating/stopping forging monitoring on a delegate)\n - /balance delegateName (check balance for delegate name) \n - /rank delegateName (check rank for delegate)\n - /height (check height from an official node)\n - /status IP (check height from delegate node)\n - /list (show the delegates you are monitoring)\n - /uptime delegateName (check uptime for delegate name)\n - /pkey delegateName (check public key for delegate name)\n - /address delegateName (check address for delegate name)\n - /voters delegateName (check voters of delegate name)\n - /votes delegateName (check votes made by delegate name)');
});

/**
 * Check bot status
 */
bot.onText(/\/ping/, function (msg) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
	var fromId = msg.from.id;
	bot.sendMessage(fromId, 'Pong :D');
});


/**
 * Check official blockchain height
 */
bot.onText(/\/height/, function (msg) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    functions.height().then(function(res) {
        bot.sendMessage(fromId, "The official blockchain height is "+res.height+" by official liskit node");
    }, function (err) {
        bot.sendMessage(fromId, err);
    });
});

/**
 * Check delegate balance
 */
bot.onText(/\/balance (.+)/, function (msg, params) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
	var fromId = msg.from.id;
    functions.balance(params[1]).then(function(res) {
        bot.sendMessage(fromId, "Your balance is actually "+res);
    }, function (err) {
        bot.sendMessage(fromId, "Error, please enter a valid delegate name");
    });
});

/**
 * Check delegate rank
 */
bot.onText(/\/rank (.+)/, function (msg, params) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
	var fromId = msg.from.id;
    functions.rank(params[1]).then(function(res) {
        bot.sendMessage(fromId, "Your rank is actually "+res.rate);
    }, function (err) {
        bot.sendMessage(fromId, "Error, please enter a valid delegate name");
    });
});

/**
 * Check node blockchain status
 */
bot.onText(/\/status (.+)/, function (msg, params) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    functions.status(params[1]).then(function(res) {
        bot.sendMessage(fromId, "Syncing: " + res.syncing + "\nBlocks: " + res.blocks + "\nHeight: " + res.height);
    }, function (err) {
        bot.sendMessage(fromId, err);
    });
});

/**
 * Start / stop delegate forging monitoring
 */
bot.onText(/\/watch (.+)/, function(msg, params) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    var command = params[1].split(" ")[0];
    var delegate = params[1].split(" ")[1];
    functions.monitoring(command, delegate, fromId).then(function(res) {
        bot.sendMessage(fromId, res);
    }, function(err) {
        console.log(err);
        bot.sendMessage(fromId, err);
    });
});

/**
 * List watching list
 */
bot.onText(/\/list/, function (msg) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    functions.list(fromId).then(function(res) {
        bot.sendMessage(fromId, "You are watching the following delegates: "+res);
    }, function (err) {
        bot.sendMessage(fromId, err);
    });
});

/**
 * Delegate productivity
 */
bot.onText(/\/uptime (.+)/, function (msg, params) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    functions.uptime(params[1]).then(function(res) {
        bot.sendMessage(fromId, res);
    }, function (err) {
        bot.sendMessage(fromId, "Error, please enter a valid delegate name");
    });
});

/**
 * Delegate public key
 */
bot.onText(/\/pkey (.+)/, function (msg, params) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    functions.pkey(params[1]).then(function(res) {
        bot.sendMessage(fromId, res);
    }, function (err) {
        bot.sendMessage(fromId, "Error, please enter a valid delegate name");
    });
});

/**
 * Delegate address
 */
bot.onText(/\/address (.+)/, function (msg, params) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    functions.address(params[1]).then(function(res) {
        bot.sendMessage(fromId, res);
    }, function (err) {
        bot.sendMessage(fromId, "Error, please enter a valid delegate name");
    });
});

/**
 * List votes received
 */
bot.onText(/\/voters (.+)/, function (msg, params) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    functions.voters(params[1]).then(function(res) {
        bot.sendMessage(fromId, "The following delegates vote for you (total " + res.total +"): \n" + res.voters);
    }, function (err) {
        bot.sendMessage(fromId, "Error, please enter a valid delegate name");
    });
});


/**
 * List votes made
 */
bot.onText(/\/votes (.+)/, function (msg, params) {
    console.log("Command: " + msg.text + "\nAsked by: " + msg.from.username + "\nDate: " + msg.date + "\n\n");
    var fromId = msg.from.id;
    functions.votes(params[1]).then(function(res) {
        bot.sendMessage(fromId, (params[1]) + " delegate have vote for the following delegates (total " + res.total +"): \n" + res.votes);
    }, function (err) {
        bot.sendMessage(fromId, "Error, please enter a valid delegate name");
    });
});


functions.checkBlocks ();
setInterval (functions.checkBlocks, 10000);
