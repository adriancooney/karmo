var express = require("express"),
	mysql = require("mysql"),
	request = require("request");

// I wouldn't normally contain an entire server and it's rules in one file
// But today, I make that exception because it's only one table

// Initilize the express app
var app = express();

// Initilize and connect mysql
var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "karmo"
});

connection.connect();

/**
 * Api functions
 * Taking a different approach and passing a response object
 */
app.api = {};
app.api.error = function(res, code, msg) {
	//Shorthand database error
	if(code == "database") code = 500;

	var obj = {
		error: {
			code: code,
			msg: msg 
		},

		data: {}
	};

	app.api.encode(res, code, obj);
};

app.api.send = function(res, obj) {
	var obj = {
		error: false,
		data: obj
	};

	app.api.encode(res, 200, obj);
};

app.api.encode = function(res, status, obj) {
	res.send(status, obj);
};

app.api.queryDatabase = function(res, query, params, callback) {
	console.log(query, params);
	connection.query(query, params, function(err, rows, fields) {
		//Query executed!
		if(err) app.api.error(res, "database", err);
		else {
			callback(rows, fields);
		}
	});
};

app.api.getBets = function(res, options, callback) {
	options = options || {};
	var defaults = {
		fields: "*",
		direction: "DESC",
		itemsPerPage: 15
	};

	//Merge objects
	for(var key in defaults) if(!options[key]) options[key] = defaults[key];

	var action = "SELECT",
		fields = (options.fields instanceof Array) ? options.fields.join(", ") : options.fields,
		table = "FROM bets",
		where = (function(obj) {
			if(obj) {
				var where = "WHERE ", vals = [];
				for(var field in obj) where += field + " = ? AND ", vals.push(obj[field]);

				//Shave off the last AND
				where = where.substr(0, where.length - 5);

				return { string: where, values: vals };
			} else return { string: "", values: [] };
		})(options.where),
		orderBy = (options.orderBy) ? "ORDER BY " + options.orderBy : "",
		direction = (orderBy) ? options.direction : "";

	//If a page is supplied
	if(options.page) {
		var upper = (options.page - 1) * options.itemsPerPage,
			lower = upper + options.itemsPerPage,
			limit = "LIMIT " + upper + ", " + lower;
	} else if(options.limits) {
		var limit = "LIMIT " + options.limits[0] + ", " + options.limits[1];
	} else {
		var limit = "";
	}

	var query = [action, fields, table, where.string, orderBy, direction, limit].filter(function(val) { if(val.length > 0) return true; else return false; }),
		queryString = query.join(" ");

	//Robust query builder done
	//now to query
	app.api.queryDatabase(res, queryString, where.values, callback);
};

app.api.queryReddit = function(path, callback) {
	request("http://reddit.com" + path, function(error, res, body) {
		if(!error && res.statusCode == 200) callback(JSON.stringify(body));
	});
};

app.api.calculateOdds = function(post, type, prediction, deadline) {
	var created = post.created,
		comments = post.num_comments,
		karma = post.score;

	if(type == "karma") {
		
	} else if(type == "comment-count") {
		
	}
};

app.api.calculateOddsOnPost = function(post_id, deadline, predictioncallback) {
	app.api.queryReddit("api/info.json?id=" + post_id, function(data) {
		app.api.calculateOdds(data.score, data.created, data.num_comments)
	});
};

/**
 * Couple of app rules to save the server
 *
 * 	* Posts cannot be bet on if they are more that a day old
 */
app.use(function(req, res, next) {
	console.log("Request: " + req.method.toUpperCase() + " " + req.path);
	next();
});

/**
 * Body parser
 */
app.use(express.bodyParser());

/**
 * Create a new bet
 *
 * POST params:
 * 	username
 * 	post_id
 * 	karma (int)
 * 	type (enum[karma, comment-count])
 * 	prediction (int)
 * 	deadline (int)
 */
app.post("/bet", function(req, res) {

	//Convert the parameters to integers
	req.body.karma = parseInt(req.body.karma);
	req.body.prediction = parseInt(req.body.prediction);
	req.body.deadline = parseInt(req.body.deadline);

	//Vigorous error checking
	if(!req.body.username) app.api.error(res, 400, "Bad request: Missing parameter 'username'. Denotes the reddit username creating the bet.");
	if(!req.body.post_id) app.api.error(res, 400, "Bad request: Missing parameter 'post_id'. Denotes the reddit post the user is placing the bet on.");
	if(!req.body.karma || isNaN(req.body.karma)) app.api.error(res, 400, "Bad request: Missing or bad parameter 'karma'. Denotes the amount of karma placed on bet. Int, cannot be 0.");
	if(!req.body.type || ["karma", "comment-count"].indexOf(req.body.type) == -1) app.api.error(res, 400, "Bad request: Missing or bad parameter 'type'. Denotes the bet type. Possible values: 'karma', 'comment-count'.");
	if(req.body.prediction == undefined || isNaN(req.body.prediction)) app.api.error(res, 400, "Bad request: Missing or bad parameter 'prediction'. Denotes the predicted value for the bet. Int.");
	if(!req.body.deadline || isNaN(req.body.deadline)) app.api.error(res, 400, "Bad request: Missing or bad parameter 'deadline'. Denotes the deadline for the prediction to be completed in seconds. Int, cannot be 0.");
	if(!req.body.odds) app.api.error(res, 400, "Bad request: Missing parameter 'odds'. Denotes the odds of the bet.");

	//TODO: Sanitize odds

	app.api.queryDatabase(res, "INSERT INTO bets(username, post_id, karma, type, prediction, deadline, odds) VALUES(?, ?, ?, ?, ?, NOW() + INTERVAL ? SECOND, ?)", 
		[req.body.username, req.body.post_id, req.body.karma, req.body.type, req.body.prediction, req.body.deadline, req.body.odds], function(rows, fields) {

		app.api.send(res, {
			success: true
		});

	});
});

