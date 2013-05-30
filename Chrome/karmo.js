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

	/**
	 * Helper functions
	 */
	log: function() {
		if(Karmo.DEBUG) console.log.apply(console, arguments);
	},

	error: function() {
		if(Karmo.DEBUG) throw Error.apply(Error, arguments);
	},

	template: {
		url: "templates/",
		extension: ".template",
		templateNames: ["small-bet-view", "large-bet-view", "main-bet-view", "notification", "dashboard"],
		templates: {},

		/**
		 * Get the templates from the extension directory
		 * @param  {Function} fn Callback
		 */
		getTemplates: function(fn) {
			//Waterfall here
			(function getTemplate(tempArr) {
				Karmo.model.ajax({
					url: chrome.runtime.getURL(Karmo.template.url + tempArr[0] + Karmo.template.extension),
					responseType: "text",
				}, function(template) {
					Karmo.template.templates[tempArr[0]] = template;

					//Move onto the next one
					tempArr.shift();
					if(tempArr[0]) getTemplate(tempArr);
					else fn();
				});

			})(Karmo.template.templateNames);
		},

		/**
		 * Render a template within an element
		 * @param  {DOM Element} where    Where to render the element
		 * @param  {String} position Append|Prepend
		 * @param  {String} tempate  Template name
		 */
		render: function(where, position, template, data) {

			var data = Mustache.render(Karmo.template.templates[template], data);

			switch(position) {
				case "prepend":
					where.innerHTML = data + where.innerHTML;
				break;

				case "replace":
					where.innerHTML = data;
				break;

				case "append": 
				default:
					where.innerHTML = where.innerHTML + data;
				break;
			}
		}
	},

	/**
	 * A probably unnecessary part of it but what the heck
	 */
	sound:  {
		sounds: ["chaching"],

		init: function() {
			Karmo.sound.sounds.forEach(function(sound) {
				var a = document.createElement("audio");
				document.body.appendChild(a);
				a.id = "karmo-sound-" + sound;
				a.volume = 0; //Weird bug where you have to play the audio first to
				a.autoplay = true; //To be able to play it later
				a.src = chrome.runtime.getURL("assets/audio/" + sound + ".mp3");
			});
		},

		play: function(sound) {
			var a = document.getElementById("karmo-sound-" + sound);
			a.volume = 1;
			a.play();
		}
	},

	/**
	 * Karmo local storage system
	 */
	storage: {
		prefix: "karmo.",

		"get": function(name) {
			var val = window.localStorage.getItem(Karmo.storage.prefix + name),
				match = /^(\w+);/.exec(val);

			if(match) {
				val = val.replace(match[1] + ";", "");

				switch(match[1]) {
					case "json":
						return JSON.parse(val);
					break;
				}
			} else return val;
		},

		"save": function(name, val) {
			if(typeof val == "object") val = "json;" + JSON.stringify(val);

			return window.localStorage.setItem(Karmo.storage.prefix + name, val);
		}
	},

	model: {
		/**
		 * Karmo AJAX - Why is there no tiny ajax library out there?
		 * @return {[type]} [description]
		 */
		ajax: function(options, callback, error) {
			//Throw a couple of errors if the correct data isn't recieved
			if(!options.url) Karmo.error("Karmo.model.ajax: Please provide a url in the options object.");
			if(!callback) Karmo.error("Karmo.model.ajax: Please provide a callback as a second parameter.");

			var defaults = {
				method: "get",
				responseType: "json"
			};

			//Merge the defaults and options
			for(var key in defaults) if(!options[key]) options[key] = defaults[key];

			var xhr = new XMLHttpRequest();
			xhr.open(options.method.toUpperCase(), options.url, true);

			xhr.onreadystatechange = function() {
				if (this.readyState == 4) {
					if(this.status == 200) {
						data = this.response;

						switch(options.responseType) {
							case "json":
								data = JSON.parse(data);
							break;
						}

						callback(data, this);
					} else if(error) error(this);
				}
			};

			xhr.send();
		},

		betting: {
			getBettingDataOnPost: function(post_id) {
				return {
					bets: 15,
					odds: { top: 1, bottom: 10 },
					status: { "class": "hot", text: "Hot!" }
				}
			},

			getMetaDataOnBet: function(bet_id) {
				return {
					author: "renegademaniac",
					karma_riding: 500,
					odds: { top: 1, bottom: 10 },
					placed_at: Date.now
				}
			},

			/**
			 * To save some serious bandwidth on the server, we'll calculate
			 * the odds in the browser and verfiy it on the server. Use the
			 * *exact* same algorithm.
			 * @param  {int} karma    [description]
			 * @param  {Date} created      The date created
			 * @param  {int} comments The amount of comments on the post
			 * @returns {array} Odds in the form of [(int) top, (bottom) bottom]
			 */
			calculateOddsOnPost: function(karma, created, comments) {

			}
		},

		user: {
			getUser: function(callback) {
				callback({
					username: "renegademaniac",
					karma: 1800, 
					karmo: 12000,
					bets: 200
				});
			},

			/**
			 * Test if username is a karmo player against server
			 * @param  {string}   username The username
			 * @param  {Function} callback Callback with boolean
			 */
			isUserAPlayer: function(username, callback) {
				callback(true);
			}
		},

		/**
		 * Information the can be got about the current page from
		 * the html
		 */
		current: {
			subreddit: (function() {
				return document.querySelectorAll(".pagename")[0].innerText;
			})()
		}
	},

	view: {
		betting: {
			/**
			 * Display's bets on a post to the right (compact view)
			 * @param  {DOM Object} post A post element to display in
			 */	
			displayBetSmall: function(post, data) {

				Karmo.template.render(post, "prepend", "small-bet-view", data);

				//Bind to the bet button
				post.querySelectorAll(".bet")[0].addEventListener("click", function() {

					Karmo.view.betting.displayBetLarge(post, data);
				});
			},

			/**
			 * Display betting info on a post (Large informative view)
			 * @param  {DOM Object} post A post element to display in
			 */
			displayBetLarge: function(post, data) {
				var view = post.querySelectorAll(".karmo-large-bet-view");

				Karmo.template.render(post, "append", "large-bet-view", data);
			},

			/**
			 * Hide the large bet display
			 * @param  {DOM Object} post A post element to remove HUD from
			 */
			hideLargeBetDisplay: function(post) {

			}
		},

		user: {
			/**
			 * Display karmo on every page
			 * @param  {Object} user The user object
			 */
			displayKarmoSmall: function(user) {
				var node = document.querySelectorAll(".userkarma")[0];
				node.innerHTML = user.karma + "/" + user.karmo + ""; 
				node.setAttribute("alt", "Your karma and karmo");
			},

			/**
			 * Display the karmo on the main element
			 * @return {[type]} [description]
			 */
			displayKarmoLarge: function(user) {
				var node = document.querySelectorAll(".titlebox")[0],
					span = "<span class=\"karma karmo\">" + user.karmo + "</span> karmo",
					br = node.innerHTML.replace("<br>", "<br>" + span + "<br>");

				node.innerHTML = br;
			},

			/**
			 * Put's little dot beside user to show if they're a player or no
			 */
			displayIsUsersPlayers: function(userElem) {
				Karmo.model.user.isUserAPlayer(userElem.innerText, function(player) {
					if(player) {
						var dot = document.createElement("a");
						dot.setAttribute("alt", "This redditor plays Karmo.");
						dot.classList.add("karmo-dot");
						userElem.parentNode.insertBefore(dot, userElem.nextSibling);

						dot.addEventListener("mouseover", function() {
							Karmo.view.user.displayDotInformationPopup(dot);
						});
					}
				});
			},

			displayDotInformationPopup: function(dot) {

			}
		},

		/**
		 * The main bet view. Moved to here instead of containing it all in an event
		 */
		bets: {
			init: function() {
				var content = document.querySelectorAll("div.content")[0];

				Karmo.template.render(content, "replace", "main-bet-view");
			}
		},

		/**
		 * The dashboard view
		 */
		dashboard: {
			init: function() {
			}
		},

		displayKarmoOnListView: function() {
			Karmo.view.loopOverPosts(function(post) {
				//Get betting information
				var data = Karmo.model.betting.getBettingDataOnPost();

				//display betting
				Karmo.view.betting.displayBetSmall(post, data);
			});
		},

		/**
		 * loopOverPosts - Run a function over posts currently displayed
		 * @param  {Function} fn Function to run. Post sent as param
		 */
		loopOverPosts: function(fn) {
			var things = document.querySelectorAll("#siteTable .thing");

			if(things) Array.prototype.forEach.call(things, fn);
		},

		modal: {

			create: function(width, height, template, data) {
				var modalLightbox = document.createElement("div");
				modal.classList.add("karmo-modal-lightbox");

				var modalWrapper = document.createElement("div");
				modal.classList.add("karmo-modal-wrapper");

				var modal = document.createElement("div");
				modal.classList.add("modal");

				modal.style.marginTop = (height/2) + "px";
				modal.style.marginLeft = (width/2) + "px";
				modal.style.width = (width) + "px";
				modal.style.height = (height) + "px";

				Karmo.template.render(modal, "append", template, data);
			}
		},

		notification: {
			won: function() {
				//For some unexplainable reason, having audio crashed the application!
				// Karmo.sound.play("chaching"); 
				Karmo.view.notification.create("Cha-ching!", "You just won 14000 karmo.", 5000, function() {
					alert();
				});
			},

			create: function(title, message, timeout, onclick) {
				Karmo.template.render(document.body, "prepend", "notification", {
					title: title,
					message: message
				});

				//Ugh seriously hacky event binding
				//Waiting for next DOM refresh
				if(onclick) setTimeout(function() {
					var e = document.getElementById("karmo-notification");

					e.style.opacity = 1;
					e.style.webkitTransform = "translate(0,0)";

					e.addEventListener("click", function() {
						remove();
						onclick();
					});
				}, 50);

				setTimeout(remove, timeout);

				function remove() {
					var a = document.getElementById("karmo-notification");

					if(a) {
						a.style.opacity = 0;
						a.style.webkitTransform = "translate(0, -30px)";
						setTimeout(function() {
							a.parentNode.removeChild(a);
						}, 100);
					}
				}
			}
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
			Karmo.model.user.getUser(function(user) {
				//Always display the small karmo
				Karmo.view.user.displayKarmoSmall(user);
			});

			Array.prototype.forEach.call(document.querySelectorAll(".author"), function(username) {
				//Display username information
				Karmo.view.user.displayIsUsersPlayers(username);
			});
		},

		/**
		 * /me/karmo
		 *
		 * The karmo homepage
		 */
		"/me/karmo": function() {
			Karmo.log("Main Page!");
			//Change the title
			document.querySelectorAll(".pagename")[0].innerText = "Karmo";

			//Render the page
			var content = document.querySelectorAll("div.content")[0];

			content.innerHTML = "";
			Karmo.template.render(content, "append", "dashboard");
		},

		/**
		 * Sub reddit matching route
		 * /r/*(/new|controversial|top|rising)
		 */
		"\\/r\\/\\w+(?:\/(top|controversial|rising|new)|(?!comments))?": function(route) {
			Karmo.log("Sub reddit route matched.");

			//Display the betting information
			Karmo.view.displayKarmoOnListView();

			//Add a list to the menu
			var item = document.createElement("li"), a = document.createElement("a");
			a.setAttribute("href", "#bets");
			a.innerText = "bets";
			item.appendChild(a);
			document.querySelectorAll(".tabmenu")[0].appendChild(item);

			a.addEventListener("click", function() {
				//Show current bets
				var selected = document.querySelectorAll(".tabmenu .selected")[0];
				selected.classList.remove("selected");

				item.classList.add("selected");

				//Initilize the bets view
				Karmo.view.bets.init();
			});
		},

		/**
		 * User View
		 * /user/*
		 */
		
		"\\/user\\/([^\\/]+)": function() {
			Karmo.log("User view matched");

			Karmo.model.user.getUser(function(user) {
				//Always display the small karmo
				Karmo.view.user.displayKarmoLarge(user);

			});
		}
	},

	init: function() {
		Karmo.log("Route: ", window.location.pathname);

		//Get the templates
		Karmo.template.getTemplates(function() {

			//Route the bitch
			for(var regex in Karmo.routes) {
				var test = (new RegExp(regex)).exec(window.location.pathname);

				//Call the route in the context of Karmo with the match object
				if(test) Karmo.routes[regex].call(Karmo, test);

			}

			//Initilize the sounds
			//Karmo.sound.init();
		});
	}
};

Karmo.init();
