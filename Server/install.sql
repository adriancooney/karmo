DROP TABLE users;
DROP TABLE bets;

CREATE TABLE users(
 	id INT NOT NULL AUTO_INCREMENT,
 	reddit_id VARCHAR(8),
 	PRIMARY KEY(id)
);

CREATE TABLE bets(
 	id INT NOT NULL AUTO_INCREMENT,
 	user_id INT,
 	karma INT,
 	type ENUM("karma", "comment-count"),
 	prediction INT,
 	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 	deadline TIMESTAMP,
 	PRIMARY KEY(id)
);