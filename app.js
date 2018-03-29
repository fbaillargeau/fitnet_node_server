const express = require('express')
const app = express()
var request = require("request")
var server = require('http').createServer(app);
var redis = require('redis');
var _ = require('lodash');
var log4js = require('log4js');
var https = require('https');

//Création du logger
var logger = log4js.getLogger();
logger.level = 'debug';

//Création du client redis
var redis_host = process.env.REDIS_HOST !== undefined ? process.env.REDIS_HOST : '192.168.99.100';
var redis_port = process.env.REDIS_PORT !== undefined ? process.env.REDIS_PORT : 6379;
var redisClient = redis.createClient(redis_port, redis_host);

//Headers pour les requêtes http
var headersOneSignal = {
    "Content-Type": "application/json",
    "Authorization": "Basic OWQ5ZjY1YWQtYWM3NC00YWViLWE2ZmItNGQ2MzQxY2RhMmVi"
};

var headersFitnet = {
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": "Basic ZmJhaWxsYXJnZWF1QHBhbG8taXQuY29tOnZoVDczOSFIRmU="
}

//Options pour les requêtes http
var optionOneSignal = {
    host: "onesignal.com",
    port: 443,
    path: "/api/v1/notifications",
    method: "POST",
    headers: headersOneSignal
};

var optionFitnet = {
    host: "evaluation.fitnetmanager.com",
    port: 443,
    path: "/FitnetManager/rest/contracts/1",
    method: "GET",
    headers: headersFitnet
}

//Permet d'envoyer des notifications
var sendNotification = function(data, nbMissions) {

    var https = require('https');
    var req = https.request(optionOneSignal, function(res) {
        res.on('data', function(data) {
            logger.info("Notification envoyée");
            redisClient.set('nbMissions', nbMissions);
        });
    });

    req.on('error', function(e) {
        logger.error(e)
    });

    req.write(JSON.stringify(data));
    req.end();
};

//Permet de récupérer les missions
var getMissions = function() {
    var req = https.request(optionFitnet, function(res) {
        var content = '';
        res.on('data', function(data) {
            content += data;
        }).on('end', function() {
            //Vérification du bon format du json
            if (isJson(content)) {
                //Récupération des missions + tri des missions par lotId (ordre de création décroissante)
                var missions = _.orderBy(JSON.parse(content), ['lotId'], ['desc']);
                var nbMissions = missions.length;

                //Vérification de l'existance de la clé nbMissions
                redisClient.exists('nbMissions', function(err, reply) {
                    if (reply === 1) {
                        //La clé existe
                        redisClient.get('nbMissions', function(err, reply) {
                            if (reply !== nbMissions) {
                                var diff = nbMissions - reply;
                                for (var i = 0; i < diff; i++) {
                                    var mission = missions[i];
                                    var contentMessage = `Nouvelle mission : ${mission.title} du ${mission.beginDate} au ${mission.endDate} ${mission.description ? '\nDescription:\n' + mission.description : ''}`;
                                    var message = createMessage(contentMessage);
                                    sendNotification(message, nbMissions);
                                };
                            }
                        });
                    } else {
                        //La clé n'existe pas. Initialisation du compteur de missions
                        redisClient.set('nbMissions', missions.length)
                    }
                });
            }
        });
    });

    req.on('error', function(e) {
        logger.error(e);
    });

    req.end();
};

//Permet de vérifier si le json est parsable
isJson = function(json) {
    try {
        json = JSON.parse(json);
        return true;
    } catch (exception) {
        logger.error("Erreur json")
        logger.error(exception)
        return false
    }
}

//Permet de créer un message pour les notifications
var createMessage = function(message) {
    return {
        app_id: "347ad83a-ffad-4502-b61c-dd47b7963dee",
        contents: { "en": message },
        included_segments: ["All"]
    }
}

//Lancement du serveur node sur le port 3123
server.listen(3123, function() {
    var interval = process.env.INTERVAL !== undefined ? process.env.INTERVAL : 20000;
    logger.info('Lancement de l\'application sur le port 3123')

    //Vérification si le nombre de mission est inférieur à celui de la base de données
    var req = https.request(optionFitnet, function(res) {
        var content = '';
        res.on('data', function(data) {
            content += data;
        }).on('end', function() {
            //Vérification du bon format du json
            if (isJson(content)) {
                var nbMissions = JSON.parse(content).length;

                //Vérification de l'existance de la clé nbMissions
                redisClient.exists('nbMissions', function(err, reply) {
                    if (reply === 1) {
                        redisClient.get('nbMissions', function(err, reply) {
                            if (reply > nbMissions) {
                                redisClient.set('nbMissions', nbMissions)
                            }
                        })
                    } else {
                        //La clé n'existe pas. Initialisation du compteur de missions
                        redisClient.set('nbMissions', nbMissions)
                    }
                });
            }
        });
    });

    req.on('error', function(e) {
        logger.error(e);
    });

    req.end();


    //Interval
    setInterval(function() {
        getMissions();
    }, interval)
});