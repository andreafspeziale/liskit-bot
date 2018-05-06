/**
 * Created by andreafspeziale on 21/10/16.
 */

// ToDo clean code from console.log

var log = require ('./log');
var request = require ('request');
var config = require('./config.json');
var fs = require('fs');
var TelegramBot = require('node-telegram-bot-api');
var _ = require('lodash');
var log = require('./log');

var bot = new TelegramBot (config.telegram.token, {polling: true});

var del;
var absoluteHeight = 0;
var bestPublicNode = "";
var delegateList = [];
var rejected = {};
var alerted = {};
var alive = {};
var lastDelegate = {"publicKey":"EMPTY_KEY"}

var checkHeight = function (node) {
    return new Promise(function (resolve, reject) {
        request(node + '/api/loader/status/sync', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var height = JSON.parse(body).height;
                var response = {
                    "node":node,
                    "height":height
                };
                resolve(response);
            } else {
                reject('checkHeight: ' + node + ' has some problem dropping it');
            }
        })
    })
}

/**
 *
 * Choosing the best node btw the official ones
 * @returns {Promise}
 */

var chooseNode = function() {
    return new Promise(function (resolve, reject) {
        var counter = 0;
        for (var node in config.publicNodes) {
            checkHeight(config.publicNodes[node]).then(function (res) {
                counter += 1;
                if(absoluteHeight < res.height) {
                    absoluteHeight = res.height;
                    bestPublicNode = res.node;
                }
                if(counter == config.publicNodes.length) {
                    resolve(bestPublicNode);
                }
            }, function (err) {
                counter += 1;
                if(counter == config.publicNodes.length) {
                    resolve(bestPublicNode);
                }
            })
        }
    })
};

/**
 * Save or load delegate in monitor
 */
var saveDelegateMonitor = function () {
    return new Promise(function (resolve, reject) {
        fs.writeFile('monitor.json', JSON.stringify (delegateMonitor), function (err,data) {
            if(!err)
                resolve(true);
            else
                reject("Something wrong saving the delegate data");
        });
    })
};
var loadDelegateMonitor = function () {
    try {
        return JSON.parse (fs.readFileSync('monitor.json', 'utf8'));
    } catch (e) {
        return {};
    }
};

var delegateMonitor = loadDelegateMonitor();


/**
 *
 * @param delegate
 * Chek if is delegate or not
 */

 // ToDo return at least a message saying the Delegate is not in forging rank

var browseDelegate = function (pageCounter) {
    return new Promise(function (resolve, reject) {
        chooseNode().then(function(res) {
            var localNode = res;
            request(localNode + '/api/delegates/?limit=' + config.network.numberOfDelegate + '&offset=' + pageCounter + '&orderBy=rate:asc', function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var res = JSON.parse(body)
                    if (res.delegates.length) {
                        resolve(res);
                    }
                } else {
                    reject(error);
                }
            })
        }, function (err) {
            log.critical("Error chooseNode",err)
        });
    });
};

var isDelegate = function (delegate) {
    return new Promise(function (resolve, reject) {
        var pageCounter = 0;
        var numberOfDelegates = 0;
        browseDelegate(pageCounter).then(function(res) {
            numberOfDelegates = res.totalCount;
            for(pageCounter; pageCounter < numberOfDelegates; pageCounter += config.network.numberOfDelegate) {
                browseDelegate(pageCounter).then(function(res) {
                    var delegates = res;
                    for (var i = 0; i < delegates.delegates.length; i++) {
                        if (delegate.indexOf (delegates.delegates[i].username) != -1) {
                            del = delegates.delegates[i];
                            resolve(true);
                        } else {
                            reject(false);
                        }
                    }
                }, function (err) {
                    log.critical("Error browseDelegate",err);
                    reject(false);
                });
            }
        }, function (err) {
            log.critical("Error browseDelegate",err);
            reject(false);
        });
    });
};

