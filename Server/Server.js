var express = require("express"),
	mysql = require("mysql");

// I wouldn't normally contain an entire server and it's rules in one file
// But today, I make that exception

// Initilize the express app
var app = express();

// Initilize and connect mysql
var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "karmo"
}).connect();

/**
 * Couple of app rules to save the server
 *
 * 	* Posts cannot be bet on if they are more that a day old
 */
app.use(function(req, res, next) {
	console.log("Request: " + req.method.toUpperCase() + " " + req.path);

	
	next();
})

/**
 * Create a new bet
 */
app.post("/bet", function(req, res) {
	res.send("lol");
});

/**
 * Is user a 
 */
app.get("/user", function(req, res) {

});

app.listen(8181);