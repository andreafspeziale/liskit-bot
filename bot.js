var Promise = require('bluebird');
var log = require('./log');
var config = require('./config.json');
var functions = require('./functions');
var TelegramBot = require('node-telegram-bot-api');

process.on('uncaughtException', function (err) {
	log.critical ('Except', err.stack);
});

var bot = new TelegramBot (config.telegram.token, {polling: true});


/**
 * Starting bot
 */
bot.onText(/\/start/, function (msg) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    bot.sendMessage(fromId, 'Hey welcome, lets start exploring the ' + config.network.token + ' ' + config.network.network + ' Blockchain with the following commands:\n\n - /help (list of commands)\n - /ping (check bot status)\n - /watch start/stop delegateName (activating/stopping forging monitoring on a delegate)\n - /forged start/stop delegateName (activating/stopping forging block notification on a delegate)\n - /voted start/stop delegateName (activating/stopping votes monitoring on a delegate)\n - /balance delegateName (check balance for delegate name) \n - /markets bittrex | poloniex (check markets data)\n - /rank delegateName (check rank for delegate)\n - /height (check height from node with the highest one)\n - /status http/s IP PORT (check height from delegate node)\n - /list monitoring/forged/voted (show the delegates you are watching/receiving forging or votes notifications)\n - /uptime delegateName (check uptime for delegate name)\n - /pkey delegateName (check public key for delegate name)\n - /findbypkey pkey (find delegate from public key)\n - /address delegateName (check address for delegate name)\n - /voters delegateName (check voters of delegate name)\n - /votes delegateName (check votes made by delegate name)');
});

/**
 * Help bot
 */
bot.onText(/\/help/, function (msg) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    bot.sendMessage(fromId, 'Hey, take a look to the following commands:\n\n - /help (list of commands)\n - /ping (check bot status)\n - /watch start/stop delegateName (activating/stopping forging monitoring on a delegate)\n - /forged start/stop delegateName (activating/stopping forging block notification on a delegate)\n - /voted start/stop delegateName (activating/stopping votes monitoring on a delegate)\n - /balance delegateName (check balance for delegate name)\n - /markets bittrex | poloniex (check markets data)\n - /rank delegateName (check rank for delegate)\n - /height (check height from node with the highest one)\n - /status http/s IP PORT (check height from delegate node)\n - /list monitoring/forged/voted (show the delegates you are watching/receiving forging or votes notifications)\n - /uptime delegateName (check uptime for delegate name)\n - /pkey delegateName (check public key for delegate name)\n - /findbypkey pkey (find delegate from public key)\n - /address delegateName (check address for delegate name)\n - /voters delegateName (check voters of delegate name)\n - /votes delegateName (check votes made by delegate name)');
});

/**
 * Check bot status
 */
bot.onText(/\/ping/, function (msg) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
	var fromId = msg.from.id;
	bot.sendMessage(fromId, 'Pong :D');
});


/**
 * Check official blockchain height
 */

bot.onText(/\/height/, function (msg) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    functions.height().then(function(res) {
        bot.sendMessage(fromId, "The highest blockchain height is "+ res.height +" provided by " + res.ip);
    }, function (err) {
        bot.sendMessage(fromId, err);
    });
});

/**
 * Check delegate balance
 */
bot.onText(/\/balance (.+)/, function (msg, params) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
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
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
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
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    var protocol = params[1].split(" ")[0];
    var ip = params[1].split(" ")[1];
    var port = params[1].split(" ")[2];
    functions.status(protocol, ip, port).then(function(res) {
        bot.sendMessage(fromId, "Syncing: " + res.syncing + "\nBlocks: " + res.blocks + "\nHeight: " + res.height);
    }, function (err) {
        bot.sendMessage(fromId, err);
    });
});

/**
 * Start / stop delegate forging monitoring
 */