/**
 *
 * @param delegate
 * Check delegate balance
 */
var checkBalance = function () {
    return new Promise(function (resolve, reject) {
        chooseNode().then(function(res) {
            request(res + '/api/accounts/getBalance?address=' + del.address, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var balance = JSON.parse(body);
                    resolve(balance);
                } else {
                    log.critical("checkBalance: something went wrong with the request\n\n",error);
                    reject("checkBalance: something went wrong with the request\n\n");
                }
            })
        }, function (err) {
            log.critical('Error in chooseNode', err);
        });
    });
};

/**
 *
 * @param node
 * @returns {Promise}
 * Check blockchain status for a given node
 */
var checkNodeStatus = function (protocol,node,port) {
    return new Promise(function (resolve, reject) {
        if (node.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
            request(protocol+ "://" + node + ":" + port + '/api/loader/status/sync',{timeout: 3500}, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    resolve(JSON.parse(body));
                } else {
                    log.critical("Problem checkNodeStatus","There is some kind of problem with the IP\nIP: "+node+"\nError: "+error+"\n\n");
                    reject("There is some kind of problem with your request.\nYou asked to check the status on "+ protocol + "://" + node + ":" + port + ".\nCheck your node API access list, ask liskitbot IP to liskit delegate");
                }
            })
        } else {
            reject("The IP is not valid");
        }
    });
};

/**
 *
 * @returns {Promise}
 * Check official blockchain height
 */

var checkOfficialHeight = function() {
    return new Promise(function (resolve, reject) {
        chooseNode().then(function(res) {
            request(res + '/api/loader/status/sync', function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var status = JSON.parse(body);
                    resolve({
                        height: status.height,
                        ip: res
                    });
                } else {
                    reject("There is some kind of problem with the node API calls");
                }
            });
        }, function (err) {
            log.critical('Error in chooseNode', err);
        });
    });
};

var height = function () {
    return new Promise(function (resolve, reject) {
        checkOfficialHeight().then(function (res) {
            resolve(res);
        }, function (err) {
            reject(err);
        })
    })
};

var balance = function (delegate) {
    return new Promise(function (resolve, reject) {
        // checking if is a delegate
        isDelegate(delegate).then(function (res) {
            // checking delegate balance
            checkBalance(del).then(function (res) {
                resolve((Math.floor( (parseFloat(res.balance * Math.pow(10, -8))) * 100)/ 100).toLocaleString());
            }, function (err) {
                reject(err);
            })
        }, function (err) {
            reject(err);
        })
    })
};

var rank = function (delegate) {
    return new Promise(function (resolve, reject) {
        isDelegate(delegate).then(function (res) {
            resolve(del);
        }, function (err) {
            reject(false);
        });
    });
};

var status = function (protocol,node,port) {
    return new Promise(function (resolve, reject) {
        checkNodeStatus(protocol,node,port).then(function (res) {
            resolve(res);
        }, function (err) {
            reject(err);
        });
    });
};

/**
 *
 * @param delegate
 * Check if delegate is in watching
 */
var isWatching = function (delegate, type) {
    return new Promise(function (resolve, reject) {
        if(type == 'monitoring') {
            if(delegate in delegateMonitor.failures) {
                resolve(true);
            } else {
                reject(false);
            }
        }
        if(type == 'forged') {
            if(delegate in delegateMonitor.forged) {
                resolve(true);
            } else {
                reject(false);
            }
        }
        if(type == 'voted') {
            if(delegate in delegateMonitor.voted) {
                resolve(true);
            } else {
                reject(false);
            }
        }
    })
}

