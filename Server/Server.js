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
	connection.query(query, params, function(err, rows, fields) {
		//Query executed!
		if(err) app.api.error(res, "database", err);
		else {
			callback(rows, fields);
		}
	});
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

/**
 * Get data on a specific bet
 * 	:id - Bet Id
 */
app.get("/bet/:id", function(req, res) {
	app.api.queryDatabase(res, "SELECT * FROM bets WHERE id = ?", [req.params.id], function(rows, fields) {
		if(!rows[0]) app.api.error(res, 404, "Bet not found.");
		else {
			app.api.send(res, {
				bet: rows[0]
			});
		}
	});
});

/**
 * Update a bet's status
 * 	:id - Bet Id
 *
 * 	This is where the pending check is done a notification if a user won.
 * 	All time keeping is done on client side instead of constant polling 
 * 	or sockets. However we still double check to keep them nasties in 
 * 	their place.
 */
app.get("/bet/:id/update", function(req, res) {
	app.api.queryDatabase(res, "SELECT * FROM bets WHERE id = ?", [req.params.id], function(rows, fields) {
		if(!rows[0]) app.api.error(res, 404, "Bet not found.");
		else {

			//Check if the two bets are at the same deadline
			var bet = rows[0],
				now = new Date(),
				deadline = Date.parse(bet.deadline);

			if((deadline - now) <= 0) {
				// They were correct, no messers
				// Update the bet, see if they won
				// TODO: Check if the bet actually won
				app.api.queryDatabase(res, "UPDATE bets SET active = 0, won = 1 WHERE id = ?", [req.params.id], function() {
					app.api.send(res, {
						success: true,
						win: true
					});
				});
			} else {
				res.api.error(res, 418, "Don't be cheeky. Wait your turn.");
			}
		}
	});
});


/**
 * Get latest bets
 * 	:page - The page of bets to recieve
 */
app.get("/bets/latest", function(req, res) {
	var page = parseInt(req.params.page) || 1,
		itemsperpage = 15,
		uplimit = (page - 1) * itemsperpage,
		lowlimit = uplimit + itemsperpage;

	app.api.queryDatabase(res, "SELECT * FROM bets ORDER BY created_at DESC LIMIT ?, ?", [uplimit, lowlimit], function(rows, fields) {
		app.api.send(res, {bets:rows});
	});
});

/**
 * Get latest winning bets
 * 	:page - The page of bets to recieve
 */
app.get("/bets/won", function(req, res) {
	var page = parseInt(req.params.page) || 1,
		itemsperpage = 15,
		uplimit = (page - 1) * itemsperpage,
		lowlimit = uplimit + itemsperpage;

	app.api.queryDatabase(res, "SELECT * FROM bets ORDER BY created_at WHERE won = 1 AND active = 0 DESC LIMIT ?, ?", [uplimit, lowlimit], function(rows, fields) {
		app.api.send(res, {bets:rows});
	});
});

/**
 * Get latest losing bets
 * 	:page - The page of bets to recieve
 */
app.get("/bets/lost", function(req, res) {
	var page = parseInt(req.params.page) || 1,
		itemsperpage = 15,
		uplimit = (page - 1) * itemsperpage,
		lowlimit = uplimit + itemsperpage;

	app.api.queryDatabase(res, "SELECT * FROM bets ORDER BY created_at WHERE won = 0 AND active = 0 DESC LIMIT ?, ?", [uplimit, lowlimit], function(rows, fields) {
		app.api.send(res, {bets:rows});
	});
});

/**
 * Get latest losing bets
 * 	:page - The page of bets to recieve
 */
app.get("/bets/top/won", function(req, res) {
	var page = parseInt(req.params.page) || 1,
		itemsperpage = 15,
		uplimit = (page - 1) * itemsperpage,
		lowlimit = uplimit + itemsperpage;

	app.api.queryDatabase(res, "SELECT * FROM bets ORDER BY karma WHERE won = 1 AND active = 0 DESC LIMIT ?, ?", [uplimit, lowlimit], function(rows, fields) {
		app.api.send(res, {bets:rows});
	});
});

/**
 * Get latest losing bets
 * 	:page - The page of bets to recieve
 */
app.get("/bets/top/lost", function(req, res) {
	var page = parseInt(req.params.page) || 1,
		itemsperpage = 15,
		uplimit = (page - 1) * itemsperpage,
		lowlimit = uplimit + itemsperpage;

	app.api.queryDatabase(res, "SELECT * FROM bets ORDER BY karma WHERE won = 0 AND active = 0 DESC LIMIT ?, ?", [uplimit, lowlimit], function(rows, fields) {
		app.api.send(res, {bets:rows});
	});
});

/**
 * Get bets on specific post
 * 	:id - Post id
 */
app.get("/bets/post/:id", function(req, res) {
	app.api.queryDatabase(res, "SELECT * FROM bets WHERE post_id = ?", [req.params.id], function(rows, fields) {
		app.api.send(res, {
			post_id: req.params.id,
			bets: rows
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