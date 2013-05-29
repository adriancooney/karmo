/**
 * Karmo - Gamble away your reddit karma
 *
 * Rules of the game:
 * 	You bet on posts to reach a certain amount of karma
 */

var Karmo = {
	/**
	 * Runtime variables
	 */
	DEBUG: true,

	log: function() {
		if(Karmo.DEBUG) console.log.apply(console, arguments);
	},

	model: {
		ajax: function() {

		},

		getMetaDataOnPost: function(post_id) {
			return {
				bets: 15,
				odds: [1, 10],
				status: "Hot!"
			}
		},

		getMetaDataOnBet: function(bet_id) {
			return {
				author: "renegademaniac",
				karma_riding: 500,
				odds: [1, 10],
				placed_at: Date.now
			}
		}
	},

	view: {
		update: function() {

		},

		/**
		 * Display's bets on a post to the right (compact view)
		 * @param  {DOM Object} post A post element to display in
		 */	
		displayBetSmall: function(post) {

		},

		/**
		 * Display betting info on a post (Large informative view)
		 * @param  {DOM Object} post A post element to display in
		 */
		displayBetLarge: function(post) {

		},

		/**
		 * Hide the large bet display
		 * @param  {DOM Object} post A post element to remove HUD from
		 */
		hideLargeBetDisplay: function(post) {

		},

		/**
		 * loopOverPosts - Run a function over posts currently displayed
		 * @param  {Function} fn Function to run. Post sent as param
		 */
		loopOverPosts: function(fn) {
			var things = document.querySelectorAll(".linklisting .thing");
			Karmo.log(things);

			if(things) Array.prototype.forEach.call(things, fn);
		}
	},

	/**
	 * Karmo routing system.
	 * Object contains routing information. Key matches window.location.pathname
	 * and value is executed if match
	 * @type {Object}
	 */
	routes: {
		/**
		 * /* - Catch all route
		 */
		".": function() {
			Karmo.log("Root route!");
		},

		/**
		 * Sub reddit matching route
		 * /r/*(/new|controversial|top|rising)
		 */
		"\/r\/([^\/]+)(?:\/(new|controversial|top|rising))?": function(route) {
			Karmo.log("Sub reddit route matched.");
			Karmo.view.loopOverPosts(function(post) {
				Karmo.log(post);
			});
		}
	},

	init: function() {
		Karmo.log("Route: ", window.location.pathname);
		for(var regex in Karmo.routes) {

			var test = (new RegExp(regex)).exec(window.location.pathname);

			//Call the route in the context of Karmo with the match object
			if(test) Karmo.routes[regex].call(Karmo, test);
		}
	}
};

Karmo.init();