var voted = function (command, delegate, fromId) {
    var type = 'voted';
    return new Promise(function (resolve, reject){
        if (command == "start" || command == "stop") {
            isDelegate(delegate).then(function (res) {
                if(command=="start") {
                    isWatching(delegate, type).then(function (res) {
                        if(delegateMonitor.voted[delegate].indexOf (fromId) != -1){
                            reject("Voting notification on " + delegate + " already activated");
                        } else {
                            delegateMonitor.voted[delegate].push (fromId);
                            saveDelegateMonitor().then(function (res) {
                                resolve("The voting notification has been activated for: " + delegate);
                            }, function (err) {
                                reject(err);
                            })
                        }
                    }, function (err) {
                        delegateMonitor.voted[delegate] = [fromId];
                        saveDelegateMonitor().then(function (res) {
                            resolve("The voting notification has been activated for: " + delegate);
                        }, function (err) {
                            reject(err);
                        })
                    })
                } else {
                    isWatching(delegate, type).then(function (res) {
                        if( (i = (delegateMonitor.voted[delegate].indexOf (fromId))) != -1){
                            delegateMonitor.voted[delegate].splice (i, 1);
                            saveDelegateMonitor().then(function (res) {
                                resolve("The voting notification for " + delegate + " has been stopped");
                            }, function (err) {
                                reject(err);
                            })
                        } else {
                            reject("The voting notification for " + delegate + " has never been activated");
                        }
                    }, function (err) {
                        reject("The voting notification for " + delegate + " has never been activated");
                    })
                }
            }, function (err) {
                reject("Error, please enter a valid delegate name");
            });
        } else {
            reject("Command rejected.\nYou can only start or stop monitoring your node.")
        }
    });
}

var forged = function (command, delegate, fromId) {
    var type = 'forged';
    return new Promise(function (resolve, reject){
        if (command == "start" || command == "stop") {
            isDelegate(delegate).then(function (res) {
                if(command=="start") {
                    isWatching(delegate, type).then(function (res) {
                        if(delegateMonitor.forged[delegate].indexOf (fromId) != -1){
                            reject("Forging notification on " + delegate + " already activated");
                        } else {
                            delegateMonitor.forged[delegate].push (fromId);
                            saveDelegateMonitor().then(function (res) {
                                resolve("The forging notification has been activated for: " + delegate);
                            }, function (err) {
                                reject(err);
                            })
                        }
                    }, function (err) {
                        delegateMonitor.forged[delegate] = [fromId];
                        saveDelegateMonitor().then(function (res) {
                            resolve("The forging notification has been activated for: " + delegate);
                        }, function (err) {
                            reject(err);
                        })
                    })
                } else {
                    isWatching(delegate, type).then(function (res) {
                        if( (i = (delegateMonitor.forged[delegate].indexOf (fromId))) != -1){
                            delegateMonitor.forged[delegate].splice (i, 1);
                            saveDelegateMonitor().then(function (res) {
                                resolve("The forging notification for " + delegate + " has been stopped");
                            }, function (err) {
                                reject(err);
                            })
                        } else {
                            reject("The forging notification for " + delegate + " has never been activated");
                        }
                    }, function (err) {
                        reject("The forging notification for " + delegate + " has never been activated");
                    })
                }
            }, function (err) {
                reject("Error, please enter a valid delegate name");
            });
        } else {
            reject("Command rejected.\nYou can only start or stop monitoring your node.")
        }
    });
}

