var Sequelize = require('sequelize');
var sequelize = new Sequelize('waittimes', 'waittimes', 'waittimes');
var express = require('express');
var app = express();

var request = require('request');
var crypto = require('crypto');
var moment = require('moment');
var momentTimezone = require('moment-timezone');
var fs = require('fs');

var Waittime = sequelize.define('waittime', {
    park_plan_code: Sequelize.INTEGER,
    minutes: Sequelize.INTEGER,
});

var mockWaiTimes = require('./data/waittimes.json');

var mode = "test";

var time = moment.tz('Europe/Berlin');
var dateString = time.format('YYYYMMDDHHmm');
var code = crypto.createHash('md5').update('Europa-Park' + dateString + 'SecondTry').digest('hex');

var parameters = {
    code: code,
    v: 4,
    base: time.format('X')
};

console.log(parameters);

if (mode === "test") {
    loaded(mockWaiTimes);
} else {
    request({
        url: 'https://apps.europapark.de/webservices/waittimes/index.php',
        qs: parameters
    }, function (err, response, body) {
        if (err) {
            console.log(err);
            return;
        }

        loaded(response.body);
    });
}

function loaded(result) {
    var json = (typeof result !== 'object') ? JSON.parse(result) : result;
    var jsonString = JSON.stringify(json, null, 4);

    fs.writeFile("./data/fetched/wait-times_" + moment().format('YYYY-MM-DD-HH-mm-ss') + '.json', jsonString);

    for (var i in json.results) {
        var result = json.results[i];
        saveResult(result);
    }
}

function saveResult(result){
    sequelize.sync().then(function () {
        return Waittime.create({
            park_plan_code: result.code,
            minutes: result.time
        });
    });
}

app.get('/results', function (req, res) {
    Waittime.all().then(function(times){
        res.send(JSON.stringify(times));
    });
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
