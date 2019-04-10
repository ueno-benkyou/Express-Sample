var share = require('../share'); // <- グローバル変数用に宣言(NodeJSでファイル間の変数共有を実現するため)
var express = require('express');
var router = express.Router();


/* Socket.IO */
var io;

/* Postgres */
var pgp = require('pg-promise')(/*options*/);

// pgp(postgres://ユーザ:パスワード@ホスト:ポート/データベース);
var dvdrental = pgp('postgres://postgres:postgres@192.168.61.134:5432/dvdrental');

/* JasperReports */

var jasper = require('node-jasper')({
	path: 'lib/jasperreports-6.5.0',
	reports: {
		preview_jasper_sample: {
      jasper: 'reports/preview_jasper_sample.jasper',
      jrxml: 'reports/preview_jasper_sample.jrxml',
      conn: 'db'
		}
  },
	drivers: {
		pg: {
      path: 'lib/postgresql-42.1.4.jar',
      class: 'org.postgresql.Driver',
      type: 'postgresql'
		}
	},
	conns: {
		db: {
      host: '192.168.61.134',
      port: 5432,
      dbname: 'dvdrental',
      user: 'postgres',
      pass: 'postgres',
      driver: 'pg'
		}
	},
  defaultConn: 'db'
});

/* GET home page.試作 */
router.get('/', function(req, res, next) {
  /* Socket.IO */
	if(!io) { // <- Socket.IOの重複起動を抑制
    io = share.io; // <- 共有変数からSocket.IOのオブジェクトを取得
     io.on('connection', function(socket) { // <= Socket.IO接続時の処理
      socket.on('disconnect', function() {
      });
      socket.on('pg_query', function(msg) { // <- Socket.IOからソケット通信(pg_query)受信時の処理
        console.log(msg);
        if(msg.name) {
          dvdrental.any(msg.sql)
            .then(function (data) {
              io.to(socket.id).emit(msg.name, JSON.stringify(data));
            })
            .catch(function (error) {
              console.log(error);
              io.to(socket.id).emit('error_' + msg.name, error);
            }
          );
        } else {
          dvdrental.none(msg.sql);
        }
      });
    });
  }
	/* Rendering index  */
	res.render('index');
});

router.get('/grid', function(req, res, next) {
  res.render('grid');
});

router.get('/chart', function(req, res, next) {
  res.render('chart');
});

router.get('/preview_jasper_sample', function(req, res, next) {
  /* Rendering preview_jasper_sample */
  var pdf = jasper.pdf('preview_jasper_sample');
  res.set({
    'Content-type': 'application/pdf',
    'Content-Length': pdf.length
  });
  res.send(pdf);
});

module.exports = router;