var monitoring = function (command, delegate, fromId){
    var type = 'monitoring';
    return new Promise(function (resolve, reject){
        if (command == "start" || command == "stop") {
            isDelegate(delegate).then(function (res) {
                if(command=="start") {
                    // log.debug("monitoring func: ", "command start");
                    // check if is already in

                    isWatching(delegate, type).then(function (res) {
                        //if is in --> check if is asked from same chatId
                        if(delegateMonitor.failures[delegate].indexOf (fromId) != -1){
                            // from same chat id
                            reject("Waching on " + delegate + " already activated");
                        } else {
                            // different chat id, so adding it to watching
                            delegateMonitor.failures[delegate].push (fromId);
                            saveDelegateMonitor().then(function (res) {
                                resolve("The watching has been activated for: " + delegate);
                            }, function (err) {
                                reject(err);
                            })
                        }
                    }, function (err) {
                        //if is not in --> enable the watch
                        delegateMonitor.failures[delegate] = [fromId];
                        saveDelegateMonitor().then(function (res) {
                            resolve("The watching has been activated for: " + delegate);
                        }, function (err) {
                            reject(err);
                        })
                    })
                } else {
                    // log.debug("monitoring func: ", "command stop");
                    // check if is already in
                    isWatching(delegate, type).then(function (res) {
                        // check chat id
                        if( (i = (delegateMonitor.failures[delegate].indexOf (fromId))) != -1){
                            // from same chat id
                            delegateMonitor.failures[delegate].splice (i, 1);
                            saveDelegateMonitor().then(function (res) {
                                resolve("The monitoring for " + delegate + " has been stopped");
                            }, function (err) {
                                reject(err);
                            })
                        } else {
                            // different chat id, so adding it to watching
                            reject("The monitoring for " + delegate + " has never been activated");
                        }
                    }, function (err) {
                        //if is not in --> watch has been never activated
                        reject("The monitoring for " + delegate + " has never been activated");
                    })
                }
            }, function (err) {
                reject("Error, please enter a valid delegate name");
            });
        } else {
            log.critical("monitoring func: ", "command rejected");
            reject("Command rejected.\nYou can only start or stop monitoring your node.")
        }
    });
};



var nextForger = function() {
    chooseNode().then(function(res) {
        let localNode = res;
        log.debug('nextForger is using ', localNode)
        request(localNode + '/api/delegates/getNextForgers?limit=' + config.network.numberOfDelegate, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                var res = JSON.parse(body);
                var nextForgerPublicKey = res.delegates[0];

                //setTimeout(function(){
                request(localNode + '/api/delegates/get?publicKey=' + lastDelegate.publicKey, (error, response, body) => {

                    var delegateInfo = JSON.parse(body);

                    if (!error && response.statusCode == 200 && delegateInfo.success == true) {
                        if(delegateInfo.delegate.username in delegateMonitor.forged){
                            if(delegateInfo.delegate.producedblocks != lastDelegate.producedblocks){
                                /*log.debug("CHANGED!!",lastDelegate.username + " - " + delegateInfo.delegate.username)
                                 log.debug("CHANGED!!",lastDelegate.producedblocks + " - " + delegateInfo.delegate.producedblocks)
                                 log.debug("CHANGED!!",lastDelegate.publicKey + " - " + delegateInfo.delegate.publicKey)
                                 log.debug("CHANGED!!",lastDelegate.missedblocks + " - " + delegateInfo.delegate.missedblocks)*/
                                for (var j = 0; j < delegateMonitor.forged[lastDelegate.username].length; j++)
                                    bot.sendMessage (delegateMonitor.forged[lastDelegate.username][j], 'Congratulation! The delegate ' + lastDelegate.username + ' produced a block right now.');
                            }
                            if(delegateInfo.delegate.missedblocks != lastDelegate.missedblocks){
                                /*log.debug("CHANGED!!"lastDelegate.username + " - " + delegateInfo.delegate.username)
                                 log.debug("CHANGED!!"lastDelegate.producedblocks + " - " + delegateInfo.delegate.producedblocks)
                                 log.debug("CHANGED!!",lastDelegate.publicKey + " - " + delegateInfo.delegate.publicKey)
                                 log.debug("CHANGED!!",lastDelegate.missedblocks + " - " + delegateInfo.delegate.missedblocks)*/
                                for (var j = 0; j < delegateMonitor.forged[lastDelegate.username].length; j++)
                                    bot.sendMessage (delegateMonitor.forged[lastDelegate.username][j], 'Warning! The delegate ' + lastDelegate.username + ' have missed a block right now.');
                            }
                            /*else{
                             log.critical("NOT CHANGED!! --> " + lastDelegate.username + " - " + delegateInfo.delegate.username)
                             log.critical("NOT CHANGED!! --> " + lastDelegate.producedblocks + " - " + delegateInfo.delegate.producedblocks)
                             log.critical("NOT CHANGED!! --> " + lastDelegate.publicKey + " - " + delegateInfo.delegate.publicKey)
                             log.critical("NOT CHANGED!! --> " + lastDelegate.missedblocks + " - " + delegateInfo.delegate.missedblocks)
                             for (var j = 0; j < delegateMonitor.forged[lastDelegate.username].length; j++)
                             bot.sendMessage (delegateMonitor.forged[lastDelegate.username][j], 'Warning! The delegate ' + lastDelegate.username + ' have missed a block right now.');
                             }*/
                        }
                    }else{
                        // first time will be null --> so error
                    }
                    request(localNode + '/api/delegates/get?publicKey=' + nextForgerPublicKey, (error, response, body) => {

                        if (!error && response.statusCode == 200) {
                            var res2 = JSON.parse(body);
                            lastDelegate = res2.delegate;
                        }else{
                            log.critical("Error in nextForger",error);
                        }
                    });

                });//},5000)
            } else {
                log.critical("Error in nextForger", error);
            }
        });
    }, function (err) {
        log.critical("Error in nextForger", err);
    });
}

