/**
 * Copyright (c) 2014 - Charles `sparticvs` Timko
 *
 * GNU GPLv2 License
 *
 * Author(s):
 *  Charles `sparticvs` Timko - sparticvs@popebp.com
 */

var fs = require('fs');

var express = require('express');
var params = require('express-params');
var Sequelize = require('sequelize');
var sequelize = new Sequelize('alley', null, null, {
        host: 'localhost',
        dialect: 'sqlite',
        storage: 'alley.db'
});

var app = express();
params.extend(app);

/**
 * Models
 */
var User = sequelize.define('user', {
    userId: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        comment: 'User Identifier used for sessions'
    },
    userName: {
        type: Sequelize.STRING(32),
        unique: true,
        comment: 'Username'
    },
    userEmail: {
        type: Sequelize.STRING,
        unique: true,
        validate: {
            isEmail: true
        },
        comment: 'Email Address for user'
    },
    userSalt: {
        type: Sequelize.STRING(8),
        //defaultValue: Random Salt String,
        comment: 'Salt to be used in the hash'
    },
    userKey: {
        type: Sequelize.TEXT,
        comment: 'Result of the PBKDF2'
    },
    userRounds: {
        type: Sequelize.INTEGER,
        comment: 'Rounds to use for PBKDF2'
    },
    userAlgo: {
        type: Sequelize.ENUM('sha1', 'sha256', 'sha384', 'sha512', 'sha3'),
        comment: 'Hashing Algorithm'
    }
});

var Box = sequelize.define('box', {
    boxId: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        comment: 'Box Identifier used for modifying operations'
    },
    boxName: {
        type: Sequelize.STRING(64),
        comment: 'Box Name used in the URL. Unique PER user'
    },
    boxOwner: {
        type: Sequelize.UUID,
        references: User,
        referencesKey: 'userId',
        comment: 'User that owns this box'
    },
    boxDescription: {
        type: Sequelize.TEXT,
        comment: 'Description of the Box'
    },
    boxShortDescription: {
        type: Sequelize.STRING,
        comment: 'Short Description of the Box'
    }
});

var Version = sequelize.define('version', {
    versionId: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        comment: 'Identifier used by modification operations'
    },
    versionString: {
        type: Sequelize.STRING(64),
        validate: {
            is: /^\d\.\d$/
        },
        comment: 'Version String'
    },
    boxId: {
        type: Sequelize.UUID,
        references: Box,
        referencesKey: 'boxId',
        comment: 'Box this version is for'
    },
    versionStatus: {
        type: Sequelize.ENUM('active', 'inactive'), // This is a guess, anyone know?
        comment: 'Status of this version'
    },
    versionDescription: {
        type: Sequelize.TEXT,
        comment: 'Description for this particular version'
    }
});

var Provider = sequelize.define('provider', {
    // Yes, I know this UUID is defined slightly differently. The security of
    // the providers isn't necessary since they will basically be static.
    providerId: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV1,
        comment: 'Identifier for Provider.'
    },
    providerName: {
        type: Sequelize.STRING,
        comment: 'Name of the provider.'
    },
    providerShortName: {
        type: Sequelize.STRING(32),
        validate: {
            isLowercase: true
        },
        comment: 'Short version of the name used in the URL'
    }
});

var VersionProvider = sequelize.define('versionProvider', {
    providerId: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: Provider,
        referencesKey: 'providerId',
        comment: 'Provider Ident'
    },
    versionId: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: Version,
        referencesKey: 'versionId',
        comment: 'Version Ident'
    }
});

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
    template["name"] = req.params.user + '/';
    if(req.params.box !== undefined) {
        template["name"] += req.params.box;
    } else {
        template["name"] += req.params.boxjson[1];
    }
    res.json(template);
}

app.param('box', /^[a-z0-9_-]+$/i);
app.get('/:user/:box', box_data_handler);

app.param('boxjson', /^(\w+)\.json$/);
app.get('/:user/:boxjson', box_data_handler);

app.param('providerbox', /^\w+\.box$/);
app.get('/:user/:box/version/:version/provider/:providerbox', function(req, res) {
    res.json(req.params);

});

app.listen(8080);
