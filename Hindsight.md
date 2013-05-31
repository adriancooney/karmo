What did I take away from this. It's an exercise I do with all my projects.

Bad parts:
	* Don't split up each route on the server like that for a simple query modification. It's ludacris!
	* The single file client was a bad idea. It got big, fast.
	* The view on the client side was messy. You should have done a view.<name>.init (or some instance thing) for all views and not some helper functions.
	* Template management was poor.

Good parts:
	* Done extremely fast! Sweet jesus, you have fully functioning app with 16 hours!
	* Found a cool moment.js library. It's pretty sweet.
	* Familiarized myself more with Mustache. It's slightly limiting but that can be overcome.