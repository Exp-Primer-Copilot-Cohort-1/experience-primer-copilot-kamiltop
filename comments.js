// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');

// Create express app
const app = express();

// Use body parser
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create route to get comments
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

// Create route to create comments
app.post('/posts/:id/comments', (req, res) => {
    // Create random id
    const commentId = randomBytes(4).toString('hex');

    // Get comment content from request body
    const { content } = req.body;

    // Get comments for post
    const comments = commentsByPostId[req.params.id] || [];

    // Push new comment to comments array
    comments.push({ id: commentId, content, status: 'pending' });

    // Set comments for post
    commentsByPostId[req.params.id] = comments;

    // Emit event to event bus
    axios.post('http://localhost:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: req.params.id,
            status: 'pending'
        }
    });

    // Send response
    res.status(201).send(comments);
});

// Create route to receive events from event bus
app.post('/events', (req, res) => {
    // Get event type and data from request body
    const { type, data } = req.body;

    // If event type is CommentModerated
    if (type === 'CommentModerated') {
        // Get comment id, post id, status and content from data
        const { id, postId, status, content } = data;

        // Get comments for post
        const comments = commentsByPostId[postId];

        // Find comment with comment id
        const comment = comments.find(comment => {
            return comment.id === id;
        });

        // Set status for comment
        comment.status = status;

        // Emit event to event bus
        axios.post('http://localhost:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                postId,
                status