import React, { useState, useEffect, useContext, FormEvent, ChangeEvent } from 'react';
import { getEvents, createEvent, getRSOs, getEventComments, addComment, updateComment, deleteComment } from '../services/api';
import { Event as CollegeEvent, EventType, RSO, CreateEventData, Comment, CreateCommentData } from '../types';
import { Card, Badge, Row, Col, ListGroup, Tabs, Tab, Alert, Button, Modal, Form } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import GoogleMapPicker from './GoogleMapPicker';

const EventsList: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [myRsos, setMyRSOs] = useState<RSO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showCommentsModal, setShowCommentsModal] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<CollegeEvent | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [commentFormData, setCommentFormData] = useState<CreateCommentData>({
    commentText: '',
    rating: undefined
  });
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  
  // Event creation form state
  const [formData, setFormData] = useState<CreateEventData>({
    name: '',
    category: '',
    description: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    locationName: '',
    address: '',
    longitude: 0,
    latitude: 0,
    email: user?.email || '',
    phoneNumber: '',
    eventType: 'public',
    universityId: user?.universityId,
    rsoId: undefined
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Debug current user
        console.log('Current user:', user);
        console.log('User type:', user?.userType);
        console.log('Can create events:', !!(user && (user.userType === 'admin' || user.userType === 'super_admin')));
        
        const [fetchedEvents, fetchedRSOs] = await Promise.all([
          getEvents(),
          getRSOs()
        ]);
        
        setEvents(fetchedEvents);
        // Only using myRSOs, not all RSOs
        
        // Filter RSOs where the user is an admin
        if (user && (user.userType === 'admin' || user.userType === 'super_admin')) {
          const adminRSOs = fetchedRSOs.filter(rso => 
            rso.isMember && rso.status === 'active'
          );
          setMyRSOs(adminRSOs);
          console.log('Admin RSOs:', adminRSOs);
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getEventTypeBadge = (eventType: EventType) => {
    let variant = 'secondary';
    
    switch (eventType) {
      case 'public':
        variant = 'success';
        break;
      case 'private':
        variant = 'info';
        break;
      case 'rso':
        variant = 'warning';
        break;
    }
    
    return <Badge bg={variant}>{eventType}</Badge>;
  };

  const formatDate = (dateStr: string, timeStr: string) => {
    return `${dateStr} at ${timeStr}`;
  };
  
  const openCommentsModal = async (event: CollegeEvent) => {
    setSelectedEvent(event);
    setShowCommentsModal(true);
    setLoadingComments(true);
    setError(null);
    
    try {
      const fetchedComments = await getEventComments(event.eventId);
      setComments(fetchedComments);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
      setError(err.response?.data?.message || 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
    
    // Reset comment form
    setCommentFormData({
      commentText: '',
      rating: undefined
    });
  };
  
  const handleCommentChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCommentFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRatingChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCommentFormData(prev => ({ ...prev, rating: value }));
  };
  
  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!selectedEvent) return;
    if (!commentFormData.commentText.trim()) {
      setError('Comment text is required');
      return;
    }
    
    setLoadingComments(true);
    setError(null);
    
    try {
      // If editing an existing comment
      if (editingCommentId) {
        const updatedComment = await updateComment(editingCommentId, commentFormData);
        setComments(prev => prev.map(comment => 
          comment.commentId === editingCommentId ? updatedComment : comment
        ));
        setEditingCommentId(null);
        setSuccess('Comment updated successfully');
      } else {
        // Adding a new comment
        const newComment = await addComment(selectedEvent.eventId, commentFormData);
        setComments(prev => [newComment, ...prev]);
        setSuccess('Comment added successfully');
      }
      
      // Reset form
      setCommentFormData({
        commentText: '',
        rating: undefined
      });
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit comment');
      console.error('Error with comment:', err);
    } finally {
      setLoadingComments(false);
    }
  };
  
  const handleEditComment = (comment: Comment) => {
    setCommentFormData({
      commentText: comment.commentText,
      rating: comment.rating
    });
    setEditingCommentId(comment.commentId);
  };
  
  const handleCancelEdit = () => {
    setCommentFormData({
      commentText: '',
      rating: undefined
    });
    setEditingCommentId(null);
  };
  
  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    setLoadingComments(true);
    setError(null);
    
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(comment => comment.commentId !== commentId));
      setSuccess('Comment deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete comment');
      console.error('Error deleting comment:', err);
    } finally {
      setLoadingComments(false);
    }
  };
  
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
  };
  
  const handleRSOChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      rsoId: value ? parseInt(value) : undefined 
    }));
  };
  
  const handleMapLocationSelected = (locationData: {
    latitude: number;
    longitude: number;
  }) => {
    setFormData(prev => ({
      ...prev,
      latitude: locationData.latitude,
      longitude: locationData.longitude
    }));
    
    console.log('Selected map location:', locationData);
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      setLoading(true);
      
      // Validate form
      if (!formData.name || !formData.category || !formData.eventDate || 
          !formData.startTime || !formData.endTime || !formData.locationName || 
          !formData.address || !formData.email || !formData.phoneNumber) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }
      
      // If it's an RSO event, make sure an RSO is selected
      if (formData.eventType === 'rso' && !formData.rsoId) {
        setError('Please select an RSO for this event');
        setLoading(false);
        return;
      }
      
      // Prepare data for submission (remove rsoId only for public events)
      const submitData = {...formData};
      if (submitData.eventType === 'public') {
        submitData.rsoId = undefined;
      }
      
      // For private and RSO events, ensure RSO is selected
      if ((submitData.eventType === 'private' || submitData.eventType === 'rso') && !submitData.rsoId) {
        setError('Please select an RSO for this event');
        setLoading(false);
        return;
      }
      
      // Submit the form
      const newEvent = await createEvent(submitData);
      
      // Add the new event to the list
      setEvents(prev => [...prev, newEvent]);
      setSuccess('Event created successfully');
      
      // Reset form and close modal after a delay
      setTimeout(() => {
        setShowCreateModal(false);
        setSuccess(null);
        
        // Reset form data
        setFormData({
          name: '',
          category: '',
          description: '',
          eventDate: '',
          startTime: '',
          endTime: '',
          locationName: '',
          address: '',
          longitude: 0,
          latitude: 0,
          email: user?.email || '',
          phoneNumber: '',
          eventType: 'public',
          universityId: user?.universityId,
          rsoId: undefined
        });
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create event');
      console.error('Error creating event:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Debug user permissions
  console.log('Checking permissions:', {
    user,
    userType: user?.userType,
    isAdmin: user?.userType === 'admin',
    isSuperAdmin: user?.userType === 'super_admin'
  });

  // Filter events by type
  const publicEvents = events.filter(event => event.eventType === 'public');
  const privateEvents = events.filter(event => event.eventType === 'private');
  const rsoEvents = events.filter(event => event.eventType === 'rso');

  const renderEventCard = (event: CollegeEvent) => (
    <Card key={event.eventId} className="mb-3">
      <Card.Body>
        <Card.Title>{event.name} {getEventTypeBadge(event.eventType)}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">
          {formatDate(event.eventDate, event.startTime)}
        </Card.Subtitle>
        <Card.Text>{event.description}</Card.Text>
        <ListGroup variant="flush">
          <ListGroup.Item><strong>Category:</strong> {event.category}</ListGroup.Item>
          <ListGroup.Item><strong>Time:</strong> {event.startTime} - {event.endTime}</ListGroup.Item>
          <ListGroup.Item><strong>Address:</strong> {event.location?.address || 'N/A'}</ListGroup.Item>
          <ListGroup.Item>
            <strong>Coordinates:</strong> {
              event.location?.latitude !== undefined && event.location?.longitude !== undefined
                ? `${event.location.latitude.toFixed(6)}, ${event.location.longitude.toFixed(6)}`
                : 'N/A'
            }
          </ListGroup.Item>
          <ListGroup.Item><strong>Contact:</strong> {event.email}</ListGroup.Item>
          {event.phoneNumber && (
            <ListGroup.Item><strong>Phone:</strong> {event.phoneNumber}</ListGroup.Item>
          )}
        </ListGroup>
        <div className="d-flex justify-content-between align-items-center mt-3">
          {!event.approved && (
            <Badge bg="danger">Pending Approval</Badge>
          )}
          <Button 
            variant="primary" 
            size="sm" 
            className="ms-auto"
            onClick={() => openCommentsModal(event)}
          >
            View Comments
          </Button>
        </div>
      </Card.Body>
    </Card>
  );

  // Create a variable for the content to display based on loading/error/empty state
  let content;
  
  if (loading) {
    content = <div className="text-center my-5">Loading events...</div>;
  } else if (error) {
    content = <Alert variant="danger">Error: {error}</Alert>;
  } else if (events.length === 0) {
    content = <Alert variant="info">No events available at the moment. Create one!</Alert>;
  } else {
    content = (
      <Tabs defaultActiveKey="public" className="mb-4">
        <Tab eventKey="public" title={`Public (${publicEvents.length})`}>
          <Row>
            {publicEvents.length === 0 ? (
              <Col><Alert variant="info">No public events available.</Alert></Col>
            ) : (
              publicEvents.map(event => (
                <Col md={6} lg={4} key={event.eventId} className="mb-3">
                  {renderEventCard(event)}
                </Col>
              ))
            )}
          </Row>
        </Tab>
        
        <Tab eventKey="private" title={`University (${privateEvents.length})`}>
          <Row>
            {privateEvents.length === 0 ? (
              <Col><Alert variant="info">No university events available.</Alert></Col>
            ) : (
              privateEvents.map(event => (
                <Col md={6} lg={4} key={event.eventId} className="mb-3">
                  {renderEventCard(event)}
                </Col>
              ))
            )}
          </Row>
        </Tab>
        
        <Tab eventKey="rso" title={`RSO (${rsoEvents.length})`}>
          <Row>
            {rsoEvents.length === 0 ? (
              <Col><Alert variant="info">No RSO events available or you are not a member of any RSOs.</Alert></Col>
            ) : (
              rsoEvents.map(event => (
                <Col md={6} lg={4} key={event.eventId} className="mb-3">
                  {renderEventCard(event)}
                </Col>
              ))
            )}
          </Row>
        </Tab>
      </Tabs>
    );
  }

  return (
    <div className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Events</h2>
        {user && (user.userType === 'admin' || user.userType === 'super_admin') && (
          <Button variant="success" onClick={() => setShowCreateModal(true)}>
            Create New Event
          </Button>
        )}
      </div>
      
      {success && <Alert variant="success">{success}</Alert>}
      
      {content}
      
      {/* Comments Modal */}
      <Modal show={showCommentsModal} onHide={() => setShowCommentsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedEvent ? selectedEvent.name : ''} - Comments
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          {/* Comment Form */}
          {user && (
            <Form onSubmit={handleCommentSubmit} className="mb-4">
              <Form.Group className="mb-3">
                <Form.Label>{editingCommentId ? 'Edit Comment' : 'Leave a Comment'}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="commentText"
                  value={commentFormData.commentText}
                  onChange={handleCommentChange}
                  placeholder="Share your thoughts about this event..."
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Rating (Optional)</Form.Label>
                <div className="d-flex align-items-center">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <Form.Check
                      key={rating}
                      type="radio"
                      id={`rating-${rating}`}
                      name="rating"
                      value={rating}
                      label={rating}
                      checked={commentFormData.rating === rating}
                      onChange={handleRatingChange}
                      className="me-3"
                      inline
                    />
                  ))}
                </div>
              </Form.Group>
              
              <div className="d-flex">
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={loadingComments}
                  className="me-2"
                >
                  {loadingComments ? 'Submitting...' : editingCommentId ? 'Update Comment' : 'Submit Comment'}
                </Button>
                
                {editingCommentId && (
                  <Button 
                    variant="secondary" 
                    onClick={handleCancelEdit}
                    disabled={loadingComments}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </Form>
          )}
          
          <hr />
          
          {/* Comments List */}
          <h5>Comments ({comments.length})</h5>
          {loadingComments && comments.length === 0 ? (
            <div className="text-center my-4">Loading comments...</div>
          ) : comments.length === 0 ? (
            <Alert variant="info">No comments yet. Be the first to comment!</Alert>
          ) : (
            <div className="comment-list">
              {comments.map(comment => (
                <Card key={comment.commentId} className="mb-3">
                  <Card.Body>
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6>{comment.firstName} {comment.lastName}</h6>
                        {comment.rating && (
                          <div className="mb-2">
                            Rating: {comment.rating}/5
                          </div>
                        )}
                      </div>
                      {user && user.userId === comment.userId && (
                        <div>
                          <Badge bg="secondary" className="me-2">Your Comment</Badge>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="me-1"
                            onClick={() => handleEditComment(comment)}
                            disabled={editingCommentId !== null}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleDeleteComment(comment.commentId)}
                            disabled={loadingComments}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                    <Card.Text>{comment.commentText}</Card.Text>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>
      
      {/* Create Event Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Event Name*</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter event name"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category*</Form.Label>
                  <Form.Control
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g., Academic, Social, Sports"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Event description"
              />
            </Form.Group>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Date*</Form.Label>
                  <Form.Control
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time*</Form.Label>
                  <Form.Control
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>End Time*</Form.Label>
                  <Form.Control
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <h5 className="mt-4">Location Details</h5>
            
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Location Name*</Form.Label>
                  <Form.Control
                    type="text"
                    name="locationName"
                    value={formData.locationName}
                    onChange={handleChange}
                    placeholder="e.g., Student Union"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Address*</Form.Label>
                  <Form.Control
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter the full address for the event"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-4">
              <Form.Label>Map Coordinates</Form.Label>
              <GoogleMapPicker 
                onLocationSelected={handleMapLocationSelected}
                initialLatitude={formData.latitude}
                initialLongitude={formData.longitude}
              />
              <Form.Text className="text-muted">
                Click the button above to search for a location and set the coordinates
              </Form.Text>
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Latitude</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.000001"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleNumberChange}
                    placeholder="e.g., 28.602671"
                    readOnly
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Longitude</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.000001"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleNumberChange}
                    placeholder="e.g., -81.200254"
                    readOnly
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <h5 className="mt-4">Contact Information</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email*</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Contact email"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone Number*</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Contact phone"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <h5 className="mt-4">Event Type</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Event Type*</Form.Label>
                  <Form.Select
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    required
                  >
                    <option value="public">Public</option>
                    <option value="private">Private (University Only)</option>
                    <option value="rso">RSO</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              {(formData.eventType === 'rso' || formData.eventType === 'private') && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Select RSO*</Form.Label>
                    <Form.Select
                      name="rsoId"
                      value={formData.rsoId || ''}
                      onChange={handleRSOChange}
                      required={formData.eventType === 'rso' || formData.eventType === 'private'}
                    >
                      <option value="">Select an RSO</option>
                      {myRsos.map(rso => (
                        <option key={rso.rsoId} value={rso.rsoId}>
                          {rso.name}
                        </option>
                      ))}
                    </Form.Select>
                    {myRsos.length === 0 && (
                      <Form.Text className="text-danger">
                        You don't have any active RSOs. Please create or join an RSO first.
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
              )}
            </Row>
            
            <div className="d-flex justify-content-end mt-4">
              <Button variant="secondary" className="me-2" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default EventsList;