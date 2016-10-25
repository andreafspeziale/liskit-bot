"use strict";
var colors 	= require ('colors');
var morgan	= require ('morgan');

colors.enabled = true;

var clfmonth = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function pad2 (str) {
    str = String(str);
    while (str.length < 2) str = '0' + str;
    return str;
}

var clfDate = function () {
	var dateTime = new Date ();
	var date = dateTime.getUTCDate();
    var hour = dateTime.getUTCHours();
    var mins = dateTime.getUTCMinutes();
    var secs = dateTime.getUTCSeconds();
    var year = dateTime.getUTCFullYear();
    var month = clfmonth[dateTime.getUTCMonth()];

    return pad2(date) + '/' + month + '/' + year
      + ':' + pad2(hour) + ':' + pad2(mins) + ':' + pad2(secs)
      + ' +0000';
  };

morgan.format('route', '[:date[clf]] '.magenta + 'Route'.cyan + '\t' +
  		':method'.yellow + '\t:status'.red + '\t:response-time ms'.yellow +
		'\t:res[content-length]B'.blue + '\t:url'.magenta);

exports.debug = function (mod, message) {
	console.log (('['+clfDate () + '] ').magenta + mod.cyan + '\t'.grey + message.green);
};

exports.critical = function (mod, message) {
	console.log (('['+ clfDate () + '] ').magenta + mod.yellow + '\t'.grey + message.red);
};

