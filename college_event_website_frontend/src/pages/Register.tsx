import React, { useState, useEffect, ChangeEvent, useContext } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { getUniversities } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { RegisterFormData, University, UserType } from '../types';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    universityId: undefined,
    userType: 'student'
  });

  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const data = await getUniversities();
        console.log('Universities from server:', data);
        setUniversities(data);
      } catch (err) {
        console.error('Failed to fetch universities:', err);
      }
    };

    fetchUniversities();
  }, []);

  const handleChange = (e: ChangeEvent<any>) => {
    const { name, value } = e.target;
    
    if (name === 'universityId') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value && value !== '' ? parseInt(value, 10) || undefined : undefined
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = (): boolean => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    // Students and admins need a university
    if ((formData.userType === 'student' || formData.userType === 'admin') && !formData.universityId) {
      setError('Please select a university');
      return false;
    }

    return true;
  };

  const { register } = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const user = await register(formData);
      console.log('Registration successful, redirecting based on user role');
      
      // Redirect based on user role
      if (user.userType === 'super_admin') {
        navigate('/admin');
      } else {
        // Admin and students go to events page
        navigate('/events');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = () => {
    if (!formData.email || !formData.universityId) return true;
    
    const selectedUniversity = universities.find(u => u.universityId === formData.universityId);
    if (!selectedUniversity) return true;
    
    const emailDomain = formData.email.split('@')[1];
    return !emailDomain || emailDomain === selectedUniversity.emailDomain;
  };

  return (
    <Container className="mt-5 mb-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold">Create an Account</h2>
                <p className="text-muted">Join the college events platform</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="Enter your first name"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Enter your last name"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    isInvalid={!isEmailValid()}
                  />
                  {!isEmailValid() && (
                    <Form.Text className="text-danger">
                      Email domain must match the selected university
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Account Type</Form.Label>
                  <Form.Select
                    name="userType"
                    value={formData.userType}
                    onChange={handleChange as any}
                    required
                  >
                    <option key="student-option" value="student">Student</option>
                    <option key="admin-option" value="admin">Admin</option>
                    <option key="super-admin-option" value="super_admin">Super Admin</option>
                  </Form.Select>
                </Form.Group>

                {(formData.userType === 'student' || formData.userType === 'admin') && (
                  <Form.Group className="mb-3">
                    <Form.Label>University</Form.Label>
                    <Form.Select
                      name="universityId"
                      value={formData.universityId || ''}
                      onChange={handleChange as any}
                      required={true}
                    >
                      <option key="select-university" value="">Select your university</option>
                      {universities.map(uni => (
                          <option 
                            key={`uni-${uni.universityId}`} 
                            value={String(uni.universityId)}
                          >
                            {uni.name}
                          </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      {formData.universityId && (() => {
                        const selectedUniversity = universities.find(u => 
                          u.universityId === formData.universityId
                        );
                        if (selectedUniversity?.emailDomain) {
                          return <span>Must use a {selectedUniversity.emailDomain} email address</span>;
                        }
                        return null;
                      })()}
                    </Form.Text>
                  </Form.Group>
                )}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create a password"
                        required
                      />
                      <Form.Text className="text-muted">
                        Must be at least 6 characters long
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Confirm Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm your password"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 py-2 mt-3"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </Form>

              <div className="text-center mt-4">
                <p>
                  Already have an account?{' '}
                  <Link to="/login" className="text-decoration-none">
                    Login
                  </Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;