// /**
//  * Get data on a specific bet
//  * 	:id - Bet Id
//  */
// app.get("/bet/:id", function(req, res) {
// 	app.api.queryDatabase(res, "SELECT * FROM bets WHERE id = ?", [req.params.id], function(rows, fields) {
// 		if(!rows[0]) app.api.error(res, 404, "Bet not found.");
// 		else {
// 			app.api.send(res, {
// 				bet: rows[0]
// 			});
// 		}
// 	});
// });

// /**
//  * Update a bet's status
//  * 	:id - Bet Id
//  *
//  * 	This is where the pending check is done a notification if a user won.
//  * 	All time keeping is done on client side instead of constant polling 
//  * 	or sockets. However we still double check to keep them nasties in 
//  * 	their place.
//  *
//  * 	We will run a cron job every five minutes to update the bets just in case they're offline.
//  */
// app.get("/bet/:id/update", function(req, res) {
// 	app.api.queryDatabase(res, "SELECT * FROM bets WHERE id = ?", [req.params.id], function(rows, fields) {
// 		if(!rows[0]) app.api.error(res, 404, "Bet not found.");
// 		else {

// 			//Check if the two bets are at the same deadline
// 			var bet = rows[0],
// 				now = new Date(),
// 				deadline = Date.parse(bet.deadline);

// 			if((deadline - now) <= 0) {
// 				// They were correct, no messers
// 				// Update the bet, see if they won
// 				// TODO: Check if the bet actually won
// 				app.api.queryDatabase(res, "UPDATE bets SET active = 0, won = 1 WHERE id = ?", [req.params.id], function() {
// 					app.api.send(res, {
// 						success: true,
// 						win: true
// 					});
// 				});
// 			} else {
// 				res.api.error(res, 418, "Don't be cheeky. Wait your turn.");
// 			}
// 		}
// 	});
// });


// /**
//  * Get latest bets
//  * 	:page - The page of bets to recieve
//  */
// app.get("/bets/latest", function(req, res) {
// 	var page = parseInt(req.params.page) || 1,
// 		itemsperpage = 15,
// 		uplimit = (page - 1) * itemsperpage,
// 		lowlimit = uplimit + itemsperpage;

// 	app.api.queryDatabase(res, "SELECT * FROM bets ORDER BY created_at DESC LIMIT ?, ?", [uplimit, lowlimit], function(rows, fields) {
// 		app.api.send(res, {bets:rows});
// 	});
// });

// /**
//  * Get latest winning bets
//  * 	:page - The page of bets to recieve
//  */
// app.get("/bets/won", function(req, res) {
// 	var page = parseInt(req.params.page) || 1,
// 		itemsperpage = 15,
// 		uplimit = (page - 1) * itemsperpage,
// 		lowlimit = uplimit + itemsperpage;

// 	app.api.queryDatabase(res, "SELECT * FROM bets WHERE won = 1 AND active = 0 ORDER BY created_at DESC LIMIT ?, ?", [uplimit, lowlimit], function(rows, fields) {
// 		app.api.send(res, {bets:rows});
// 	});
// });

// /**
//  * Get latest losing bets
//  * 	:page - The page of bets to recieve
//  */
// app.get("/bets/lost", function(req, res) {
// 	var page = parseInt(req.params.page) || 1,
// 		itemsperpage = 15,
// 		uplimit = (page - 1) * itemsperpage,
// 		lowlimit = uplimit + itemsperpage;

// 	app.api.queryDatabase(res, "SELECT * FROM bets WHERE won = 0 AND active = 0 ORDER BY created_at DESC LIMIT ?, ?", [uplimit, lowlimit], function(rows, fields) {
// 		app.api.send(res, {bets:rows});
// 	});
// });

// /**
//  * Get latest losing bets
//  * 	:page - The page of bets to recieve
//  */
// app.get("/bets/top/won", function(req, res) {
// 	var page = parseInt(req.params.page) || 1,
// 		itemsperpage = 15,
// 		uplimit = (page - 1) * itemsperpage,
// 		lowlimit = uplimit + itemsperpage;

