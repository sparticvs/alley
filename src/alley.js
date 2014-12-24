/**
 * Copyright (c) 2014 - Charles `sparticvs` Timko
 *
 * MIT License
 *
 * Author(s):
 *  Charles `sparticvs` Timko - sparticvs@popebp.com
 */

var fs = require('fs');

var express = require('express');
var params = require('express-params');

var app = express();
params.extend(app);

/**
 * Express Framework File transfer Policy
 */
var file_policy = {
    root : __dirname + '/../assets/',
    dotfiles : 'deny',
    headers : {
        'X-Timestamp' : Date.now(),
        'X-Sent' : true
    }
};

/**
 * Each project will need to follow a common format like so:
 *
 * <domain>/<project>/<box>
 * <domain>/<project>/<box>.json
 * <domain>/<project>/<box>/version
 * <domain>/<project>/<box>/version/<num>
 * <domain>/<project>/<box>/version/<num>/provider
 * <domain>/<project>/<box>/version/<num>/provider/<provider>.box
 */

/**
 * Each box follows a specific JSON format.
 */
var template = {
    "description" : "Description behind the box.",
    "short_description" : "Shorter description",
    "name" : "<project>/<box>",
    "versions" : [
        {
            "version" : "1.0.0",
            "status" : "active",
            "description_html" : null,
            "description_markdown" : "",
            "providers" : [
                {
                    "name" : "<providername>",
                    "url" : "<url-to-the-box>"
                }
            ]
        }
    ]
};

app.get('/', function(req, res) {
    res.sendFile('index.html', file_policy, function(err) {
        if(err) {
            console.log(err);
            res.status(err.status).end();
        } else {
            console.log('Sent index');
        }
    });
});

app.use('/assets/', express.static('assets', file_policy));

app.param('user', /^[a-z0-9_-]+$/);
app.get('/:user', function(req, res) {
    res.json({
        'user' : req.params.user,
        'boxes' : [
            "alpha",
            "beta",
            "gamma"
        ]});
});

function box_data_handler(req, res) {
    res.json(template);
}

app.param('box', /^[a-z0-9_-]+$/i);
app.get('/:user/:box', box_data_handler);

app.param('boxjson', /^(\w+)\.json$/);
app.get('/:user/:boxjson', box_data_handler);

app.get('/:user/:box/version/:version/', function(req, res) {
    res.json(req.params);
});

app.get('/:user/:box/version/:version/provider', function(req, res) {
    res.json(req.params);
});

app.param('providerbox', /^\w+\.box$/);

app.get('/:user/:box/version/:version/provider/:providerbox', function(req, res) {
    res.json(req.params);
});

app.listen(8080);
