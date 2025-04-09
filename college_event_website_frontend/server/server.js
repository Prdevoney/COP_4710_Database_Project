const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
const authenticateUser = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, universityId, userType } = req.body;
    
    // Check if email is already registered
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Check if university exists when provided
    if (universityId) {
      const uniCheck = await db.query('SELECT * FROM universities WHERE university_id = $1', [universityId]);
      if (uniCheck.rows.length === 0) {
        return res.status(400).json({ message: 'University not found' });
      }
      
      // Verify email domain matches university domain
      const emailDomain = email.split('@')[1];
      if (uniCheck.rows[0].email_domain !== emailDomain) {
        return res.status(400).json({ 
          message: 'Email domain does not match university domain' 
        });
      }
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert new user
    const newUser = await db.query(
      'INSERT INTO users (email, password, first_name, last_name, university_id, user_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, email, first_name, last_name, user_type',
      [email, hashedPassword, firstName, lastName, universityId, userType]
    );
    
    // Set session
    req.session.user = {
      userId: newUser.rows[0].user_id,
      email: newUser.rows[0].email,
      firstName: newUser.rows[0].first_name,
      lastName: newUser.rows[0].last_name,
      userType: newUser.rows[0].user_type
    };
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: req.session.user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Set session
    req.session.user = {
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
      universityId: user.university_id
    };
    
    res.json({ 
      message: 'Login successful',
      user: req.session.user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ isAuthenticated: true, user: req.session.user });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

app.get('/api/universities', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM universities ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching universities:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create university (super_admin only)
app.post('/api/universities', authenticateUser, async (req, res) => {
  try {
    // Verify user is super_admin
    if (req.session.user.userType !== 'super_admin') {
      return res.status(403).json({ message: 'Unauthorized. Super Admin access required' });
    }

    const { name, location, description, emailDomain } = req.body;
    
    // Validate input
    if (!name || !location || !emailDomain) {
      return res.status(400).json({ message: 'Name, location, and email domain are required' });
    }
    
    // Check if university with same name or email domain already exists
    const checkUniversity = await db.query(
      'SELECT * FROM universities WHERE name = $1 OR email_domain = $2',
      [name, emailDomain]
    );
    
    if (checkUniversity.rows.length > 0) {
      return res.status(400).json({ 
        message: 'A university with this name or email domain already exists' 
      });
    }
    
    // Create university
    const newUniversity = await db.query(
      'INSERT INTO universities (name, location, description, email_domain) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, location, description, emailDomain]
    );
    
    res.status(201).json({
      message: 'University created successfully',
      university: newUniversity.rows[0]
    });
  } catch (error) {
    console.error('Error creating university:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all events (filtered by event_type and user access)
app.get('/api/events', authenticateUser, async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const universityId = req.session.user.universityId;
    
    // Get public events with location data
    const publicEvents = await db.query(`
      SELECT 
        e.*, 
        l.name AS location_name, 
        l.address, 
        l.latitude, 
        l.longitude  
      FROM events e
      LEFT JOIN locations l ON e.location_id = l.location_id
      WHERE e.event_type = $1
    `, ['public']);
    
    // Get university-specific events if user is part of a university
    let universityEvents = [];
    if (universityId) {
      universityEvents = await db.query(`
        SELECT 
          e.*, 
          l.name AS location_name, 
          l.address, 
          l.latitude, 
          l.longitude 
        FROM events e
        LEFT JOIN locations l ON e.location_id = l.location_id
        WHERE e.event_type = $1 AND e.university_id = $2
      `, ['private', universityId]);
    }
    
    // Get RSO events for RSOs the user is a member of
    const rsoEvents = await db.query(`
      SELECT 
        e.*, 
        l.name AS location_name, 
        l.address, 
        l.latitude, 
        l.longitude 
      FROM events e
      LEFT JOIN locations l ON e.location_id = l.location_id
      JOIN rso r ON e.rso_id = r.rso_id
      JOIN rso_members rm ON r.rso_id = rm.rso_id
      WHERE rm.user_id = $1 AND e.event_type = $2
    `, [userId, 'rso']);
    
    // Combine all events
    const events = [
      ...publicEvents.rows,
      ...universityEvents.rows,
      ...rsoEvents.rows
    ].map(row => {
      // Structure the location data properly
      let location = null;
      if (row.location_id) {
        location = {
          location_id: row.location_id,
          name: row.location_name,
          address: row.address,
          longitude: row.longitude,
          latitude: row.latitude
        };
      }
      
      // Create the event object with the proper fields
      return {
        ...row,
        location: location
      };
    });
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get RSOs at user's university
app.get('/api/rsos', authenticateUser, async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const universityId = req.session.user.universityId;
    
    if (!universityId) {
      return res.status(400).json({ message: 'User is not associated with a university' });
    }
    
    // Get all RSOs at the user's university with membership status
    const userRsos = await db.query(`
      SELECT r.*, 
             CASE WHEN rm.user_id IS NOT NULL THEN true ELSE false END AS is_member,
             (SELECT COUNT(*) FROM rso_members WHERE rso_id = r.rso_id) AS member_count
      FROM rso r
      LEFT JOIN rso_members rm ON r.rso_id = rm.rso_id AND rm.user_id = $1
      WHERE r.university_id = $2
    `, [userId, universityId]);
    
    res.json(userRsos.rows);
  } catch (error) {
    console.error('Error fetching RSOs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new RSO
app.post('/api/rsos', authenticateUser, async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const universityId = req.session.user.universityId;
    const { name, description } = req.body;
    
    // Validate input
    if (!universityId) {
      return res.status(400).json({ message: 'User is not associated with a university' });
    }
    
    if (!name) {
      return res.status(400).json({ message: 'RSO name is required' });
    }
    
    // Check if user is admin or super_admin
    if (req.session.user.userType !== 'admin' && req.session.user.userType !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can create RSOs' });
    }
    
    // Check if RSO with same name already exists at this university
    const rsoCheck = await db.query(
      'SELECT * FROM rso WHERE name = $1 AND university_id = $2',
      [name, universityId]
    );
    
    if (rsoCheck.rows.length > 0) {
      return res.status(400).json({ message: 'An RSO with this name already exists at your university' });
    }
    
    // Start a transaction
    await db.query('BEGIN');
    
    try {
      // Create the new RSO
      const newRso = await db.query(
        'INSERT INTO rso (name, description, admin_id, university_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, description, userId, universityId, 'inactive'] // Start as inactive until enough members
      );
      
      // Add creator as a member
      await db.query(
        'INSERT INTO rso_members (user_id, rso_id) VALUES ($1, $2)',
        [userId, newRso.rows[0].rso_id]
      );
      
      await db.query('COMMIT');
      
      // Get the updated RSO with member count
      const updatedRso = await db.query(`
        SELECT r.*, 
               (SELECT COUNT(*) FROM rso_members WHERE rso_id = r.rso_id) AS member_count,
               true AS is_member
        FROM rso r
        WHERE r.rso_id = $1
      `, [newRso.rows[0].rso_id]);
      
      res.status(201).json({
        message: 'RSO created successfully',
        rso: updatedRso.rows[0]
      });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error creating RSO:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join an RSO
app.post('/api/rsos/:rsoId/join', authenticateUser, async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const { rsoId } = req.params;
    
    // Check if user is already a member
    const memberCheck = await db.query(
      'SELECT * FROM rso_members WHERE user_id = $1 AND rso_id = $2',
      [userId, rsoId]
    );
    
    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ message: 'You are already a member of this RSO' });
    }
    
    // Check if RSO exists and is at the user's university
    const rsoCheck = await db.query(
      'SELECT * FROM rso WHERE rso_id = $1 AND university_id = $2',
      [rsoId, req.session.user.universityId]
    );
    
    if (rsoCheck.rows.length === 0) {
      return res.status(404).json({ message: 'RSO not found or not at your university' });
    }
    
    // Add user as a member
    await db.query(
      'INSERT INTO rso_members (user_id, rso_id) VALUES ($1, $2)',
      [userId, rsoId]
    );
    
    // Check member count for RSO activation (assuming 5 members needed)
    const memberCount = await db.query(
      'SELECT COUNT(*) as count FROM rso_members WHERE rso_id = $1',
      [rsoId]
    );
    
    const count = parseInt(memberCount.rows[0].count);
    
    // If we now have 5+ members, set RSO to active
    if (count >= 5 && rsoCheck.rows[0].status === 'inactive') {
      await db.query(
        'UPDATE rso SET status = $1 WHERE rso_id = $2',
        ['active', rsoId]
      );
    }
    
    // Get the updated RSO
    const updatedRso = await db.query(`
      SELECT r.*, 
             (SELECT COUNT(*) FROM rso_members WHERE rso_id = r.rso_id) AS member_count,
             true AS is_member
      FROM rso r
      WHERE r.rso_id = $1
    `, [rsoId]);
    
    res.json({
      message: 'Successfully joined RSO',
      rso: updatedRso.rows[0]
    });
  } catch (error) {
    console.error('Error joining RSO:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave an RSO
app.post('/api/rsos/:rsoId/leave', authenticateUser, async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const { rsoId } = req.params;
    
    // Check if user is a member
    const memberCheck = await db.query(
      'SELECT * FROM rso_members WHERE user_id = $1 AND rso_id = $2',
      [userId, rsoId]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(400).json({ message: 'You are not a member of this RSO' });
    }
    
    // Check if user is the admin of the RSO
    const rsoCheck = await db.query(
      'SELECT * FROM rso WHERE rso_id = $1 AND admin_id = $2',
      [rsoId, userId]
    );
    
    if (rsoCheck.rows.length > 0) {
      return res.status(400).json({ message: 'As the admin, you cannot leave the RSO' });
    }
    
    // Remove user from RSO
    await db.query(
      'DELETE FROM rso_members WHERE user_id = $1 AND rso_id = $2',
      [userId, rsoId]
    );
    
    // Check member count for RSO deactivation
    const memberCount = await db.query(
      'SELECT COUNT(*) as count FROM rso_members WHERE rso_id = $1',
      [rsoId]
    );
    
    const count = parseInt(memberCount.rows[0].count);
    
    // Get the RSO info
    const rsoInfo = await db.query(
      'SELECT * FROM rso WHERE rso_id = $1',
      [rsoId]
    );
    
    // If we now have less than 5 members, set RSO to inactive
    if (count < 5 && rsoInfo.rows[0].status === 'active') {
      await db.query(
        'UPDATE rso SET status = $1 WHERE rso_id = $2',
        ['inactive', rsoId]
      );
    }
    
    // Get the updated RSO
    const updatedRso = await db.query(`
      SELECT r.*, 
             (SELECT COUNT(*) FROM rso_members WHERE rso_id = r.rso_id) AS member_count,
             false AS is_member
      FROM rso r
      WHERE r.rso_id = $1
    `, [rsoId]);
    
    res.json({
      message: 'Successfully left RSO',
      rso: updatedRso.rows[0]
    });
  } catch (error) {
    console.error('Error leaving RSO:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments for an event
app.get('/api/events/:eventId/comments', authenticateUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get comments with user info
    const comments = await db.query(`
      SELECT c.*, u.first_name, u.last_name 
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.event_id = $1
      ORDER BY c.comment_id DESC
    `, [eventId]);
    
    res.json(comments.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a comment to an event
app.post('/api/events/:eventId/comments', authenticateUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.session.user.userId;
    const { commentText, rating } = req.body;
    
    // Validate input
    if (!commentText) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    // Check if rating is valid if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Check if event exists
    const eventCheck = await db.query('SELECT * FROM events WHERE event_id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Add the comment
    const newComment = await db.query(
      'INSERT INTO comments (event_id, user_id, comment_text, rating) VALUES ($1, $2, $3, $4) RETURNING *',
      [eventId, userId, commentText, rating]
    );
    
    // Get user info for the response
    const userInfo = await db.query(
      'SELECT first_name, last_name FROM users WHERE user_id = $1',
      [userId]
    );
    
    // Combine comment with user info
    const commentWithUser = {
      ...newComment.rows[0],
      first_name: userInfo.rows[0].first_name,
      last_name: userInfo.rows[0].last_name
    };
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment: commentWithUser
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a comment
app.put('/api/comments/:commentId', authenticateUser, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.session.user.userId;
    const { commentText, rating } = req.body;
    
    // Validate input
    if (!commentText) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    // Check if rating is valid if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Check if comment exists and belongs to the user
    const commentCheck = await db.query(
      'SELECT * FROM comments WHERE comment_id = $1',
      [commentId]
    );
    
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Verify the user owns the comment
    if (commentCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }
    
    // Update the comment
    const updatedComment = await db.query(
      'UPDATE comments SET comment_text = $1, rating = $2 WHERE comment_id = $3 RETURNING *',
      [commentText, rating, commentId]
    );
    
    // Get user info for the response
    const userInfo = await db.query(
      'SELECT first_name, last_name FROM users WHERE user_id = $1',
      [userId]
    );
    
    // Combine comment with user info
    const commentWithUser = {
      ...updatedComment.rows[0],
      first_name: userInfo.rows[0].first_name,
      last_name: userInfo.rows[0].last_name
    };
    
    res.json({
      message: 'Comment updated successfully',
      comment: commentWithUser
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment
app.delete('/api/comments/:commentId', authenticateUser, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.session.user.userId;
    const userType = req.session.user.userType;
    
    // Check if comment exists
    const commentCheck = await db.query(
      'SELECT c.*, e.created_by FROM comments c JOIN events e ON c.event_id = e.event_id WHERE c.comment_id = $1',
      [commentId]
    );
    
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    const comment = commentCheck.rows[0];
    
    // Verify the user owns the comment, is admin/super_admin, or is the event creator
    const isCommentOwner = comment.user_id === userId;
    const isAdmin = userType === 'admin' || userType === 'super_admin';
    const isEventCreator = comment.created_by === userId;
    
    if (!isCommentOwner && !isAdmin && !isEventCreator) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    
    // Delete the comment
    await db.query('DELETE FROM comments WHERE comment_id = $1', [commentId]);
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new event
app.post('/api/events', authenticateUser, async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const userType = req.session.user.userType;
    const universityId = req.session.user.universityId;
    
    const { 
      name, category, description, eventDate, startTime, endTime,
      locationName, address, longitude, latitude,
      email, phoneNumber, eventType, rsoId
    } = req.body;
    
    // Validate user permissions
    if (userType !== 'admin' && userType !== 'super_admin') {
      return res.status(403).json({ message: 'Only administrators can create events' });
    }
    
    // Validate input
    if (!name || !category || !eventDate || !startTime || !endTime ||
        !locationName || !address || !email || !phoneNumber || !eventType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate event type and required fields
    if (eventType === 'rso' && !rsoId) {
      return res.status(400).json({ message: 'RSO ID is required for RSO events' });
    }
    
    if ((eventType === 'public' || eventType === 'private') && !universityId) {
      return res.status(400).json({ message: 'University ID is required for public/private events' });
    }
    
    // If it's an RSO event, verify the user is an admin of the RSO
    if (eventType === 'rso') {
      const rsoCheck = await db.query(
        'SELECT * FROM rso WHERE rso_id = $1 AND admin_id = $2',
        [rsoId, userId]
      );
      
      if (rsoCheck.rows.length === 0) {
        return res.status(403).json({ message: 'You must be the admin of the RSO to create an event for it' });
      }
      
      // Check if RSO is active
      if (rsoCheck.rows[0].status !== 'active') {
        return res.status(400).json({ message: 'RSO must be active to create events' });
      }
    }
    
    // Start a transaction
    await db.query('BEGIN');
    
    try {
      // Create location first
      const newLocation = await db.query(
        'INSERT INTO locations (name, address, longitude, latitude) VALUES ($1, $2, $3, $4) RETURNING *',
        [locationName, address, longitude, latitude]
      );
      
      const locationId = newLocation.rows[0].location_id;
      
      // Determine if the event gets auto-approved
      let approved = false;
      
      // All private and RSO events and super_admin public events are auto-approved
      if (eventType === 'private' || eventType === 'rso' || (userType === 'super_admin' && eventType === 'public')) {
        approved = true;
      }
      
      // Create the event
      const eventParams = [
        name, category, description, eventDate, startTime, endTime,
        locationId, email, phoneNumber, userId, eventType, 
        universityId, // Always include university_id for all event types
        eventType === 'rso' || eventType === 'private' ? rsoId : null, // Include rsoId for RSO and private events
        approved
      ];
      
      const newEvent = await db.query(`
        INSERT INTO events (
          name, category, description, event_date, start_time, end_time,
          location_id, email, phone_number, created_by, event_type, 
          university_id, rso_id, approved
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
        RETURNING *
      `, eventParams);
      
      await db.query('COMMIT');
      
      // Return with location info included
      const eventWithLocation = {
        ...newEvent.rows[0],
        location: newLocation.rows[0]
      };
      
      res.status(201).json({
        message: approved 
          ? 'Event created successfully and is approved' 
          : 'Event created successfully and is pending approval',
        event: eventWithLocation
      });
    } catch (err) {
      await db.query('ROLLBACK');
      console.error('Transaction error when creating event:', err);
      res.status(500).json({ message: `Error creating event: ${err.message}` });
      return;
    }
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
});

// Approve an event (super_admin only)
app.put('/api/events/:eventId/approve', authenticateUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userType = req.session.user.userType;
    
    // Verify user is super_admin
    if (userType !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can approve events' });
    }
    
    // Check if event exists and is public
    const eventCheck = await db.query(
      'SELECT * FROM events WHERE event_id = $1 AND event_type = $2',
      [eventId, 'public']
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found or not a public event' });
    }
    
    // Update event to approved
    const updatedEvent = await db.query(
      'UPDATE events SET approved = TRUE WHERE event_id = $1 RETURNING *',
      [eventId]
    );
    
    // Get event's location for the response
    const locationQuery = await db.query(
      'SELECT * FROM locations WHERE location_id = $1',
      [updatedEvent.rows[0].location_id]
    );
    
    const location = locationQuery.rows[0];
    
    // Return updated event with location info
    const eventWithLocation = {
      ...updatedEvent.rows[0],
      location
    };
    
    res.json({
      message: 'Event approved successfully',
      event: eventWithLocation
    });
  } catch (error) {
    console.error('Error approving event:', error);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
});

// Get pending approval events (super_admin only)
app.get('/api/events/pending-approval', authenticateUser, async (req, res) => {
  try {
    const userType = req.session.user.userType;
    
    // Verify user is super_admin
    if (userType !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can view pending events' });
    }
    
    // Get public events that need approval
    const pendingEvents = await db.query(`
      SELECT 
        e.*, 
        l.name AS location_name, 
        l.address, 
        l.latitude, 
        l.longitude  
      FROM events e
      LEFT JOIN locations l ON e.location_id = l.location_id
      WHERE e.event_type = $1 AND e.approved = false
    `, ['public']);
    
    console.log('Server found pending events:', pendingEvents.rows.length);
    
    // Format events with location data
    const formattedEvents = pendingEvents.rows.map(row => {
      // Structure the location data properly
      let location = null;
      if (row.location_id) {
        location = {
          location_id: row.location_id,
          name: row.location_name,
          address: row.address,
          longitude: row.longitude,
          latitude: row.latitude
        };
      }
      
      // Return event with nested location data
      return {
        ...row,
        location
      };
    });
    
    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching pending events:', error);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});