// 	app.api.queryDatabase(res, "SELECT * FROM bets WHERE won = 1 AND active = 0 ORDER BY karma DESC LIMIT ?, ?", [uplimit, lowlimit], function(rows, fields) {
// 		app.api.send(res, {bets:rows});
// 	});
// });

// /**
//  * Get latest losing bets
//  * 	:page - The page of bets to recieve
//  */
// app.get("/bets/top/lost", function(req, res) {
// 	var page = parseInt(req.params.page) || 1,
// 		itemsperpage = 15,
// 		uplimit = (page - 1) * itemsperpage,
// 		lowlimit = uplimit + itemsperpage;

// 	app.api.queryDatabase(res, "SELECT * FROM bets WHERE won = 0 AND active = 0 ORDER BY karma DESC LIMIT ?, ?", [uplimit, lowlimit], function(rows, fields) {
// 		app.api.send(res, {bets:rows});
// 	});
// });

// /**
//  * Get bets on specific post
//  * 	:id - Post id
//  */
// app.get("/bets/post/:id", function(req, res) {
// 	app.api.queryDatabase(res, "SELECT * FROM bets WHERE post_id = ?", [req.params.id], function(rows, fields) {
// 		app.api.send(res, {
// 			post_id: req.params.id,
// 			bets: rows
// 		});
// 	});
// });

//Expose a general api
app.get("/bets", function(req, res) {
	app.api.getBets(res, req.query, function(bets) {
		app.api.send(res, {
			bets: bets
		});
	});
});

//Phew, that's a big ass regex
app.get(/\/bets\/?(?:(?:(?:(user|post)\/([^\/]+))|(\d+))\/?)?(?:(latest(?:\/(win|loss))?)|(top(?:\/(win|loss)))|(pending))?/, function(req, res, next) {
	var options = {
		where: {}
	};

	var route = req.params,
		filter = "latest",
		scope = route[0];

	//Betting filter
	if(route[3]) filter = "latest";
	if(route[3] && route[4] == "win") filter = "latest/win";
	if(route[3] && route[4] == "loss") filter = "latest/loss";
	if(route[7]) filter = "pending";
	if(route[5] && route[6] == "win") filter = "top/win";
	if(route[5] && route[6] == "loss") filter = "top/loss";

	console.log(req.params)

	switch(scope) {
		case "user":
			options.where.username = route[1];
		break;

		case "post":
			options.where.post_id = route[1];
		break;

		default:
			next();
	}

	switch(filter) {
		case "latest":
			options.orderBy = "created_at";
			options.direction = "DESC";
		break;

		case "latest/win":
			options.orderBy = "created_at";
			options.direction = "DESC";
			options.where.active = 0;
			options.where.won = 1;
		break;

		case "latest/loss":
			options.where.active = 0;
			options.where.won = 0;
		break;

		case "pending":
			options.active = 1;
			options.orderBy = "created_at";
			options.direction = "DESC";
		break;

		case "top/win":
			options.orderBy = "karma";
			options.direction = "DESC";
			options.where.active = 0;
			options.where.won = 1;
		break;

		case "top/loss":
			options.orderBy = "karma";
			options.direction = "ASC";
			options.where.active = 0;
			options.where.won = 0;
		break;

		default:
			next(); //404
	}

	app.api.getBets(res, options, function(bets) {
		app.api.send(res, {
			bets: bets
		});
	});
});

/**
 * Returns all of :username their bets
 * Parameters:
 * 	:username - Reddit username
 */
app.get("/bets/user/:username", function(req, res) {
	app.api.queryDatabase(res, "SELECT * FROM bets WHERE username = ?", [req.params.username], function(rows, fields) {
		app.api.send(res, {
			username: req.params.username,
			bets: rows
		});
	});
});

/**
 * Returns all of :username won bets
 * Parameters:
 * 	:username - Reddit username
 */
app.get("/bets/user/:username/won", function(req, res) {
	app.api.queryDatabase(res, "SELECT * FROM bets WHERE username = ? AND won = 1 AND active = 0", [req.params.username], function(rows, fields) {
		app.api.send(res, {
			username: req.params.username,
			bets: rows
		});
	});
});

/**
 * Returns all of :username lost bets
 * Parameters:
 * 	:username - Reddit username
 */
app.get("/bets/user/:username/lost", function(req, res) {
	app.api.queryDatabase(res, "SELECT * FROM bets WHERE username = ? AND won = 0 AND active = 0", [req.params.username], function(rows, fields) {
		app.api.send(res, {
			username: req.params.username,
			bets: rows
		});
	});
});

/**
 * Returns all of :username pending bets
 * Parameters:
 * 	:username - Reddit username
 */
app.get("/bets/user/:username/pending", function(req, res) {
	app.api.queryDatabase(res, "SELECT * FROM bets WHERE username = ? AND active = 1", [req.params.username], function(rows, fields) {
		app.api.send(res, {
			username: req.params.username,
			bets: rows
		});
	});
});

/**
 * Finally, error 404
 */
app.use(function(req, res, next) {
	app.api.error(res, 404, "Not found");
})

app.listen(8181);