import React, { useState, useEffect, useContext, FormEvent, ChangeEvent } from 'react';
import { Container, Row, Col, Tab, Tabs, Card, Form, Button, Alert, Badge, ListGroup } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import { getUniversities, createUniversity, getPendingEvents, approveEvent } from '../services/api';
import { University, Event as CollegeEvent } from '../types';
// All API functions are imported from services/api

const SuperAdminDashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [universities, setUniversities] = useState<University[]>([]);
  const [pendingEvents, setPendingEvents] = useState<CollegeEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // University form state
  const [universityForm, setUniversityForm] = useState({
    name: '',
    location: '',
    description: '',
    emailDomain: ''
  });
  
  useEffect(() => {
    // Only fetch data if user is authenticated and is a super_admin
    if (user && user.userType === 'super_admin') {
      fetchData();
    } else if (user && user.userType !== 'super_admin') {
      // If logged in but not super_admin, redirect after a short delay
      const timer = setTimeout(() => {
        window.location.href = '/events';
      }, 2000);
      return () => clearTimeout(timer);
    } else if (!user) {
      // If not logged in, redirect to login page after a short delay
      const timer = setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);
  
  const fetchData = async () => {
    // Don't try to fetch if the user isn't a super_admin
    if (!user || user.userType !== 'super_admin') {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch data with proper error handling
      try {
        // Fetch universities
        const fetchedUniversities = await getUniversities();
        setUniversities(fetchedUniversities);
      } catch (uniErr: any) {
        console.error('Failed to fetch universities:', uniErr);
        // Continue with other fetches
      }
      
      try {
        // Use the dedicated endpoint for pending events
        console.log('Fetching pending events...');
        const pendingEvents = await getPendingEvents();
        console.log('Pending events from dedicated endpoint:', pendingEvents);
        
        // Additional debugging for location data
        if (pendingEvents.length > 0) {
          console.log('First pending event location:', pendingEvents[0].location);
          console.log('Sample event card data:', {
            name: pendingEvents[0].name,
            date: pendingEvents[0].eventDate,
            location: pendingEvents[0].location?.name,
            category: pendingEvents[0].category
          });
        } else {
          console.log('No pending events found');
        }
        
        setPendingEvents(pendingEvents);
      } catch (eventErr: any) {
        console.error('Failed to fetch events:', eventErr);
        console.error('Error details:', eventErr.response?.data || eventErr.message);
        setError(`Failed to fetch pending events: ${eventErr.message}`);
      }
      
    } catch (err: any) {
      setError('Failed to load dashboard data. Please try refreshing the page.');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUniversityChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUniversityForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleUniversitySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      setLoading(true);
      
      // Validate form
      if (!universityForm.name || !universityForm.location || !universityForm.emailDomain) {
        setError('Name, location, and email domain are required');
        setLoading(false);
        return;
      }
      
      // Create university
      await createUniversity(universityForm);
      
      // Reset form
      setUniversityForm({
        name: '',
        location: '',
        description: '',
        emailDomain: ''
      });
      
      // Refresh universities
      const updatedUniversities = await getUniversities();
      setUniversities(updatedUniversities);
      
      setSuccess('University created successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create university');
      console.error('Error creating university:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleApproveEvent = async (eventId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Approving event with ID: ${eventId}`);
      
      // Approve event using the API function
      const updatedEvent = await approveEvent(eventId);
      console.log('Event approved successfully:', updatedEvent);
      
      // Update events list by removing the approved event
      setPendingEvents(prev => prev.filter(event => event.eventId !== eventId));
      
      setSuccess(`Event "${updatedEvent.name}" approved successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve event');
      console.error('Error approving event:', err);
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const renderUniversityCard = (university: University) => (
    <Card key={university.universityId} className="mb-3">
      <Card.Body>
        <Card.Title>{university.name}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">{university.location}</Card.Subtitle>
        <Card.Text>{university.description || 'No description provided'}</Card.Text>
        <ListGroup variant="flush">
          <ListGroup.Item><strong>Email Domain:</strong> {university.emailDomain}</ListGroup.Item>
        </ListGroup>
      </Card.Body>
    </Card>
  );
  
  const renderEventCard = (event: CollegeEvent) => (
    <Card key={event.eventId} className="mb-3">
      <Card.Body>
        <Card.Title>{event.name} <Badge bg="warning">Pending Approval</Badge></Card.Title>
        <Card.Subtitle className="mb-2 text-muted">{event.eventDate}</Card.Subtitle>
        <Card.Text>{event.description}</Card.Text>
        <ListGroup variant="flush">
          <ListGroup.Item><strong>Category:</strong> {event.category}</ListGroup.Item>
          <ListGroup.Item><strong>Time:</strong> {event.startTime} - {event.endTime}</ListGroup.Item>
          <ListGroup.Item><strong>Location:</strong> {event.location?.name || 'N/A'}</ListGroup.Item>
          <ListGroup.Item><strong>Address:</strong> {event.location?.address || 'N/A'}</ListGroup.Item>
          <ListGroup.Item><strong>Contact:</strong> {event.email}</ListGroup.Item>
        </ListGroup>
        <Button 
          variant="success" 
          className="mt-3" 
          onClick={() => handleApproveEvent(event.eventId)}
          disabled={loading}
        >
          Approve Event
        </Button>
      </Card.Body>
    </Card>
  );
  
  // Handle authentication and loading states
  if (!user) {
    return (
      <Container className="my-4">
        <Alert variant="info">
          Please log in to access this page. Redirecting to login...
        </Alert>
      </Container>
    );
  }
  
  if (user.userType !== 'super_admin') {
    return (
      <Container className="my-4">
        <Alert variant="danger">
          This page is only accessible to Super Administrators. Redirecting...
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container className="my-4">
      <h1>Super Admin Dashboard</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      {loading && !error && (
        <Alert variant="info">Loading dashboard data...</Alert>
      )}
      
      <Tabs defaultActiveKey="universities" className="mb-4">
        <Tab eventKey="universities" title="University Management">
          <Row className="mb-4">
            <Col md={6}>
              <Card>
                <Card.Body>
                  <Card.Title>Add New University</Card.Title>
                  <Form onSubmit={handleUniversitySubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>University Name*</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={universityForm.name}
                        onChange={handleUniversityChange}
                        placeholder="e.g., University of Central Florida"
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Location*</Form.Label>
                      <Form.Control
                        type="text"
                        name="location"
                        value={universityForm.location}
                        onChange={handleUniversityChange}
                        placeholder="e.g., Orlando, FL"
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="description"
                        value={universityForm.description}
                        onChange={handleUniversityChange}
                        placeholder="University description"
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Email Domain*</Form.Label>
                      <Form.Control
                        type="text"
                        name="emailDomain"
                        value={universityForm.emailDomain}
                        onChange={handleUniversityChange}
                        placeholder="e.g., ucf.edu"
                        required
                      />
                    </Form.Group>
                    
                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? 'Creating...' : 'Create University'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <h4>Existing Universities ({universities.length})</h4>
              {loading ? (
                <p>Loading universities...</p>
              ) : universities.length === 0 ? (
                <Alert variant="info">No universities found. Create one!</Alert>
              ) : (
                universities.map(renderUniversityCard)
              )}
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="eventApprovals" title={`Event Approvals (${pendingEvents.length})`}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4>Pending Public Events</h4>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={fetchData} 
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Events'}
            </Button>
          </div>
          
          {error && <Alert variant="danger">{error}</Alert>}
          
          {loading ? (
            <p>Loading events...</p>
          ) : pendingEvents.length === 0 ? (
            <Alert variant="info">No events pending approval</Alert>
          ) : (
            <Row>
              {pendingEvents.map(event => (
                <Col md={6} lg={4} key={event.eventId}>
                  {renderEventCard(event)}
                </Col>
              ))}
            </Row>
          )}
        </Tab>
      </Tabs>
    </Container>
  );
};

export default SuperAdminDashboard;