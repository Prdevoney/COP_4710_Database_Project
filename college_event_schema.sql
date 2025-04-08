CREATE TABLE universities (
    university_id SERIAL PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT, 
    email_domain VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    name VARCHAR (255) NOT NULL,
    address VARCHAR (255) NOT NULL,
    longitude FLOAT NOT NULL,
    latitude FLOAT NOT NULL,
    UNIQUE (longitude, latitude)
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    university_id INTEGER REFERENCES universities (university_id),
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('student', 'admin', 'super_admin'))
);

CREATE TABLE rso (
    rso_id SERIAL PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    description TEXT,
    admin_id INTEGER NOT NULL REFERENCES users (user_id),
    university_id INTEGER NOT NULL REFERENCES universities (university_id),
    status VARCHAR(50) DEFAULT 'inactive' NOT NULL CHECK (status IN ('active', 'inactive'))
); 

CREATE TABLE rso_members (
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    rso_id INTEGER NOT NULL REFERENCES rso (rso_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, rso_id)
);

CREATE TABLE events (
    event_id SERIAL PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location_id INTEGER NOT NULL REFERENCES locations (location_id),
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users (user_id),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('public', 'private', 'rso')),
    university_id INTEGER REFERENCES universities (university_id),
    rso_id INTEGER REFERENCES rso (rso_id),
    approved BOOLEAN DEFAULT FALSE,
    CONSTRAINT event_type_check CHECK (
        (event_type = 'public' AND university_id IS NOT NULL AND rso_id IS NULL) OR
        (event_type = 'private' AND university_id IS NOT NULL AND rso_id IS NOT NULL) OR
        (event_type = 'rso' AND university_id IS NOT NULL AND rso_id IS NOT NULL ) 
    )
);

CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY, 
    event_id INTEGER NOT NULL REFERENCES events (event_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users (user_id),
    comment_text TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);