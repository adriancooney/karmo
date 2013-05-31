DROP TABLE bets;

CREATE TABLE bets(
 	id INT NOT NULL AUTO_INCREMENT,
 	username VARCHAR(24),
 	post_id VARCHAR(20),
 	karma INT,
 	type ENUM("karma", "comment-count"),
 	prediction INT,
 	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 	deadline TIMESTAMP,
 	active TINYINT DEFAULT 1,
 	won TINYINT DEFAULT 0,
 	odds VARCHAR(16),
 	PRIMARY KEY(id)
);