var checkBlocks = function() {
    // blocks scheduler for alerts
    chooseNode().then(function(res) {
        let localNode = res;
        log.debug('checkBlocks is using ', localNode)
        request(localNode + '/api/delegates/?limit=' + config.network.numberOfDelegate + '&offset=0&orderBy=rate:asc', function (error, response, body) {
            // getting all delegates
            if (!error && response.statusCode == 200) {
                delegateList = [];
                var res = JSON.parse(body);
                for (var i = 0; i < res.delegates.length; i++) {
                    // check if the delegate is in monitoring mode
                    if (res.delegates[i].username in delegateMonitor.failures) {
                        // if is in monitoring add to delegateList var
                        delegateList.push(res.delegates[i]);
                    }
                }
                // checking blocks
                request(localNode + '/api/blocks?limit=' + config.network.offsetOfBlocks + '&orderBy=height:desc', function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var data = JSON.parse(body);
                        // checking blocks shifting by 100
                        request(localNode + '/api/blocks?limit=' + config.network.offsetOfBlocks + '&offset=' + config.network.offsetOfBlocks + '&orderBy=height:desc', function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                var data2 = JSON.parse(body);
                                data.blocks = data.blocks.concat(data2.blocks);
                                alive = {};
                                for (var i = 0; i < data.blocks.length; i++) {
                                    alive [data.blocks[i].generatorId] = true;
                                }
                                for (var i = 0; i < delegateList.length; i++) {
                                    if (! (delegateList[i].address in alive)) {
                                        alive [delegateList[i].address] = false;
                                        if (! (delegateList[i].address in alerted))
                                            alerted [delegateList[i].address] = 1;
                                        else
                                            alerted [delegateList[i].address] += 1;

                                        if (alerted [delegateList[i].address] == 1 || alerted [delegateList[i].address] % 180 == 0) {
                                            if (delegateList[i].username in delegateMonitor.failures) {
                                                for (var j = 0; j < delegateMonitor.failures[delegateList[i].username].length; j++)
                                                    bot.sendMessage (delegateMonitor.failures[delegateList[i].username][j], 'Warning! The delegate "' + delegateList[i].username + ' is in red state.');
                                            }
                                        }
                                    } else {
                                        delete alerted [delegateList[i].address];
                                    }
                                }
                            } else {
                                log.critical("Something wrong with get blocks API, second step",error);
                            }
                        });
                    } else {
                        log.critical("Something wrong with get blocks API, first step",error);
                    }
                });
            } else {
                log.critical("Something wrong with get delegates",error);
            }
        });
    }, function (err) {
        log.critical("Error chooseNode",err);
    });
};

