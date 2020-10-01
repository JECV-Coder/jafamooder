var express = require('express');
var router = express.Router();
var request = require('request')               //Conjunto de librerias
const { Client } = require('pg')

var playlist_url;
var temperatura;
var humedad;
var playlist_url;
var client_id = 'ID DEL CLIENTE ELIMINADO POR SEGURIDAD'; // Los ID correspondientes son delicados y pertenecen a cuentas personales de spotify
var client_secret = 'ID SECRETO ELIMINADO POR SEGURIDAD';
var options;
var token;
var authOptions;
var estadoClima;
var rolas=[];
var urlrolas=[];
var listaderepro=[];
var usuario = [];
var duration;
var titulo;
var nublado, lluvioso, soleado, nevado;
const connectionData = {
    user: 'postgres',
    host: 'database-1.com5podrjku4.us-east-1.rds.amazonaws.com',
    database: 'datos',
    password: 'password',
    port: 5432
}      
var clients; 


router.get('/', function(req, res, next) {
      var datos={
             descuento:{lunes:'5%',martes:'10%'},
             clima: {temperatura: temperatura.toFixed(1), humedad: humedad},
             rolas,
             listaderepro,
             titulo,
             usuario,
             soleado, nublado, lluvioso, nevado
          }
       res.render('index', datos);
});

//Request para autorizar el uso de spotify cada TOKEN dura 1 hora
function AutorizacionUsuario() {
    authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        form: {
            grant_type: 'client_credentials'
        },
        json: true
    };
}

//Se obtienen datos climatologicos y se valora el estado del clima
function DatosClimatologicos() {
    clients= new Client(connectionData);
    clients.connect();
    clients.query('SELECT * FROM datos')
        .then(response => {
            temperatura=parseInt(response.rows[0].temperatura);
            humedad=parseInt(response.rows[0].humedad);
            console.log(temperatura+" "+humedad);
            if(temperatura>26 && humedad<=60){
                estadoClima="Soleado";
                soleado = true;
            }
            if(temperatura<30 && humedad>=61){
                estadoClima="Nublado";
                nublado = true;
            }
            if (temperatura<30 && humedad>70) {
                estadoClima="Lluvioso";
                lluvioso = true;
            }
            if (temperatura<15 && humedad<60) {
                estadoClima="Nevado";
                nevado =  true;
            }
            clients.end();
        })
        .catch(err => {
            clients.end();
        });
}

//Se acceden a las playlist usando la autorizacion anterior
function AccesoPlaylist() {
    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            // Solicitud acceso a playlist de usuario
            token = body.access_token;
            options = {
                url: 'https://api.spotify.com/v1/users/vprqlu4kvyu9fa4mnaev9ag2o/playlists',
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                json: true
            };
        }
    });
}

//Con el acceso de las playlist se envian varias request nuevas para acceder a datos individuales de las canciones
function Playlist() {
    request.get(options, function(error, response, body) {
        if (response){
            for (let i = 0; i < body.items.length; i++) {
                if(body.items[i].name==estadoClima){
                    usuario.length = 0;
                    playlist_url = body.items[i].href;
                    listaderepro = body.items[i].id;
                    titulo = body.items[i].name;
                    usuario.push({nombre: body.items[i].owner.display_name, imagen: ''})
                }
                var option = {
                    url: playlist_url,
                    headers: {
                        'Authorization': 'Bearer ' + token
                    },
                    json: true
                };
                request.get(option, function(error, response, body) {
                    if (response) {
                        rolas.length = 0;
                        for (let x = 0; x < body.tracks.items.length; x++) {
                            rolas.push({nombre: body.tracks.items[x].track.name, url: body.tracks.items[x].track.id
                                , artista: body.tracks.items[x].track.artists[0].name,
                                duration: convertTime(body.tracks.items[x].track.duration_ms), image: body.tracks.items[x].track.album.images[0].url

                            });
                            urlrolas.push(body.tracks.items[x].track.external_urls.spotify);
                        }
                    }else{
                        console.log("No encontrado")
                    }
                });
            }
        }
    });
}

function convertTime(millisec) {
    var seconds = (millisec / 1000).toFixed(0);
    var minutes = Math.floor(seconds / 60);
    var hours = "";
    if (minutes > 59) {
        hours = Math.floor(minutes / 60);
        hours = (hours >= 10) ? hours : "0" + hours;
        minutes = minutes - (hours * 60);
        minutes = (minutes >= 10) ? minutes : "0" + minutes;
    }

    seconds = Math.floor(seconds % 60);
    seconds = (seconds >= 10) ? seconds : "0" + seconds;
    if (hours != "") {
        return hours + ":" + minutes + ":" + seconds;
    }
    return minutes + ":" + seconds;
}


DatosClimatologicos();
AutorizacionUsuario();
setTimeout(AccesoPlaylist,2000);
setTimeout(Playlist,4000);
setTimeout(datos,8000);

function datos() {
    DatosClimatologicos();
    AutorizacionUsuario();
    console.log("Actualizando ...");
    setTimeout(AccesoPlaylist,52000);
    setTimeout(Playlist,54000);
    setTimeout(datos,58000);

}


module.exports = router;
