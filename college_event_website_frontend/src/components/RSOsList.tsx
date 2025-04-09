import React, { useState, useEffect, useContext, FormEvent, ChangeEvent } from 'react';
import { getRSOs, createRSO, joinRSO, leaveRSO, CreateRSOData } from '../services/api';
import { RSO } from '../types';
import { Card, Button, Row, Col, Badge, Alert, Modal, Form, Tabs, Tab } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';

const RSOsList: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [rsos, setRSOs] = useState<RSO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('joined');
  
  // New RSO form state
  const [formData, setFormData] = useState<CreateRSOData>({
    name: '',
    description: ''
  });

  useEffect(() => {
    const fetchRSOs = async () => {
      try {
        setLoading(true);
        const fetchedRSOs = await getRSOs();
        setRSOs(fetchedRSOs);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load RSOs');
        console.error('Error fetching RSOs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRSOs();
  }, []);

  const handleJoinRSO = async (rsoId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedRSO = await joinRSO(rsoId);
      
      // Update the specific RSO in the list
      setRSOs(prev => prev.map(rso => 
        rso.rsoId === updatedRSO.rsoId ? updatedRSO : rso
      ));
      
      setSuccess('Successfully joined RSO');
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join RSO');
      console.error('Error joining RSO:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRSO = async (rsoId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedRSO = await leaveRSO(rsoId);
      
      // Update the specific RSO in the list
      setRSOs(prev => prev.map(rso => 
        rso.rsoId === updatedRSO.rsoId ? updatedRSO : rso
      ));
      
      setSuccess('Successfully left RSO');
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to leave RSO');
      console.error('Error leaving RSO:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!formData.name) {
      setError('RSO name is required');
      return;
    }
    
    try {
      setLoading(true);
      const newRSO = await createRSO(formData);
      
      // Add the new RSO to the list
      setRSOs(prev => [...prev, newRSO]);
      setSuccess('RSO created successfully');
      
      // Reset form and close modal after short delay
      setTimeout(() => {
        setFormData({ name: '', description: '' });
        setShowModal(false);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create RSO');
      console.error('Error creating RSO:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const canCreateRSO = user?.userType === 'admin' || user?.userType === 'super_admin';

  if (loading) {
    return <div className="text-center my-5">Loading RSOs...</div>;
  }

  if (error) {
    return <Alert variant="danger">Error: {error}</Alert>;
  }

  if (rsos.length === 0) {
    return <Alert variant="info">No RSOs available at your university.</Alert>;
  }

  // Filter RSOs by membership
  const joinedRSOs = rsos.filter(rso => rso.isMember);
  const availableRSOs = rsos.filter(rso => !rso.isMember);
  
  // Render RSO cards
  const renderRSOCards = (rsoList: RSO[]) => {
    if (rsoList.length === 0) {
      return <Alert variant="info">No RSOs found in this category.</Alert>;
    }
    
    return (
      <Row>
        {rsoList.map(rso => (
          <Col key={rso.rsoId} md={6} lg={4} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title className="d-flex justify-content-between align-items-center">
                  {rso.name}
                  <div>
                    {rso.isMember && <Badge bg="success" className="me-2">Member</Badge>}
                    {rso.status === 'active' ? (
                      <Badge bg="success">Active</Badge>
                    ) : (
                      <Badge bg="warning">Inactive</Badge>
                    )}
                  </div>
                </Card.Title>
                <Card.Text>{rso.description}</Card.Text>
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    {rso.memberCount || 0} Members
                  </small>
                  {rso.isMember ? (
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleLeaveRSO(rso.rsoId)}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Leave'}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => handleJoinRSO(rso.rsoId)}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Join'}
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <div className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Registered Student Organizations</h2>
        {canCreateRSO && (
          <Button variant="success" onClick={() => setShowModal(true)}>
            Create New RSO
          </Button>
        )}
      </div>
      
      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || 'joined')}
        className="mb-4"
      >
        <Tab 
          eventKey="joined" 
          title={`My RSOs (${joinedRSOs.length})`}
        >
          {renderRSOCards(joinedRSOs)}
        </Tab>
        <Tab 
          eventKey="available" 
          title={`Available RSOs (${availableRSOs.length})`}
        >
          {renderRSOCards(availableRSOs)}
        </Tab>
      </Tabs>
      
      {/* Create RSO Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New RSO</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>RSO Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter RSO name"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the purpose of this RSO"
              />
            </Form.Group>
            
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create RSO'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default RSOsList;