var list = function (chatId, type) {
    return new Promise(function (resolve, reject) {
        var watching = [];
        if(type == 'monitoring') {
            if(!(_.isEmpty(delegateMonitor.failures))){
                for(var key in delegateMonitor.failures){
                    if((delegateMonitor.failures[key].indexOf(chatId))!=-1)
                        watching.push(key);
                }
                if(watching.length)
                    resolve(watching.join(", "));
                else
                    reject("You don't have any delegate under monitoring");
            } else {
                reject("You don't have any delegate under monitoring");
            }
        }
        if (type == 'forged') {
            if(!(_.isEmpty(delegateMonitor.forged))){
                for(var key in delegateMonitor.forged){
                    if((delegateMonitor.forged[key].indexOf(chatId))!=-1)
                        watching.push(key);
                }
                if(watching.length)
                    resolve(watching.join(", "));
                else
                    reject("You don't have any delegate under monitoring");
            } else {
                reject("You don't have any delegate under monitoring");
            }
        }
        if (type == 'voted') {
            if(!(_.isEmpty(delegateMonitor.voted))){
                for(var key in delegateMonitor.voted) if((delegateMonitor.voted[key].indexOf(chatId))!=-1) watching.push(key);
                if(watching.length) resolve(watching.join(", "));
                else reject("You don't have any delegate under monitoring");
            } else {
                reject("You don't have any delegate under monitoring");
            }
        }
    })
};


var uptime = function (delegate) {
    return new Promise(function (resolve, reject) {
        isDelegate(delegate).then(function (res) {
            resolve("Your uptime is actually: " + del.productivity + "%");
        }, function (err) {
            reject(err);
        })
    });
};

var pkey = function (delegate) {
    return new Promise(function (resolve, reject) {
        isDelegate(delegate).then(function (res) {
            resolve("Your public key is actually: " + del.publicKey);
        }, function (err) {
            reject(err);
        })
    });
}

var findByPkey = function (pkey) {
    return new Promise(function (resolve, reject) {
        var pageCounter = 0;
        var numberOfDelegates = 0;
        browseDelegate(pageCounter).then(function(res) {
            numberOfDelegates = res.totalCount;
            for(pageCounter; pageCounter < numberOfDelegates; pageCounter += config.network.numberOfDelegate) {
                browseDelegate(pageCounter).then(function(res) {
                    var delegates = res;
                    for (var i = 0; i < delegates.delegates.length; i++) {
                        if (pkey.indexOf (delegates.delegates[i].publicKey) != -1) {
                            if(delegates.delegates[i].username)
                                resolve(delegates.delegates[i].username);
                            else
                                resolve(delegates.delegates[i].address);
                        }
                    }
                }, function (err) {
                    log.critical("Error in findByPkey",err);
                    reject(false);
                });
            }
        }, function (err) {
            log.critical("Error in findByPkey",err);
            reject(false);
        });
    });
};

var address = function (delegate) {
    return new Promise(function (resolve, reject) {
        isDelegate(delegate).then(function (res) {
            resolve("Your address is actually: " + del.address);
        }, function (err) {
            reject(err);
        })
    });
}

var voters = function (delegate) {
    return new Promise(function (resolve, reject) {
        chooseNode().then(function(res) {
            var voters = [];
            var localNode = res;
            isDelegate(delegate).then(function (res) {
                request(localNode + '/api/delegates/voters?publicKey=' + del.publicKey, function (error, response, body) {
                    var data = JSON.parse(body);
                    if (!error && response.statusCode == 200) {
                        for (var i = 0; i < data.accounts.length; i++) {
                            if (data.accounts[i].username == null)
                                voters.push(data.accounts[i].address);
                            else
                                voters.push(data.accounts[i].username);
                        }
                        resolve({
                            "voters": voters.join(", "),
                            "total": data.accounts.length
                        });
                    } else {
                        log.critical("Voters",error);
                    }
                });
            }, function (err) {
                log.critical("isDelegate",error);
            })
        }, function (err) {
            log.critical("Error chooseNode", err)
        });
    });
};

