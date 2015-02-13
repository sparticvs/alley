/**
 * Copyright (c) 2014-2015 - Charles `sparticvs` Timko
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the 
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
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
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        comment: 'User Identifier used for sessions'
    },
    userName: {
        type: Sequelize.STRING(32),
        allowNull: false,
        unique: true,
        comment: 'Username'
    },
    userEmail: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        },
        comment: 'Email Address for user'
    },
    userSalt: {
        type: Sequelize.STRING(8),
        allowNull: false,
        //defaultValue: Random Salt String,
        comment: 'Salt to be used in the hash'
    },
    userKey: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Result of the PBKDF2'
    },
    userRounds: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Rounds to use for PBKDF2'
    },
    userAlgo: {
        type: Sequelize.ENUM('sha1', 'sha256', 'sha384', 'sha512', 'sha3'),
        allowNull: false,
        defaultValue: 'sha512',
        comment: 'Hashing Algorithm'
    }
});

var Box = sequelize.define('box', {
    boxId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        comment: 'Box Identifier used for modifying operations'
    },
    boxName: {
        type: Sequelize.STRING(64),
        allowNull: false,
        comment: 'Box Name used in the URL. Unique PER user'
    },
/*    boxOwner: {
        type: Sequelize.UUID,
        allowNull: false,
        references: User,
        referencesKey: 'userId',
        comment: 'User that owns this box'
    },*/
    boxDescription: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Description of the Box'
    },
    boxShortDescription: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Short Description of the Box'
    }
});

User.hasMany(Box, {foreignKey: 'boxOwner'});
Box.belongsTo(User, {foreignKey: 'boxOwner'});

var Version = sequelize.define('version', {
    versionId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        comment: 'Identifier used by modification operations'
    },
    versionString: {
        type: Sequelize.STRING(64),
        allowNull: false,
        validate: {
            is: /^\d\.\d$/
        },
        comment: 'Version String'
    },
        /**
    boxId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: Box,
        referencesKey: 'boxId',
        comment: 'Box this version is for'
    },
    **/
    versionStatus: {
        type: Sequelize.ENUM('active', 'inactive'), // This is a guess, anyone know?
        allowNull: false,
        comment: 'Status of this version'
    },
    versionDescription: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Description for this particular version'
    }
});

Box.hasMany(Version);
Version.belongsTo(Box);

var Provider = sequelize.define('provider', {
    // Yes, I know this UUID is defined slightly differently. The security of
    // the providers isn't necessary since they will basically be static.
    providerId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV1,
        comment: 'Identifier for Provider.'
    },
    providerName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Name of the provider.'
    },
    providerShortName: {
        type: Sequelize.STRING(32),
        allowNull: false,
        validate: {
            isLowercase: true
        },
        comment: 'Short version of the name used in the URL'
    }
});

var VersionProvider = sequelize.define('versionProvider');
    /*
    providerId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: Provider,
        referencesKey: 'providerId',
        comment: 'Provider Ident'
    },
    versionId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: Version,
        referencesKey: 'versionId',
        comment: 'Version Ident'
    }
});*/
Version.belongsToMany(Provider, {through: VersionProvider});
Provider.belongsToMany(Version, {through: VersionProvider});

User.sync().then(function() {
    return Box.sync().then(function() {
        return Version.sync().then(function() {
            return Provider.sync().then(function() {
                return VersionProvider.sync();
            });
        });
    });
}).then(TEST_DATA);

/**** DEBUG DEBUG DEBUG
 * TEST DATA
 */
function TEST_DATA() {
    Provider.bulkCreate([
        {providerName: 'Oracle VirtualBox', providerShortName: 'virtualbox'},
        {providerName: 'VMWare Workstation', providerShortName: 'vmware'},
        {providerName: 'Parallels Desktop', providerShortName: 'parallels'},
        {providerName: 'Qemu/KVM Raw Image', providerShortName: 'qemu'}
    ]);

    return User.create({
        userName: 'sparticvs',
        userEmail: 'sparticvs@popebp.com',
        userSalt: '', // For now
        userKey: '',
        userRounds: 0
    }).then(function() {
        return User.findOne({where: {userName: 'sparticvs'}}).then(function(user) { 
            return Box.create({
                boxName: 'ubuntu-14.04.1',
                boxOwner: user.userId,
                boxDescription: 'Obvious',
                boxShortDescription: 'Obvious'
            }).then(function() {
                return Box.findOne({where: {boxName: 'ubuntu-14.04.1'}}).then(function(box) {
                    return box.createVersion({
                        versionString: '1.0',
                        boxId: box.boxId,
                        versionStatus: 'active',
                        versionDescription: 'Test'
                    }).then(function() {
                        return Version.findOne({where: {versionString: '1.0'}}).then(function(version) {
                            return Provider.findOne({where: {providerShortName: 'vmware'}}).then(function(provider) {
                                return version.addProvider(provider);
                            });
                        });
                    });
                });
            });
        });
    });
}

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

app.get('/', function(req, res) {
    return User.findAll().then(function(users) {
        res.json(users.map(function(user) {
            return user.userName;
        }));
    });
});

app.use('/assets/', express.static('assets', file_policy));

app.param('user', /^[a-z0-9_-]+$/);
app.get('/:user', function(req, res) {
    return User.findOne({where: {userName: req.params.user}, include: [{model: Box, as: 'boxes'}]}).then(function(user) {
        res.json({
            'user' : user.userName,
            'boxes' : user.boxes.map(function(box) {
                return box.boxName;
            })
        });
    });
});

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

function box_data_handler(req, res) {
    // If the URL Ends with .json we need to drop it. We let the Regex do that
    // below.
    var boxName = req.params.box;
    if(boxName === undefined) {
        boxName = req.params.boxjson[1];
    }
    User.findOne({where: {userName: req.params.user},
               include: [{model: Box, where: {boxName: boxName}}]}).then(function(user) {
        user.boxes[0].getVersions().then(function(versions) {
            template["description"] = user.boxes[0].boxDescription;
            template["short_description"] = user.boxes[0].boxShortDescription;
            template["name"] = user.userName + '/' + user.boxes[0].boxName;
            template["versions"] = versions.map(function(version) {
                return { version: version.versionString, status: version.versionStatus };
            });
            res.json(template);
        });
    });
}

app.param('box', /^[a-z0-9\._-]+[^\.json]$/i);
app.get('/:user/:box', box_data_handler);

app.param('boxjson', /^([a-z0-9\._-]+)\.json$/);
app.get('/:user/:boxjson', box_data_handler);

app.param('providerbox', /^([a-z0-9\._-]+)\.box$/);
app.get('/:user/:box/version/:version/provider/:providerbox', function(req, res) {
    User.findOne({where: {userName: req.params.user}, include: [{model: Box, where: {boxName: req.params.box}}]}).then(function(user) {
        return user.boxes[0].getVersions({where: {versionString: req.params.version}}).then(function(version) {
            return version[0].getProviders({where: {providerShortName: req.params.providerbox[1]}}).then(function(providers) {
                if(providers.length > 0) {
                    res.sendFile(req.path, file_policy, function(err) {
                        if(err) {
                            res.status(err.status).end();
                        }
                    });
                }
            });
        });
    });
});

app.listen(8080);