bot.onText(/\/watch (.+)/, function(msg, params) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
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

bot.onText(/\/list (.+)/, function (msg, params) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    functions.list(fromId, params[1]).then(function(res) {
		if(params[1] == 'monitoring')
        	bot.sendMessage(fromId, "You are watching the following delegates: "+res);
		if(params[1] == 'forged')
			bot.sendMessage(fromId, "Forging notification are active the following delegates: "+res);
        if(params[1] == 'voted')
            bot.sendMessage(fromId, "Voting notification are active the following delegates: "+res);
    }, function (err) {
        bot.sendMessage(fromId, err);
    });
});

/**
 * Delegate productivity
 */
bot.onText(/\/uptime (.+)/, function (msg, params) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
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
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    functions.pkey(params[1]).then(function(res) {
        bot.sendMessage(fromId, res);
    }, function (err) {
        bot.sendMessage(fromId, "Error, please enter a valid delegate name");
    });
});

/**
 * Find delegate public key
 */
bot.onText(/\/findbypkey (.+)/, function (msg, params) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    functions.findByPkey(params[1]).then(function(res) {
        bot.sendMessage(fromId, res);
    }, function (err) {
        bot.sendMessage(fromId, "Error, please enter a valid delegate name");
    });
});

/**
 * Delegate address
 */
bot.onText(/\/address (.+)/, function (msg, params) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
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
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
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
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    functions.votes(params[1]).then(function(res) {
        bot.sendMessage(fromId, (params[1]) + " delegate have vote for the following delegates (total " + res.total +"): \n" + res.votes);
    }, function (err) {
        bot.sendMessage(fromId, "Error, please enter a valid delegate name");
    });
});

/**
 * List token markets
 * ToDo enable if config market option is defined
 */
bot.onText(/\/markets (.+)/, function (msg, params) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    if ( config.market.available ) {
        functions.markets(params[1]).then(function(res) {
            bot.sendMessage(fromId, "Last 24 hour markets summary for " + config.network.token + " by "+ res.exchange + ":\n\nVolume --> " + res.volume + "\nHigh --> " + res.high + "\nLow --> " + res.low + "\nLast --> " + res.last);
        }, function (err) {
            bot.sendMessage(fromId, err);
        });
    } else
        bot.sendMessage(fromId, "Market not available for " + config.network.token);
});

/**
 * Start / stop delegate forged monitoring
 */

bot.onText(/\/forged (.+)/, function(msg, params) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    var command = params[1].split(" ")[0];
    var delegate = params[1].split(" ")[1];
    functions.forged(command, delegate, fromId).then(function(res) {
        bot.sendMessage(fromId, res);
    }, function(err) {
        console.log(err);
        bot.sendMessage(fromId, err);
    });
});

/**
 * Start / stop delegate voted monitoring
 */

bot.onText(/\/voted (.+)/, function(msg, params) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    var command = params[1].split(" ")[0];
    var delegate = params[1].split(" ")[1];
    functions.voted(command, delegate, fromId).then(function(res) {
        bot.sendMessage(fromId, res);
    }, function(err) {
        console.log(err);
        bot.sendMessage(fromId, err);
    });
});

/**
 * Reward
 */

bot.onText(/\/reward (.+)/, function(msg, params) {
    log.debug("Command",msg.text)
    log.debug("Asked by",msg.from.username + "\n\n")
    var fromId = msg.from.id;
    var address = params[1];
    functions.reward(address).then(function(res) {
        bot.sendMessage(fromId, 
            `Your forging information are: 
            \n\nDays in pool --> ${res.days}
            \nTo be payed now --> ${res.earn}
            \nPayment threshold --> ${res.payment_threshold/100000000} ${config.network.token}
            \nTransaction cost --> ${res.transaction_cost/100000000} ${config.network.token}
            \nAddress --> ${res.address}
            \nBalance --> ${res.voter_balance/100000000} ${config.network.token}
        `);
    }, function(err) {
        console.log(err);
        bot.sendMessage(fromId, err);
    });
});

functions.checkBlocks ();
functions.nextForger();
functions.getVoteInfo();
setInterval (functions.checkBlocks, config.network.blockTime);
setInterval (functions.nextForger, config.network.blockTime);
setInterval (functions.getVoteInfo, config.network.blockTime);