var votes = function (delegate) {
    return new Promise(function (resolve, reject) {
        chooseNode().then(function(res) {
            var localNode = res;
            var votes = [];
            isDelegate(delegate).then(function (res) {
                request(localNode + '/api/accounts/delegates/?address=' + del.address, function (error, response, body) {
                    var data = JSON.parse(body);
                    if (!error && response.statusCode == 200) {
                        for(var i = 0; i < data.delegates.length; i++){
                            votes.push(data.delegates[i].username);
                        }
                        resolve({
                            "votes": votes.join(", "),
                            "total": data.delegates.length
                        })
                    }else {
                        log.critical("Error in votes",error);
                    }
                });
            }, function (err) {
                log.critical("Error in isDelegate",error);
                reject(err);
            })
        }, function (err) {
            log.critical("Error chooseNode", err)
        });
    });
}

var markets  = function (exchange) {
    return new Promise(function (resolve, reject) {
        switch (exchange) {
            case "bittrex":
                if(config.market.bittrex) {
                    request('https://bittrex.com/api/v1.1/public/getmarketsummary?market=btc-' + config.market.token, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var data = JSON.parse(body);
                            resolve({
                                "exchange": exchange.toUpperCase(),
                                "volume": data.result[0].Volume,
                                "high": data.result[0].High,
                                "low": data.result[0].Low,
                                "last": data.result[0].Last
                            });
                        }else {
                            log.critical("Error in markets - Bittrex",error);
                            reject("Something went wrong with Bittrex API");
                        }
                    });
                } else
                    reject("bittrex market not available");
                break;
            case "poloniex":
                if(config.market.poloniex) {
                    request('https://poloniex.com/public?command=returnTicker', function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var data = JSON.parse(body);
                            resolve({
                                "exchange": exchange.toUpperCase(),
                                "volume": data['BTC_' + config.market.token].baseVolume,
                                "high": data['BTC_' + config.market.token].high24hr,
                                "low": data['BTC_' + config.market.token].low24hr,
                                "last": data['BTC_' + config.market.token].last
                            });
                        }else {
                            log.critical("Error in markets - Poloniex",error);
                            reject("Something went wrong with Poloniex API");
                        }
                    });
                } else
                    reject("Poloniex market not available");
                break;
            default:
                reject("You can check different markets data with: \n/markets poloniex\n/markets bittrex");
        }
    });
};

var getVoteInfo = function () {
    // blocks scheduler for alerts
    chooseNode().then(function(res) {
        let localNode = res;
        log.debug('getVoteInfo is using ', localNode + '\n')
        request(localNode + '/api/blocks/?limit=1&offset=0&orderBy=height:desc', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var block = JSON.parse(body).blocks;
                // console.log('BLOCKS' , block[0])
                request(localNode + '/api/transactions?blockId=' + block[0].id , function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var txs = JSON.parse(body).transactions;
                        // console.log('TXS', txs)
                        for ( var tx in txs ) {
                            if (txs[tx].type == 3 ) {
                                request(localNode + '/api/transactions/get?id=' + txs[tx].id , function (error, response, body) {
                                    if (!error && response.statusCode == 200) {

                                        var tx = JSON.parse(body).transaction;
                                        var voter_balance = 0
                                        var votes = tx.votes;

                                        // votes added from account
                                        if (votes.added.length) {
                                            // for each public key delegate get delegate info
                                            for ( var vote in votes.added ) {
                                                // get delegate info
                                                request(localNode + '/api/delegates/get?publicKey=' + votes.added[vote] , function (error, response, body) {
                                                    if (!error && response.statusCode == 200) {
                                                        var delegate = JSON.parse(body).delegate;
                                                        // if delegate in monitor json
                                                        if(delegate.username in delegateMonitor.voted) {
                                                            // get voter balance only once
                                                            if (voter_balance == 0) {
                                                                request(localNode + '/api/accounts/getBalance?address=' + tx.senderId , function (error, response, body) {
                                                                    if (!error && response.statusCode == 200) {
                                                                        voter_balance = JSON.parse(body).balance;
                                                                        // send message
                                                                        for (var index in delegateMonitor.voted[delegate.username]) bot.sendMessage(delegateMonitor.voted[delegate.username][index], 'Voted! Your delegate gained a vote from ' + tx.senderId + ' with ~' + (voter_balance / 100000000).toFixed(2) + ' ' + config.network.token + '.\nCheck on the explorer https://' + config.network.explorer + '/tx/' + tx.id);
                                                                    } else {
                                                                        log.critical("Something wrong with get balance API, get balance in getVoteInfo",error);
                                                                    }
                                                                })
                                                            }
                                                        }

                                                    } else {
                                                        log.critical("Something wrong with get delegate API, get delegate in getVoteInfo",error);
                                                    }
                                                })
                                            }
                                        }


                                        if (votes.deleted.length)
                                            for ( var vote in votes.deleted ) {
                                                // get delegate info
                                                request(localNode + '/api/delegates/get?publicKey=' + votes.deleted[vote] , function (error, response, body) {
                                                    if (!error && response.statusCode == 200) {
                                                        var delegate = JSON.parse(body).delegate;
                                                        // if delegate in monitor json
                                                        if(delegate.username in delegateMonitor.voted) {
                                                            // get voter balance only once
                                                            if (voter_balance == 0) {
                                                                request(localNode + '/api/accounts/getBalance?address=' + tx.senderId , function (error, response, body) {
                                                                    if (!error && response.statusCode == 200) {
                                                                        voter_balance = JSON.parse(body).balance;
                                                                        // send message
                                                                        for (var index in delegateMonitor.voted[delegate.username]) bot.sendMessage(delegateMonitor.voted[delegate.username][index], 'Vote removed! Your delegate lost a vote from ' + tx.senderId + ' with ~' + (voter_balance/100000000).toFixed(2) + ' ' + config.network.token + '.\nCheck on the explorer https://' + config.network.explorer + '/tx/' + tx.id);
                                                                    } else {
                                                                        log.critical("Something wrong with get balance API, get balance in getVoteInfo",error);
                                                                    }
                                                                })
                                                            }
                                                        }

                                                    } else {
                                                        log.critical("Something wrong with get delegate API, get delegate in getVoteInfo",error);
                                                    }
                                                })
                                            }
                                    } else {
                                        log.critical("Something wrong with get tx API, get tx in getVoteInfo",error);
                                    }
                                })
                            }
                        }
                    } else {
                        log.critical("Something wrong with get txs API, get txs in getVoteInfo",error);
                    }
                })
            } else {
                log.critical("Something wrong with get API, get blocks in getVoteInfo",error);
            }
        })
    },function (err) {
        log.critical("Error chooseNode", err)
    });
}

var reward = function(address) {
    return new Promise(function (resolve, reject) {
        let url = `${config.backend.ip}/getforginginfo/${address}`
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                const data = JSON.parse(body);
                resolve(data.result);
            } else {
                const message = 'Check your votes or something is wrong with the pool backend'
                log.critical(message, error);
                reject(message)
            }
        })
    })
}

module.exports = {
    markets: markets,
    votes: votes,
    voters: voters,
    address: address,
    findByPkey: findByPkey,
    pkey: pkey,
    uptime: uptime,
    list: list,
    checkBlocks: checkBlocks,
    nextForger: nextForger,
    getVoteInfo: getVoteInfo,
    monitoring: monitoring,
    forged: forged,
    voted: voted,
    status: status,
    rank: rank,
    balance: balance,
    height: height,
    reward: reward
}
